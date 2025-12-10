"""add live chat tables

Revision ID: live_chat_001
Revises: chat_001
Create Date: 2025-12-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'live_chat_001'
down_revision = None  # Set to None to make it independent
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types first
    conversation_type_enum = sa.Enum('direct', 'group', name='conversation_type_enum', create_type=False)
    message_type_enum = sa.Enum('text', 'image', 'file', 'system', name='message_type_enum', create_type=False)

    # Create enums
    op.execute("CREATE TYPE IF NOT EXISTS conversation_type_enum AS ENUM ('direct', 'group')")
    op.execute("CREATE TYPE IF NOT EXISTS message_type_enum AS ENUM ('text', 'image', 'file', 'system')")

    # Create live_conversations table
    op.create_table(
        'live_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('conversation_type', sa.Enum('direct', 'group', name='conversation_type_enum', create_type=False), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('user1_id', sa.Integer(), nullable=True),
        sa.Column('user2_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user1_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user2_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_live_conversations_id'), 'live_conversations', ['id'], unique=False)

    # Create live_conversation_participants table
    op.create_table(
        'live_conversation_participants',
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_admin', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_muted', sa.Boolean(), nullable=True, default=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_read_message_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['live_conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('conversation_id', 'user_id')
    )

    # Create live_messages table
    op.create_table(
        'live_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('message_type', sa.Enum('text', 'image', 'file', 'system', name='message_type_enum', create_type=False), nullable=True),
        sa.Column('reply_to_id', sa.Integer(), nullable=True),
        sa.Column('is_edited', sa.Boolean(), nullable=True, default=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, default=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['live_conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reply_to_id'], ['live_messages.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_live_messages_id'), 'live_messages', ['id'], unique=False)
    op.create_index(op.f('ix_live_messages_conversation_id'), 'live_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_live_messages_created_at'), 'live_messages', ['created_at'], unique=False)

    # Create message_attachments table
    op.create_table(
        'message_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('thumbnail_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['message_id'], ['live_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_attachments_id'), 'message_attachments', ['id'], unique=False)

    # Create message_reactions table
    op.create_table(
        'message_reactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('emoji', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['message_id'], ['live_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_reactions_id'), 'message_reactions', ['id'], unique=False)

    # Create message_read_receipts table
    op.create_table(
        'message_read_receipts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['message_id'], ['live_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_read_receipts_id'), 'message_read_receipts', ['id'], unique=False)

    # Create user_online_status table
    op.create_table(
        'user_online_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=True, default=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('socket_id', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_online_status_id'), 'user_online_status', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_user_online_status_id'), table_name='user_online_status')
    op.drop_table('user_online_status')

    op.drop_index(op.f('ix_message_read_receipts_id'), table_name='message_read_receipts')
    op.drop_table('message_read_receipts')

    op.drop_index(op.f('ix_message_reactions_id'), table_name='message_reactions')
    op.drop_table('message_reactions')

    op.drop_index(op.f('ix_message_attachments_id'), table_name='message_attachments')
    op.drop_table('message_attachments')

    op.drop_index(op.f('ix_live_messages_created_at'), table_name='live_messages')
    op.drop_index(op.f('ix_live_messages_conversation_id'), table_name='live_messages')
    op.drop_index(op.f('ix_live_messages_id'), table_name='live_messages')
    op.drop_table('live_messages')

    op.drop_table('live_conversation_participants')

    op.drop_index(op.f('ix_live_conversations_id'), table_name='live_conversations')
    op.drop_table('live_conversations')

    op.execute('DROP TYPE IF EXISTS message_type_enum')
    op.execute('DROP TYPE IF EXISTS conversation_type_enum')
