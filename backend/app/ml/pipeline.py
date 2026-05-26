"""
ML Pipeline — orchestrates DemandForecaster, AnomalyDetector, ReorderAdvisor.

run_product_analysis(product_id, db, redis):
  1. Pull movement history from DB
  2. Run DemandForecaster → forecast
  3. Run AnomalyDetector  → anomaly flags
  4. Run ReorderAdvisor   → reorder recommendation
  5. Persist ml_forecasts + anomaly_logs rows
  6. Cache unified result in Redis for 1 hour
  7. Return unified dict
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.anomaly import AnomalyDetector
from app.ml.forecaster import DemandForecaster
from app.ml.reorder import InventorySnapshot, ProductSnapshot, ReorderAdvisor

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class MLPipeline:

    def __init__(self) -> None:
        self.forecaster = DemandForecaster()
        self.anomaly_detector = AnomalyDetector()
        self.reorder_advisor = ReorderAdvisor()

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def run_product_analysis(
        self,
        product_id: str,
        db: AsyncSession,
        redis_client,
    ) -> Dict[str, Any]:
        """
        Full ML analysis for one product.  Results cached in Redis for 1 h.
        """
        cache_key = f"ml:product:{product_id}"

        # --- Try cache first --------------------------------------------------
        cached = await self._cache_get(redis_client, cache_key)
        if cached is not None:
            logger.info("ML cache hit for product %s", product_id)
            return cached

        # --- Pull data from DB ------------------------------------------------
        history, movement_ids = await self._fetch_movement_history(db, product_id)
        product_row = await self._fetch_product(db, product_id)
        inventory_row = await self._fetch_inventory(db, product_id)

        if product_row is None:
            result = {"error": "product_not_found", "product_id": product_id}
            return result

        # --- Run models -------------------------------------------------------
        forecast_result = self.forecaster.forecast(
            product_id=product_id,
            history=history,
            horizon=30,
        )

        anomaly_result = self.anomaly_detector.detect(
            movements_history=history,
            product_id=product_id,
        )

        lead_time = int(product_row.get("lead_time_days") or 7)
        inv_snap = InventorySnapshot(
            quantity=int(inventory_row.get("quantity", 0)) if inventory_row else 0,
            reserved_qty=int(inventory_row.get("reserved_qty", 0)) if inventory_row else 0,
            lead_time_days=lead_time,
        )
        prod_snap = ProductSnapshot(
            product_id=product_id,
            unit_cost=float(product_row.get("unit_cost", 0.0)),
            reorder_point=int(product_row.get("reorder_point", 0)),
            reorder_qty=int(product_row.get("reorder_qty", 1)),
        )
        reorder_result = self.reorder_advisor.recommend(
            product=prod_snap,
            inventory_item=inv_snap,
            forecast=forecast_result.forecast,
        )

        # --- Persist to DB ----------------------------------------------------
        forecast_id = await self._save_forecast(db, forecast_result)
        await self._save_anomaly_logs(db, anomaly_result, movement_ids)
        await db.commit()

        # --- Build unified result dict ----------------------------------------
        result = {
            "product_id": product_id,
            "product_name": product_row.get("name", ""),
            "sku": product_row.get("sku", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "forecast": {
                "model_used": forecast_result.model_used,
                "horizon_days": forecast_result.horizon,
                "values": forecast_result.forecast,
                "confidence_lower": forecast_result.confidence_lower,
                "confidence_upper": forecast_result.confidence_upper,
                "model_selection_reason": forecast_result.model_selection_reason,
                "feature_importance": forecast_result.feature_importance,
            },
            "anomalies": {
                "total_points_analysed": anomaly_result.total_points,
                "anomaly_count": anomaly_result.anomaly_count,
                "anomaly_indices": [a.index for a in anomaly_result.anomalies],
                "anomaly_quantities": [a.quantity for a in anomaly_result.anomalies],
                "all_scores": anomaly_result.all_scores,
            },
            "reorder": {
                "current_stock": reorder_result.current_stock,
                "available_stock": reorder_result.available_stock,
                "reorder_point": reorder_result.reorder_point,
                "safety_stock": reorder_result.safety_stock,
                "recommended_qty": reorder_result.recommended_qty,
                "urgency_score": reorder_result.urgency_score,
                "urgency_label": reorder_result.urgency_label,
                "days_of_stock_remaining": reorder_result.days_of_stock_remaining,
                "avg_daily_demand": reorder_result.avg_daily_demand,
                "reasoning": reorder_result.reasoning,
            },
        }

        # --- Cache result ------------------------------------------------------
        await self._cache_set(redis_client, cache_key, result, CACHE_TTL_SECONDS)

        return result

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    async def _fetch_movement_history(
        self, db: AsyncSession, product_id: str
    ):
        """Return (quantities_list, movement_ids_list) ordered by created_at."""
        sql = text("""
            SELECT id, quantity
            FROM stock_movements
            WHERE product_id = :pid
            ORDER BY created_at ASC
        """)
        rows = (await db.execute(sql, {"pid": product_id})).fetchall()
        quantities = [float(r.quantity) for r in rows]
        ids = [str(r.id) for r in rows]
        return quantities, ids

    async def _fetch_product(
        self, db: AsyncSession, product_id: str
    ) -> Optional[Dict[str, Any]]:
        sql = text("""
            SELECT p.id, p.name, p.sku, p.unit_cost, p.reorder_point, p.reorder_qty,
                   s.lead_time_days
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplier_id
            WHERE p.id = :pid
            LIMIT 1
        """)
        row = (await db.execute(sql, {"pid": product_id})).fetchone()
        if row is None:
            return None
        return dict(row._mapping)

    async def _fetch_inventory(
        self, db: AsyncSession, product_id: str
    ) -> Optional[Dict[str, Any]]:
        sql = text("""
            SELECT quantity, reserved_qty
            FROM inventory_items
            WHERE product_id = :pid
            ORDER BY updated_at DESC
            LIMIT 1
        """)
        row = (await db.execute(sql, {"pid": product_id})).fetchone()
        return dict(row._mapping) if row else None

    async def _save_forecast(
        self, db: AsyncSession, result
    ) -> str:
        forecast_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=1)

        sql = text("""
            INSERT INTO ml_forecasts (
                id, product_id, model_used, forecast_horizon,
                forecast_data, confidence_lower, confidence_upper,
                generated_at, expires_at
            ) VALUES (
                :id, :product_id, :model_used, :horizon,
                :forecast_data, :lower, :upper,
                :generated_at, :expires_at
            )
            ON CONFLICT DO NOTHING
        """)
        await db.execute(sql, {
            "id": forecast_id,
            "product_id": result.product_id,
            "model_used": result.model_used,
            "horizon": result.horizon,
            "forecast_data": json.dumps(result.forecast),
            "lower": json.dumps(result.confidence_lower),
            "upper": json.dumps(result.confidence_upper),
            "generated_at": now,
            "expires_at": expires,
        })
        return forecast_id

    async def _save_anomaly_logs(
        self,
        db: AsyncSession,
        result,
        movement_ids: List[str],
    ) -> None:
        """Upsert anomaly log rows for anomalous points."""
        for anomaly in result.anomalies:
            movement_id = (
                movement_ids[anomaly.index]
                if anomaly.index < len(movement_ids)
                else None
            )
            if movement_id is None:
                continue
            sql = text("""
                INSERT INTO anomaly_logs (
                    id, product_id, movement_id, anomaly_score, is_anomaly, detected_at
                ) VALUES (
                    :id, :product_id, :movement_id, :score, :is_anomaly, :detected_at
                )
                ON CONFLICT DO NOTHING
            """)
            await db.execute(sql, {
                "id": str(uuid.uuid4()),
                "product_id": result.product_id,
                "movement_id": movement_id,
                "score": anomaly.anomaly_score,
                "is_anomaly": anomaly.is_anomaly,
                "detected_at": datetime.now(timezone.utc),
            })

    # ------------------------------------------------------------------
    # Redis helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _cache_get(redis_client, key: str) -> Optional[Dict]:
        try:
            raw = await redis_client.get(key)
            if raw:
                return json.loads(raw)
        except Exception as exc:
            logger.warning("Redis GET failed for %s: %s", key, exc)
        return None

    @staticmethod
    async def _cache_set(
        redis_client, key: str, value: Dict, ttl: int
    ) -> None:
        try:
            await redis_client.setex(key, ttl, json.dumps(value))
        except Exception as exc:
            logger.warning("Redis SET failed for %s: %s", key, exc)