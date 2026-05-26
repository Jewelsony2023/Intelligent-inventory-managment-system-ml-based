"""
Reorder Advisor — recommends reorder quantity and urgency score.

Formula references:
  Safety Stock  = Z * σ_demand * √lead_time
  Reorder Point = (avg_daily_demand * lead_time) + safety_stock
  EOQ           = √(2 * D * S / H)   (Economic Order Quantity, simplified)

Where:
  Z              = service-level z-score (default 1.65 → 95 %)
  σ_demand       = standard deviation of daily demand over forecast horizon
  lead_time      = supplier lead time in days
  D              = annual demand estimate
  S              = ordering cost (fixed, assumed $50)
  H              = holding cost per unit per year (assumed 20 % of unit cost)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional


# ---------------------------------------------------------------------------
# Data structures (minimal — mirrors DB shape)
# ---------------------------------------------------------------------------

@dataclass
class ProductSnapshot:
    product_id: str
    unit_cost: float
    reorder_point: int
    reorder_qty: int


@dataclass
class InventorySnapshot:
    quantity: int
    reserved_qty: int
    lead_time_days: int  # from supplier


@dataclass
class ReorderRecommendation:
    product_id: str
    current_stock: int
    available_stock: int          # quantity - reserved_qty
    reorder_point: int
    safety_stock: int
    recommended_qty: int
    urgency_score: float          # 0.0 (fine) – 1.0 (critical)
    urgency_label: str            # "critical" | "high" | "medium" | "low" | "ok"
    days_of_stock_remaining: float
    avg_daily_demand: float
    reasoning: str


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class ReorderAdvisor:
    """
    Compute reorder recommendations from inventory state + demand forecast.
    """

    SERVICE_LEVEL_Z = 1.65   # 95 % service level
    ORDERING_COST = 50.0     # $ per order
    HOLDING_COST_PCT = 0.20  # 20 % of unit cost per year

    def recommend(
        self,
        product: ProductSnapshot,
        inventory_item: InventorySnapshot,
        forecast: List[float],
    ) -> ReorderRecommendation:
        """
        Args:
            product:        Static product attributes.
            inventory_item: Current inventory state including lead_time_days.
            forecast:       Predicted daily demand for next N days (from DemandForecaster).

        Returns:
            ReorderRecommendation with recommended_qty and urgency_score.
        """
        lead_time = max(inventory_item.lead_time_days, 1)
        available = max(inventory_item.quantity - inventory_item.reserved_qty, 0)

        # --- Demand statistics from forecast ----------------------------------
        if len(forecast) == 0:
            avg_daily = 0.0
            std_daily = 0.0
        else:
            import numpy as np
            fc = np.array(forecast, dtype=float)
            avg_daily = float(np.mean(fc))
            std_daily = float(np.std(fc))

        # --- Safety stock (SS) ------------------------------------------------
        # SS = Z * σ * √(lead_time)
        safety_stock = int(math.ceil(
            self.SERVICE_LEVEL_Z * std_daily * math.sqrt(lead_time)
        ))
        safety_stock = max(safety_stock, 1)

        # --- Days of stock remaining ------------------------------------------
        if avg_daily > 0:
            days_remaining = available / avg_daily
        else:
            days_remaining = float("inf")

        # --- EOQ (Economic Order Quantity) ------------------------------------
        annual_demand = avg_daily * 365
        holding_cost = max(product.unit_cost * self.HOLDING_COST_PCT, 0.01)
        if annual_demand > 0:
            eoq = math.sqrt(
                2 * annual_demand * self.ORDERING_COST / holding_cost
            )
        else:
            eoq = float(product.reorder_qty)

        recommended_qty = max(int(math.ceil(eoq)), product.reorder_qty)

        # --- Urgency score (0–1) ----------------------------------------------
        urgency_score = self._compute_urgency(
            available=available,
            reorder_point=product.reorder_point,
            safety_stock=safety_stock,
            days_remaining=days_remaining,
            lead_time=lead_time,
        )

        urgency_label = self._urgency_label(urgency_score)

        reasoning = self._build_reasoning(
            available=available,
            reorder_point=product.reorder_point,
            safety_stock=safety_stock,
            avg_daily=avg_daily,
            std_daily=std_daily,
            lead_time=lead_time,
            days_remaining=days_remaining,
            recommended_qty=recommended_qty,
            urgency_score=urgency_score,
        )

        return ReorderRecommendation(
            product_id=product.product_id,
            current_stock=inventory_item.quantity,
            available_stock=available,
            reorder_point=product.reorder_point,
            safety_stock=safety_stock,
            recommended_qty=recommended_qty,
            urgency_score=round(urgency_score, 4),
            urgency_label=urgency_label,
            days_of_stock_remaining=round(days_remaining, 1) if days_remaining != float("inf") else -1,
            avg_daily_demand=round(avg_daily, 2),
            reasoning=reasoning,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute_urgency(
        self,
        available: int,
        reorder_point: int,
        safety_stock: int,
        days_remaining: float,
        lead_time: int,
    ) -> float:
        """
        Blended urgency score from multiple risk signals.

        Components:
          1. Stock-vs-reorder-point ratio  (weight 0.40)
          2. Days remaining vs lead time   (weight 0.40)
          3. Safety stock breach           (weight 0.20)
        """
        # 1. Stock ratio: 0 when well-stocked, 1 when at or below reorder point
        if reorder_point > 0:
            stock_signal = max(0.0, 1.0 - (available / (reorder_point * 1.5)))
        else:
            stock_signal = 0.0
        stock_signal = min(stock_signal, 1.0)

        # 2. Days remaining vs lead time
        if days_remaining == float("inf"):
            time_signal = 0.0
        else:
            # 0 when days_remaining >> lead_time; 1 when days_remaining ≤ 0
            ratio = days_remaining / max(lead_time, 1)
            time_signal = max(0.0, 1.0 - ratio / 2.0)
            time_signal = min(time_signal, 1.0)

        # 3. Safety stock breach
        safety_signal = 1.0 if available < safety_stock else 0.0

        urgency = (
            0.40 * stock_signal
            + 0.40 * time_signal
            + 0.20 * safety_signal
        )
        return min(urgency, 1.0)

    @staticmethod
    def _urgency_label(score: float) -> str:
        if score >= 0.85:
            return "critical"
        if score >= 0.65:
            return "high"
        if score >= 0.45:
            return "medium"
        if score >= 0.25:
            return "low"
        return "ok"

    @staticmethod
    def _build_reasoning(
        available: int,
        reorder_point: int,
        safety_stock: int,
        avg_daily: float,
        std_daily: float,
        lead_time: int,
        days_remaining: float,
        recommended_qty: int,
        urgency_score: float,
    ) -> str:
        parts = []

        if avg_daily > 0:
            parts.append(
                f"Average daily demand: {avg_daily:.1f} units "
                f"(σ={std_daily:.1f})."
            )
        else:
            parts.append("No recent demand; forecast is zero.")

        parts.append(f"Supplier lead time: {lead_time} day(s).")

        if days_remaining == float("inf"):
            parts.append("Stock level is theoretically unlimited relative to demand.")
        else:
            parts.append(
                f"Available stock ({available}) covers ~{days_remaining:.1f} days at current demand."
            )

        if available <= reorder_point:
            parts.append(
                f"⚠️ Stock ({available}) is at or below reorder point ({reorder_point})."
            )

        if available < safety_stock:
            parts.append(
                f"⚠️ Stock is below safety stock level ({safety_stock} units required)."
            )

        parts.append(
            f"Recommended order: {recommended_qty} units "
            f"(EOQ-based, minimum {reorder_point})."
        )
        parts.append(f"Urgency score: {urgency_score:.2f}.")

        return " ".join(parts)