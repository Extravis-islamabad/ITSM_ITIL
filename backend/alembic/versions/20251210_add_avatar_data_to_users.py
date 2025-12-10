"""Add avatar_data and avatar_mime_type columns to users

Revision ID: avatar_data_001
Revises: live_chat_001
Create Date: 2025-12-10

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'avatar_data_001'
down_revision = 'live_chat_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add avatar_data column to store base64 encoded avatar images
    op.add_column('users', sa.Column('avatar_data', sa.Text(), nullable=True))
    # Add avatar_mime_type column to store the MIME type of the avatar
    op.add_column('users', sa.Column('avatar_mime_type', sa.String(50), nullable=True))


def downgrade():
    op.drop_column('users', 'avatar_mime_type')
    op.drop_column('users', 'avatar_data')
