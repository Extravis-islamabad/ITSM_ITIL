from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ArticleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class KnowledgeCategory(Base):
    __tablename__ = "knowledge_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    parent_id = Column(Integer, ForeignKey("knowledge_categories.id"), nullable=True)

    # Ordering and visibility
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # Visible in public portal

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    parent = relationship("KnowledgeCategory", remote_side=[id], backref="subcategories")
    articles = relationship("KnowledgeArticle", back_populates="category")

    def __repr__(self):
        return f"<KnowledgeCategory {self.name}>"


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False, index=True)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # Rich HTML content

    # Categorization
    category_id = Column(Integer, ForeignKey("knowledge_categories.id"), nullable=True)
    tags = Column(Text, nullable=True)  # Comma-separated tags

    # Status and visibility
    status = Column(SQLEnum(ArticleStatus), default=ArticleStatus.DRAFT)
    is_featured = Column(Boolean, default=False)
    is_faq = Column(Boolean, default=False)

    # Authoring
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Publishing
    published_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # SEO
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)

    # Analytics
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("KnowledgeCategory", back_populates="articles")
    author = relationship("User", foreign_keys=[author_id])
    last_reviewed_by = relationship("User", foreign_keys=[last_reviewed_by_id])
    attachments = relationship("ArticleAttachment", back_populates="article", cascade="all, delete-orphan")
    ratings = relationship("ArticleRating", back_populates="article", cascade="all, delete-orphan")
    views = relationship("ArticleView", back_populates="article", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<KnowledgeArticle {self.title}>"


class ArticleAttachment(Base):
    __tablename__ = "article_attachments"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes

    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    article = relationship("KnowledgeArticle", back_populates="attachments")
    uploaded_by = relationship("User")

    def __repr__(self):
        return f"<ArticleAttachment {self.file_name}>"


class ArticleRating(Base):
    __tablename__ = "article_ratings"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous ratings

    # Rating
    is_helpful = Column(Boolean, nullable=False)  # True = helpful, False = not helpful
    feedback = Column(Text, nullable=True)  # Optional text feedback

    # Tracking
    ip_address = Column(String(45), nullable=True)  # For anonymous tracking
    user_agent = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    article = relationship("KnowledgeArticle", back_populates="ratings")
    user = relationship("User")

    def __repr__(self):
        return f"<ArticleRating article_id={self.article_id} helpful={self.is_helpful}>"


class ArticleView(Base):
    __tablename__ = "article_views"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous views

    # Tracking
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)

    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    article = relationship("KnowledgeArticle", back_populates="views")
    user = relationship("User")

    def __repr__(self):
        return f"<ArticleView article_id={self.article_id}>"
