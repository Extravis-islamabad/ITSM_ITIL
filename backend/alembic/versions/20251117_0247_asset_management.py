"""Asset Management tables

Revision ID: asset_mgmt_001
Revises: kb_001
Create Date: 2025-11-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'asset_mgmt_001'
down_revision = 'kb_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing basic assets table if it exists
    op.execute('DROP TABLE IF EXISTS assets CASCADE')

    # Create enum types (assuming they've been dropped or don't exist)
    assetstatus = postgresql.ENUM(
        'NEW', 'ACTIVE', 'IN_MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST', 'STOLEN',
        name='assetstatus',
        create_type=False
    )
    assetstatus.create(op.get_bind(), checkfirst=True)

    assetcondition = postgresql.ENUM(
        'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED',
        name='assetcondition',
        create_type=False
    )
    assetcondition.create(op.get_bind(), checkfirst=True)

    relationshiptype = postgresql.ENUM(
        'DEPENDS_ON', 'PART_OF', 'CONNECTED_TO', 'INSTALLED_ON', 'USES',
        name='relationshiptype',
        create_type=False
    )
    relationshiptype.create(op.get_bind(), checkfirst=True)

    # Create asset_types table
    op.create_table(
        'asset_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('is_hardware', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('requires_serial', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['asset_types.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_asset_types_id'), 'asset_types', ['id'], unique=False)

    # Create assets table (comprehensive)
    op.create_table(
        'assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_tag', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Classification
        sa.Column('asset_type_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer', sa.String(length=200), nullable=True),
        sa.Column('model', sa.String(length=200), nullable=True),
        sa.Column('serial_number', sa.String(length=200), nullable=True),

        # Status and condition
        sa.Column('status', assetstatus, nullable=False, server_default='NEW'),
        sa.Column('condition', assetcondition, nullable=True, server_default='GOOD'),

        # Location and assignment
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('assigned_date', sa.DateTime(timezone=True), nullable=True),

        # Financial
        sa.Column('purchase_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('purchase_cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('current_value', sa.Numeric(10, 2), nullable=True),
        sa.Column('supplier', sa.String(length=200), nullable=True),
        sa.Column('po_number', sa.String(length=100), nullable=True),

        # Warranty
        sa.Column('warranty_start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('warranty_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('warranty_provider', sa.String(length=200), nullable=True),

        # Technical
        sa.Column('specifications', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('mac_address', sa.String(length=17), nullable=True),
        sa.Column('hostname', sa.String(length=200), nullable=True),

        # Software license
        sa.Column('license_key', sa.String(length=500), nullable=True),
        sa.Column('license_expiry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('license_seats', sa.Integer(), nullable=True),

        # Lifecycle
        sa.Column('deployment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retirement_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('disposal_date', sa.DateTime(timezone=True), nullable=True),

        # Tracking
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('qr_code', sa.String(length=500), nullable=True),
        sa.Column('barcode', sa.String(length=200), nullable=True),

        # Metadata
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),

        sa.ForeignKeyConstraint(['asset_type_id'], ['asset_types.id'], ),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_tag')
    )
    op.create_index(op.f('ix_assets_id'), 'assets', ['id'], unique=False)
    op.create_index(op.f('ix_assets_asset_tag'), 'assets', ['asset_tag'], unique=False)
    op.create_index(op.f('ix_assets_serial_number'), 'assets', ['serial_number'], unique=False)
    op.create_index(op.f('ix_assets_status'), 'assets', ['status'], unique=False)

    # Create asset_assignments table
    op.create_table(
        'asset_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by_id', sa.Integer(), nullable=False),
        sa.Column('assigned_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('returned_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=True, server_default='true'),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_assignments_id'), 'asset_assignments', ['id'], unique=False)

    # Create asset_relationships table
    op.create_table(
        'asset_relationships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('parent_asset_id', sa.Integer(), nullable=False),
        sa.Column('child_asset_id', sa.Integer(), nullable=False),
        sa.Column('relationship_type', relationshiptype, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['parent_asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_relationships_id'), 'asset_relationships', ['id'], unique=False)

    # Create asset_history table
    op.create_table(
        'asset_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('field_name', sa.String(length=200), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_history_id'), 'asset_history', ['id'], unique=False)

    # Create asset_contracts table
    op.create_table(
        'asset_contracts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('contract_type', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=200), nullable=False),
        sa.Column('contract_number', sa.String(length=100), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('renewal_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('terms', sa.Text(), nullable=True),
        sa.Column('contact_name', sa.String(length=200), nullable=True),
        sa.Column('contact_email', sa.String(length=200), nullable=True),
        sa.Column('contact_phone', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_contracts_id'), 'asset_contracts', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_asset_contracts_id'), table_name='asset_contracts')
    op.drop_table('asset_contracts')

    op.drop_index(op.f('ix_asset_history_id'), table_name='asset_history')
    op.drop_table('asset_history')

    op.drop_index(op.f('ix_asset_relationships_id'), table_name='asset_relationships')
    op.drop_table('asset_relationships')

    op.drop_index(op.f('ix_asset_assignments_id'), table_name='asset_assignments')
    op.drop_table('asset_assignments')

    op.drop_index(op.f('ix_assets_status'), table_name='assets')
    op.drop_index(op.f('ix_assets_serial_number'), table_name='assets')
    op.drop_index(op.f('ix_assets_asset_tag'), table_name='assets')
    op.drop_index(op.f('ix_assets_id'), table_name='assets')
    op.drop_table('assets')

    op.drop_index(op.f('ix_asset_types_id'), table_name='asset_types')
    op.drop_table('asset_types')

    # Drop enum types
    sa.Enum(name='relationshiptype').drop(op.get_bind())
    sa.Enum(name='assetcondition').drop(op.get_bind())
    sa.Enum(name='assetstatus').drop(op.get_bind())
