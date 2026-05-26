"""
Anomaly Detector — flags unusual stock movement quantities.

Uses Isolation Forest (sklearn) which is well-suited for high-dimensional,
unlabelled data and requires no assumption about the underlying distribution.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
from sklearn.ensemble import IsolationForest


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AnomalyPoint:
    index: int            # position in the input list
    quantity: float
    anomaly_score: float  # normalised [0, 1]; higher = more anomalous
    is_anomaly: bool


@dataclass
class AnomalyResult:
    product_id: str
    total_points: int
    anomaly_count: int
    anomalies: List[AnomalyPoint]
    all_scores: List[float]       # anomaly score for every data point
    all_flags: List[bool]         # is_anomaly for every data point


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class AnomalyDetector:
    """
    Detect unusual stock movement quantities using Isolation Forest.

    The detector is intentionally conservative (contamination=0.05) to
    avoid too many false positives in normal inventory fluctuations.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 100,
        random_state: int = 42,
    ) -> None:
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state

    def detect(
        self,
        movements_history: List[float],
        product_id: str = "",
    ) -> AnomalyResult:
        """
        Analyse a list of movement quantities and flag anomalies.

        Args:
            movements_history: Ordered list of movement quantities (absolute values).
            product_id:        Optional product UUID for the result object.

        Returns:
            AnomalyResult with per-point scores and flags.
        """
        quantities = np.array(movements_history, dtype=float).reshape(-1, 1)
        n = len(quantities)

        if n < 5:
            # Not enough data — return all non-anomalous
            scores = [0.0] * n
            flags = [False] * n
            return AnomalyResult(
                product_id=product_id,
                total_points=n,
                anomaly_count=0,
                anomalies=[],
                all_scores=scores,
                all_flags=flags,
            )

        # Feature matrix: [quantity, rolling_z_score]
        features = self._build_features(quantities.flatten())

        # Fit Isolation Forest
        clf = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
        )
        clf.fit(features)

        # Raw scores: negative → more anomalous in sklearn convention.
        # We flip and normalise to [0, 1] so higher = more anomalous.
        raw_scores = clf.score_samples(features)           # shape (n,)
        normalised = self._normalise_scores(raw_scores)

        labels = clf.predict(features)                     # -1 anomaly, 1 normal
        flags = (labels == -1).tolist()
        scores = normalised.tolist()

        anomalies = [
            AnomalyPoint(
                index=i,
                quantity=float(quantities[i]),
                anomaly_score=round(scores[i], 4),
                is_anomaly=flags[i],
            )
            for i in range(n)
            if flags[i]
        ]

        return AnomalyResult(
            product_id=product_id,
            total_points=n,
            anomaly_count=len(anomalies),
            anomalies=anomalies,
            all_scores=[round(s, 4) for s in scores],
            all_flags=flags,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_features(self, quantities: np.ndarray) -> np.ndarray:
        """
        Enrich raw quantities with rolling statistics for better detection.

        Features per point:
          0: quantity (raw)
          1: rolling z-score (window=7)
          2: log(quantity + 1)
        """
        n = len(quantities)
        log_qty = np.log1p(quantities)

        # Rolling z-score with window 7 (or smaller at the start)
        z_scores = np.zeros(n)
        window = 7
        for i in range(n):
            start = max(0, i - window + 1)
            window_data = quantities[start : i + 1]
            if len(window_data) >= 2:
                mu = np.mean(window_data)
                sigma = np.std(window_data)
                z_scores[i] = (quantities[i] - mu) / sigma if sigma > 0 else 0.0

        return np.column_stack([quantities, z_scores, log_qty])

    @staticmethod
    def _normalise_scores(raw: np.ndarray) -> np.ndarray:
        """
        Isolation Forest score_samples returns negative values;
        more negative = more anomalous.  Flip and min-max normalise to [0, 1].
        """
        flipped = -raw  # now higher = more anomalous
        min_val, max_val = flipped.min(), flipped.max()
        if max_val == min_val:
            return np.zeros_like(flipped)
        return (flipped - min_val) / (max_val - min_val)