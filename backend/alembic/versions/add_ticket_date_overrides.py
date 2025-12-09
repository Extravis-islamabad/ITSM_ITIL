"""Add ticket date override columns

Revision ID: add_ticket_date_overrides
Revises:
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ticket_date_overrides'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add date override columns to tickets table
    op.add_column('tickets', sa.Column('created_at_override', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tickets', sa.Column('resolved_at_override', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tickets', sa.Column('closed_at_override', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tickets', sa.Column('override_reason', sa.Text(), nullable=True))
    op.add_column('tickets', sa.Column('override_by_id', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_tickets_override_by_id',
        'tickets',
        'users',
        ['override_by_id'],
        ['id']
    )


def downgrade():
    op.drop_constraint('fk_tickets_override_by_id', 'tickets', type_='foreignkey')
    op.drop_column('tickets', 'override_by_id')
    op.drop_column('tickets', 'override_reason')
    op.drop_column('tickets', 'closed_at_override')
    op.drop_column('tickets', 'resolved_at_override')
    op.drop_column('tickets', 'created_at_override')
