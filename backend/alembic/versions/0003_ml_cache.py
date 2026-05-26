"""add ml_forecasts and anomaly_logs tables

Revision ID: 0003_ml_cache
Revises: dd5ae49b0823
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0003_ml_cache"
down_revision = "dd5ae49b0823"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # ml_forecasts
    # ------------------------------------------------------------------
    op.create_table(
        "ml_forecasts",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("model_used", sa.String(64), nullable=False),
        sa.Column("forecast_horizon", sa.Integer(), nullable=False),
        sa.Column("forecast_data", postgresql.JSONB(), nullable=False),
        sa.Column("confidence_lower", postgresql.JSONB(), nullable=False),
        sa.Column("confidence_upper", postgresql.JSONB(), nullable=False),
        sa.Column(
            "generated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "expires_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
        ),
    )

    # ------------------------------------------------------------------
    # anomaly_logs
    # ------------------------------------------------------------------
    op.create_table(
        "anomaly_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "movement_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("stock_movements.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("anomaly_score", sa.Float(), nullable=False),
        sa.Column("is_anomaly", sa.Boolean(), nullable=False),
        sa.Column(
            "detected_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("anomaly_logs")
    op.drop_table("ml_forecasts")