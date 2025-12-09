"""Add category_type to categories

Revision ID: xxxxx
Revises: aeadf4821f09
Create Date: 2025-11-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'fd3c297d71ea'
down_revision = 'aeadf4821f09'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum type
    categorytype = postgresql.ENUM('INCIDENT', 'CHANGE', 'PROBLEM', 'SERVICE_REQUEST', 'ASSET', name='categorytype')
    categorytype.create(op.get_bind())
    
    # Add column as nullable first
    op.add_column('categories', sa.Column('category_type', categorytype, nullable=True))
    
    # Set default value for existing rows
    op.execute("UPDATE categories SET category_type = 'INCIDENT' WHERE category_type IS NULL")
    
    # Make it non-nullable
    op.alter_column('categories', 'category_type', nullable=False)
    
    # Drop unique constraint on name to allow same name for different types
    op.drop_constraint('categories_name_key', 'categories', type_='unique')

def downgrade():
    # Add back unique constraint
    op.create_unique_constraint('categories_name_key', 'categories', ['name'])
    
    # Drop column
    op.drop_column('categories', 'category_type')
    
    # Drop enum type
    op.execute('DROP TYPE categorytype')