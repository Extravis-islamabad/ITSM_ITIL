"""add_asset_id_to_changes

Revision ID: d62afd688a67
Revises: asset_mgmt_001
Create Date: 2025-11-16 22:17:31.580256+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd62afd688a67'
down_revision = 'asset_mgmt_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add asset_id column to changes table
    op.add_column('changes', sa.Column('asset_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_changes_asset_id', 'changes', 'assets', ['asset_id'], ['id'])


def downgrade() -> None:
    # Remove asset_id column from changes table
    op.drop_constraint('fk_changes_asset_id', 'changes', type_='foreignkey')
    op.drop_column('changes', 'asset_id')