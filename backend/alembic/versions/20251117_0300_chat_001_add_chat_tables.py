"""add chat tables

Revision ID: chat_001
Revises: d62afd688a67
Create Date: 2025-11-17 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'chat_001'
down_revision = 'd62afd688a67'  # Fixed: was asset_mgmt_001, but d62afd688a67 was added between
branch_labels = None
depends_on = None


def upgrade():
    # Create chat_conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('issue_summary', sa.String(length=500), nullable=True),
        sa.Column('resolution_provided', sa.Boolean(), nullable=True),
        sa.Column('ticket_id', sa.Integer(), nullable=True),
        sa.Column('sentiment', sa.String(length=20), nullable=True),
        sa.Column('category_suggested', sa.Integer(), nullable=True),
        sa.Column('conversation_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_conversations_session_id'), 'chat_conversations', ['session_id'], unique=True)

    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(length=50), nullable=True),
        sa.Column('message_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['chat_conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_chat_conversations_session_id'), table_name='chat_conversations')
    op.drop_table('chat_conversations')
