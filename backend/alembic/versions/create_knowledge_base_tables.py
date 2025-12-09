"""create knowledge base tables

Revision ID: kb_001
Revises: fd3c297d71ea
Create Date: 2025-01-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'kb_001'
down_revision = 'fd3c297d71ea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create knowledge_categories table
    op.create_table(
        'knowledge_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_public', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['knowledge_categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_knowledge_categories_id'), 'knowledge_categories', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_categories_slug'), 'knowledge_categories', ['slug'], unique=False)

    # Create knowledge_articles table
    op.create_table(
        'knowledge_articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('slug', sa.String(length=500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', name='articlestatus'), nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_faq', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('last_reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('meta_title', sa.String(length=255), nullable=True),
        sa.Column('meta_description', sa.Text(), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('helpful_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('not_helpful_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['knowledge_categories.id'], ),
        sa.ForeignKeyConstraint(['last_reviewed_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_knowledge_articles_id'), 'knowledge_articles', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_articles_slug'), 'knowledge_articles', ['slug'], unique=False)

    # Create article_attachments table
    op.create_table(
        'article_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['knowledge_articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_attachments_id'), 'article_attachments', ['id'], unique=False)

    # Create article_ratings table
    op.create_table(
        'article_ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['knowledge_articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_ratings_id'), 'article_ratings', ['id'], unique=False)

    # Create article_views table
    op.create_table(
        'article_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('referrer', sa.String(length=500), nullable=True),
        sa.Column('viewed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['knowledge_articles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_article_views_id'), 'article_views', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_article_views_id'), table_name='article_views')
    op.drop_table('article_views')
    op.drop_index(op.f('ix_article_ratings_id'), table_name='article_ratings')
    op.drop_table('article_ratings')
    op.drop_index(op.f('ix_article_attachments_id'), table_name='article_attachments')
    op.drop_table('article_attachments')
    op.drop_index(op.f('ix_knowledge_articles_slug'), table_name='knowledge_articles')
    op.drop_index(op.f('ix_knowledge_articles_id'), table_name='knowledge_articles')
    op.drop_table('knowledge_articles')
    op.drop_index(op.f('ix_knowledge_categories_slug'), table_name='knowledge_categories')
    op.drop_index(op.f('ix_knowledge_categories_id'), table_name='knowledge_categories')
    op.drop_table('knowledge_categories')
    sa.Enum('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', name='articlestatus').drop(op.get_bind())
