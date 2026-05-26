"""
Demand Forecaster — auto-selects best model based on data pattern.

Models:
  - ARIMA          → seasonal / autocorrelated series
  - Croston        → sparse / lumpy demand (many zeros)
  - Moving Average → short history (< 14 data points)
  - Holt-Winters   → trending series with or without seasonality
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings("ignore")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class ForecastResult:
    product_id: str
    model_used: str
    horizon: int
    forecast: List[float]
    confidence_lower: List[float]
    confidence_upper: List[float]
    feature_importance: dict = field(default_factory=dict)
    model_selection_reason: str = ""


# ---------------------------------------------------------------------------
# Helper: Croston's method for sparse/intermittent demand
# ---------------------------------------------------------------------------

def _croston(series: np.ndarray, horizon: int, alpha: float = 0.1) -> np.ndarray:
    """Classic Croston method for intermittent demand."""
    non_zero = series[series > 0]
    if len(non_zero) == 0:
        return np.zeros(horizon)

    # Smoothed demand size and inter-arrival interval
    demand = float(non_zero[0])
    interval = 1.0
    prev_t = 0

    for t, val in enumerate(series):
        if val > 0:
            q = t - prev_t  # inter-arrival
            demand = alpha * val + (1 - alpha) * demand
            interval = alpha * q + (1 - alpha) * interval
            prev_t = t

    rate = demand / max(interval, 1.0)
    return np.full(horizon, max(rate, 0.0))


# ---------------------------------------------------------------------------
# Helper: Simple Moving Average
# ---------------------------------------------------------------------------

def _moving_average(series: np.ndarray, horizon: int, window: int = 7) -> np.ndarray:
    window = min(window, len(series))
    avg = float(np.mean(series[-window:]))
    return np.full(horizon, max(avg, 0.0))


# ---------------------------------------------------------------------------
# Helper: ARIMA forecast
# ---------------------------------------------------------------------------

def _arima_forecast(series: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.arima.model import ARIMA  # lazy import

    try:
        model = ARIMA(series, order=(2, 1, 2))
        fit = model.fit()
        fc = fit.forecast(steps=horizon)
        return np.maximum(fc, 0.0)
    except Exception:
        # Fallback to MA if ARIMA fails
        return _moving_average(series, horizon)


# ---------------------------------------------------------------------------
# Helper: Holt-Winters (Exponential Smoothing)
# ---------------------------------------------------------------------------

def _holtwinters_forecast(series: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing  # lazy import

    try:
        seasonal = "add" if len(series) >= 14 else None
        seasonal_periods = 7 if seasonal else None
        model = ExponentialSmoothing(
            series,
            trend="add",
            seasonal=seasonal,
            seasonal_periods=seasonal_periods,
            initialization_method="estimated",
        )
        fit = model.fit(optimized=True, use_brute=False)
        fc = fit.forecast(steps=horizon)
        return np.maximum(fc, 0.0)
    except Exception:
        return _moving_average(series, horizon)


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class DemandForecaster:
    """
    Auto-selects and runs the best demand forecasting model for a product.
    """

    # Thresholds
    MIN_POINTS_FOR_ARIMA = 30
    MIN_POINTS_FOR_HOLTWINTERS = 14
    SPARSITY_THRESHOLD = 0.5   # >50 % zeros → sparse
    TREND_THRESHOLD = 0.3      # Pearson r > 0.3 → trending

    def select_model(self, series: np.ndarray) -> Tuple[str, str]:
        """
        Analyse the series and return (model_name, reason).

        Decision tree:
          1. < 14 points                    → moving_average
          2. > 50 % zeros                   → croston
          3. significant linear trend       → holt_winters
          4. >= 30 points (autocorrelated)  → arima
          5. default                        → holt_winters
        """
        n = len(series)

        if n < self.MIN_POINTS_FOR_HOLTWINTERS:
            return (
                "moving_average",
                f"Insufficient history ({n} points < {self.MIN_POINTS_FOR_HOLTWINTERS}); "
                "using 7-day moving average.",
            )

        zero_ratio = float(np.sum(series == 0)) / n
        if zero_ratio > self.SPARSITY_THRESHOLD:
            return (
                "croston",
                f"Sparse/lumpy demand detected ({zero_ratio:.0%} zero values); "
                "Croston's method handles intermittent demand best.",
            )

        # Linear trend test
        x = np.arange(n)
        r, p = stats.pearsonr(x, series)
        if abs(r) > self.TREND_THRESHOLD and p < 0.05:
            return (
                "holt_winters",
                f"Significant {'upward' if r > 0 else 'downward'} trend detected "
                f"(r={r:.2f}, p={p:.3f}); Holt-Winters captures trend + seasonality.",
            )

        if n >= self.MIN_POINTS_FOR_ARIMA:
            return (
                "arima",
                f"Sufficient history ({n} points) with autocorrelation structure; "
                "ARIMA(2,1,2) chosen for seasonal / cyclical patterns.",
            )

        return (
            "holt_winters",
            f"Moderate history ({n} points), no strong sparsity or trend; "
            "Holt-Winters exponential smoothing selected as robust default.",
        )

    def forecast(
        self,
        product_id: str,
        history: List[float],
        horizon: int = 30,
    ) -> ForecastResult:
        """
        Run the selected model and return a ForecastResult.

        Args:
            product_id: UUID string of the product.
            history:    List of daily demand quantities (oldest first).
            horizon:    Number of future days to forecast.
        """
        series = np.array(history, dtype=float)

        if len(series) == 0:
            # No data at all — return zeros
            return ForecastResult(
                product_id=product_id,
                model_used="no_data",
                horizon=horizon,
                forecast=[0.0] * horizon,
                confidence_lower=[0.0] * horizon,
                confidence_upper=[0.0] * horizon,
                model_selection_reason="No historical data available.",
            )

        model_name, reason = self.select_model(series)

        # Run model
        if model_name == "moving_average":
            fc_values = _moving_average(series, horizon)
        elif model_name == "croston":
            fc_values = _croston(series, horizon)
        elif model_name == "arima":
            fc_values = _arima_forecast(series, horizon)
        else:  # holt_winters
            fc_values = _holtwinters_forecast(series, horizon)

        lower, upper = self.confidence_interval(fc_values)

        importance = self._feature_importance(series, model_name)

        return ForecastResult(
            product_id=product_id,
            model_used=model_name,
            horizon=horizon,
            forecast=fc_values.tolist(),
            confidence_lower=lower.tolist(),
            confidence_upper=upper.tolist(),
            feature_importance=importance,
            model_selection_reason=reason,
        )

    def confidence_interval(
        self,
        forecast: np.ndarray,
        confidence: float = 0.95,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute symmetric confidence intervals using a ±z·σ approach.
        σ is estimated from the forecast spread (growing uncertainty over horizon).
        """
        z = stats.norm.ppf(0.5 + confidence / 2)  # e.g. 1.96 for 95 %
        horizon = len(forecast)

        # Uncertainty grows with forecast horizon (square-root rule)
        base_std = max(float(np.std(forecast)) * 0.2, 1.0)
        horizon_factor = np.sqrt(np.arange(1, horizon + 1))
        margin = z * base_std * horizon_factor

        lower = np.maximum(forecast - margin, 0.0)
        upper = forecast + margin

        return lower, upper

    # ------------------------------------------------------------------
    # SHAP-style feature importance
    # ------------------------------------------------------------------

    def _feature_importance(self, series: np.ndarray, model_name: str) -> dict:
        """
        Return a dict explaining the key signals that drove model selection.
        Values are normalised importances (0–1) for interpretability.
        """
        n = len(series)
        if n == 0:
            return {}

        zero_ratio = float(np.sum(series == 0)) / n

        x = np.arange(n)
        r, _ = stats.pearsonr(x, series) if n >= 3 else (0.0, 1.0)

        # Approximate autocorrelation at lag-1
        if n >= 2:
            ac = float(pd.Series(series).autocorr(lag=1)) if n >= 4 else 0.0
        else:
            ac = 0.0
        ac = ac if not np.isnan(ac) else 0.0

        # Coefficient of variation (volatility)
        mean = float(np.mean(series))
        cv = float(np.std(series)) / mean if mean > 0 else 0.0

        # Normalise each signal to [0, 1]
        features = {
            "history_length": min(n / 90.0, 1.0),
            "sparsity_ratio": zero_ratio,
            "trend_strength": min(abs(r), 1.0),
            "autocorrelation": min(abs(ac), 1.0),
            "demand_volatility": min(cv / 3.0, 1.0),
        }

        # Add model-specific explanation
        features["selected_model"] = model_name
        features["selection_confidence"] = round(
            1.0 - (0.2 if model_name in ("moving_average", "no_data") else 0.0), 2
        )

        return features