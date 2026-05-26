"""
ML Forecasting API endpoints.

GET  /api/v1/ml/forecast/{product_id}          → run or return cached forecast
GET  /api/v1/ml/anomalies                       → list recent anomaly flags
GET  /api/v1/ml/reorder-recommendations         → products with urgency > 0.5
POST /api/v1/ml/run-pipeline                    → admin-only, full pipeline for all products
GET  /api/v1/ml/forecast/{product_id}/explain   → SHAP-style model explanation

All endpoints require inventory:read permission.
run-pipeline additionally requires admin role.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db, get_redis
from app.core.rbac import require_permission
from app.ml.pipeline import MLPipeline

logger = logging.getLogger(__name__)

router = APIRouter()
pipeline = MLPipeline()


# ---------------------------------------------------------------------------
# GET /forecast/{product_id}
# ---------------------------------------------------------------------------

@router.get(
    "/forecast/{product_id}",
    summary="Get demand forecast for a product",
    response_model=Dict[str, Any],
)
async def get_forecast(
    product_id: str,
    horizon: int = Query(default=30, ge=1, le=365, description="Forecast horizon in days"),
    db: AsyncSession = Depends(get_db),
    redis_client=Depends(get_redis),
    _: None = Depends(require_permission("inventory:read")),
):
    """
    Returns a 30-day demand forecast (default) for the given product.
    Result is cached in Redis for 1 hour; pass ?horizon= to customise.
    """
    # Validate product exists
    row = await db.execute(
        text("SELECT id FROM products WHERE id = :pid LIMIT 1"),
        {"pid": product_id},
    )
    if row.fetchone() is None:
        raise HTTPException(status_code=404, detail="Product not found")

    result = await pipeline.run_product_analysis(product_id, db, redis_client)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # If a non-default horizon was requested, re-run the forecaster in-memory
    if horizon != 30:
        from app.ml.forecaster import DemandForecaster
        quantities, _ = await pipeline._fetch_movement_history(db, product_id)
        fc = DemandForecaster().forecast(product_id, quantities, horizon=horizon)
        lower, upper = DemandForecaster().confidence_interval(
            __import__("numpy").array(fc.forecast)
        )
        result["forecast"]["values"] = fc.forecast
        result["forecast"]["confidence_lower"] = lower.tolist()
        result["forecast"]["confidence_upper"] = upper.tolist()
        result["forecast"]["horizon_days"] = horizon

    return result


# ---------------------------------------------------------------------------
# GET /forecast/{product_id}/explain
# ---------------------------------------------------------------------------

@router.get(
    "/forecast/{product_id}/explain",
    summary="Explain model selection (SHAP-style)",
    response_model=Dict[str, Any],
)
async def explain_forecast(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    redis_client=Depends(get_redis),
    _: None = Depends(require_permission("inventory:read")),
):
    """
    Returns the feature importance breakdown explaining WHY the model was chosen.
    Mirrors SHAP attribution logic implemented in DemandForecaster._feature_importance().
    """
    result = await pipeline.run_product_analysis(product_id, db, redis_client)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    forecast_section = result.get("forecast", {})
    return {
        "product_id": product_id,
        "model_used": forecast_section.get("model_used"),
        "model_selection_reason": forecast_section.get("model_selection_reason"),
        "feature_importance": forecast_section.get("feature_importance", {}),
        "explanation": _build_human_explanation(forecast_section),
    }


# ---------------------------------------------------------------------------
# GET /anomalies
# ---------------------------------------------------------------------------

@router.get(
    "/anomalies",
    summary="List recent anomaly flags",
    response_model=List[Dict[str, Any]],
)
async def list_anomalies(
    limit: int = Query(default=50, ge=1, le=500),
    product_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_permission("inventory:read")),
):
    """
    Returns anomaly_logs rows, newest first.  Optionally filter by product_id.
    """
    base_sql = """
        SELECT
            al.id,
            al.product_id,
            p.name  AS product_name,
            p.sku   AS product_sku,
            al.movement_id,
            al.anomaly_score,
            al.is_anomaly,
            al.detected_at,
            sm.quantity   AS movement_quantity,
            sm.movement_type
        FROM anomaly_logs al
        LEFT JOIN products p ON p.id = al.product_id
        LEFT JOIN stock_movements sm ON sm.id = al.movement_id
        WHERE al.is_anomaly = true
    """
    params: Dict[str, Any] = {"limit": limit}

    if product_id:
        base_sql += " AND al.product_id = :pid"
        params["pid"] = product_id

    base_sql += " ORDER BY al.detected_at DESC LIMIT :limit"

    rows = (await db.execute(text(base_sql), params)).fetchall()
    return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------------------------
# GET /reorder-recommendations
# ---------------------------------------------------------------------------

@router.get(
    "/reorder-recommendations",
    summary="Products with urgency score > 0.5",
    response_model=List[Dict[str, Any]],
)
async def reorder_recommendations(
    urgency_threshold: float = Query(default=0.5, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    redis_client=Depends(get_redis),
    _: None = Depends(require_permission("inventory:read")),
):
    """
    Runs (or returns cached) analysis for all active products and
    returns those whose urgency_score exceeds the threshold.
    """
    # Fetch all active product IDs
    rows = (
        await db.execute(text("SELECT id FROM products WHERE is_active = true"))
    ).fetchall()
    product_ids = [str(r.id) for r in rows]

    recommendations = []
    for pid in product_ids:
        try:
            result = await pipeline.run_product_analysis(pid, db, redis_client)
            if "error" in result:
                continue
            reorder = result.get("reorder", {})
            score = reorder.get("urgency_score", 0.0)
            if score >= urgency_threshold:
                recommendations.append({
                    "product_id": pid,
                    "product_name": result.get("product_name", ""),
                    "sku": result.get("sku", ""),
                    **reorder,
                    "forecast_model": result.get("forecast", {}).get("model_used"),
                })
        except Exception as exc:
            logger.error("Pipeline failed for product %s: %s", pid, exc)

    # Sort by urgency score descending
    recommendations.sort(key=lambda x: x.get("urgency_score", 0), reverse=True)
    return recommendations


# ---------------------------------------------------------------------------
# POST /run-pipeline  (admin only)
# ---------------------------------------------------------------------------

@router.post(
    "/run-pipeline",
    summary="Trigger full ML pipeline for all products (admin only)",
    response_model=Dict[str, Any],
)
async def run_full_pipeline(
    db: AsyncSession = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user=Depends(require_permission("inventory:read")),
):
    """
    Admin-only endpoint.  Runs ML analysis for every active product,
    invalidates existing Redis cache, and returns a summary.
    """
    # Admin role check
    if not hasattr(current_user, "role") or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required to run the full pipeline.",
        )

    rows = (
        await db.execute(text("SELECT id, name FROM products WHERE is_active = true"))
    ).fetchall()

    success_ids = []
    failed_ids = []

    for row in rows:
        pid = str(row.id)
        # Invalidate cache first so we get fresh results
        try:
            await redis_client.delete(f"ml:product:{pid}")
        except Exception:
            pass

        try:
            await pipeline.run_product_analysis(pid, db, redis_client)
            success_ids.append(pid)
        except Exception as exc:
            logger.error("Pipeline error for %s: %s", pid, exc)
            failed_ids.append({"product_id": pid, "error": str(exc)})

    return {
        "status": "completed",
        "products_processed": len(success_ids),
        "products_failed": len(failed_ids),
        "success_ids": success_ids,
        "failures": failed_ids,
    }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _build_human_explanation(forecast_section: Dict[str, Any]) -> str:
    """Turn feature_importance dict into a readable sentence."""
    fi = forecast_section.get("feature_importance", {})
    if not fi:
        return "No explanation available."

    model = fi.get("selected_model", "unknown")
    reason = forecast_section.get("model_selection_reason", "")

    parts = [f"Model selected: {model}."]
    if reason:
        parts.append(reason)

    sparsity = fi.get("sparsity_ratio", 0)
    if sparsity > 0.3:
        parts.append(
            f"High sparsity detected ({sparsity:.0%} zero-demand days) — "
            "influenced selection toward Croston."
        )

    trend = fi.get("trend_strength", 0)
    if trend > 0.3:
        parts.append(
            f"Strong trend signal (r={trend:.2f}) — "
            "influenced selection toward Holt-Winters."
        )

    ac = fi.get("autocorrelation", 0)
    if ac > 0.3:
        parts.append(
            f"Significant autocorrelation ({ac:.2f}) — "
            "supports ARIMA model choice."
        )

    hist = fi.get("history_length", 0)
    if hist < 0.2:
        parts.append(
            "Short history (< 18 days) — model defaulted to moving average."
        )

    return " ".join(parts)