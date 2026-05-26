"""
seed_movements_history.py
=========================
Generates 90 days of synthetic daily stock-movement history for all 12
products so the ML models have sufficient data to train on.

Demand patterns by category:
  Electronics (ELEC-001..004) → seasonal weekly cycle
  Office Supplies (OFF-001..003) → steady / flat
  Packaging (PACK-001..003) → trending upward
  Safety Equipment (SAFE-001..002) → sporadic / intermittent

Run inside the backend container:
  docker exec -it phase1-backend-1 python seed_movements_history.py
"""

import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# DB connection — reuse DATABASE_URL from environment
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/inventory_iq",
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# Demand generators
# ---------------------------------------------------------------------------

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)


def seasonal_demand(n: int = 90, base: float = 10.0, amplitude: float = 6.0) -> np.ndarray:
    """Weekly sinusoidal pattern, mimicking Electronics sales cycles."""
    t = np.arange(n)
    seasonal = amplitude * np.sin(2 * np.pi * t / 7)
    noise = rng.normal(0, 1.5, n)
    series = base + seasonal + noise
    return np.maximum(series, 0).round().astype(int)


def steady_demand(n: int = 90, base: float = 8.0) -> np.ndarray:
    """Roughly flat demand with small random noise — Office Supplies."""
    noise = rng.normal(0, 2.0, n)
    series = base + noise
    return np.maximum(series, 0).round().astype(int)


def trending_demand(n: int = 90, start: float = 4.0, slope: float = 0.12) -> np.ndarray:
    """Linear upward trend — Packaging (growth product line)."""
    t = np.arange(n)
    trend = start + slope * t
    noise = rng.normal(0, 1.5, n)
    series = trend + noise
    return np.maximum(series, 0).round().astype(int)


def sporadic_demand(n: int = 90, mean: float = 5.0, zero_prob: float = 0.55) -> np.ndarray:
    """Intermittent demand — Safety Equipment (ordered infrequently)."""
    series = []
    for _ in range(n):
        if rng.random() < zero_prob:
            series.append(0)
        else:
            val = int(rng.exponential(mean))
            series.append(max(val, 1))
    return np.array(series, dtype=int)


# ---------------------------------------------------------------------------
# Pattern assignment per SKU
# ---------------------------------------------------------------------------

SKU_PATTERNS = {
    # Electronics — seasonal
    "ELEC-001": lambda: seasonal_demand(base=12, amplitude=7),
    "ELEC-002": lambda: seasonal_demand(base=8, amplitude=4),
    "ELEC-003": lambda: seasonal_demand(base=15, amplitude=9),
    "ELEC-004": lambda: seasonal_demand(base=6, amplitude=3),
    # Office — steady
    "OFF-001": lambda: steady_demand(base=10),
    "OFF-002": lambda: steady_demand(base=7),
    "OFF-003": lambda: steady_demand(base=5),
    # Packaging — trending up
    "PACK-001": lambda: trending_demand(start=5, slope=0.15),
    "PACK-002": lambda: trending_demand(start=8, slope=0.10),
    "PACK-003": lambda: trending_demand(start=3, slope=0.08),
    # Safety — sporadic
    "SAFE-001": lambda: sporadic_demand(mean=6, zero_prob=0.60),
    "SAFE-002": lambda: sporadic_demand(mean=4, zero_prob=0.65),
}

# A small fraction of movements will be artificially spiked to create
# anomalies for the AnomalyDetector to find.
ANOMALY_PROBABILITY = 0.05
ANOMALY_MULTIPLIER_RANGE = (4, 8)


def inject_anomalies(series: np.ndarray) -> np.ndarray:
    """Randomly spike ~5 % of non-zero entries to simulate anomalous shipments."""
    result = series.copy()
    for i in range(len(result)):
        if result[i] > 0 and rng.random() < ANOMALY_PROBABILITY:
            factor = rng.integers(*ANOMALY_MULTIPLIER_RANGE)
            result[i] = result[i] * int(factor)
    return result


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

async def seed(db: AsyncSession) -> None:
    # Fetch admin user id for created_by
    admin_row = (
        await db.execute(
            text("SELECT id FROM users WHERE email = 'admin@inventory-iq.com' LIMIT 1")
        )
    ).fetchone()
    if admin_row is None:
        raise RuntimeError("Admin user not found — run seed.py first.")
    admin_id = str(admin_row.id)

    # Fetch product id → sku mapping
    product_rows = (
        await db.execute(text("SELECT id, sku FROM products"))
    ).fetchall()
    products = {row.sku: str(row.id) for row in product_rows}

    today = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
    inserted = 0

    for sku, gen_fn in SKU_PATTERNS.items():
        product_id = products.get(sku)
        if product_id is None:
            print(f"  ⚠  SKU {sku} not found in DB — skipping")
            continue

        demand_series = gen_fn()
        demand_series = inject_anomalies(demand_series)

        for day_offset, quantity in enumerate(demand_series):
            if quantity == 0:
                continue  # skip zero-demand days (no movement recorded)

            movement_date = today - timedelta(days=(89 - day_offset))

            # Alternate IN / OUT to simulate realistic stock flow
            # Even day_offset → stock IN (replenishment), Odd → stock OUT (sale/use)
            movement_type = "IN" if day_offset % 2 == 0 else "OUT"

            await db.execute(
                text("""
                    INSERT INTO stock_movements
                        (id, product_id, movement_type, quantity, reference_no,
                         notes, created_by, created_at)
                    VALUES
                        (:id, :product_id, :movement_type, :quantity,
                         :reference_no, :notes, :created_by, :created_at)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": str(uuid.uuid4()),
                    "product_id": product_id,
                    "movement_type": movement_type,
                    "quantity": int(quantity),
                    "reference_no": f"HIST-{sku}-{day_offset:03d}",
                    "notes": f"Synthetic history — day {day_offset + 1}/90 ({sku})",
                    "created_by": admin_id,
                    "created_at": movement_date,
                },
            )
            inserted += 1

        print(f"  ✓  {sku}: {int(np.count_nonzero(demand_series))} movements inserted")

    await db.commit()
    print(f"\nDone — {inserted} synthetic stock movements inserted.")


async def main() -> None:
    print("Seeding 90-day movement history…\n")
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())