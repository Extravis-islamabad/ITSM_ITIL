from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Category Schemas
class KnowledgeCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True
    is_public: bool = True


class KnowledgeCategoryCreate(KnowledgeCategoryBase):
    pass


class KnowledgeCategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class KnowledgeCategoryResponse(KnowledgeCategoryBase):
    id: int
    article_count: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Article Schemas
class KnowledgeArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    slug: str = Field(..., min_length=1, max_length=500)
    summary: Optional[str] = None
    content: str = Field(..., min_length=1)
    category_id: Optional[int] = None
    tags: Optional[str] = None
    status: str = "DRAFT"
    is_featured: bool = False
    is_faq: bool = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class KnowledgeArticleCreate(KnowledgeArticleBase):
    pass


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_faq: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class KnowledgeArticleResponse(KnowledgeArticleBase):
    id: int
    author_id: int
    author_name: Optional[str] = None
    category_name: Optional[str] = None
    last_reviewed_by_id: Optional[int] = None
    last_reviewed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    view_count: int = 0
    helpful_count: int = 0
    not_helpful_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KnowledgeArticleDetailResponse(KnowledgeArticleResponse):
    related_articles: Optional[List['KnowledgeArticleResponse']] = []


# Rating Schemas
class ArticleRatingCreate(BaseModel):
    article_id: int
    is_helpful: bool
    feedback: Optional[str] = None


class ArticleRatingResponse(BaseModel):
    id: int
    article_id: int
    user_id: Optional[int] = None
    is_helpful: bool
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Search Schemas
class ArticleSearchParams(BaseModel):
    query: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[str] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_faq: Optional[bool] = None
    page: int = 1
    page_size: int = 20


# Analytics Schemas
class ArticleAnalyticsResponse(BaseModel):
    total_articles: int
    published_articles: int
    draft_articles: int
    total_views: int
    total_ratings: int
    helpful_percentage: float
    popular_articles: List[KnowledgeArticleResponse]
    recent_articles: List[KnowledgeArticleResponse]


class CategoryWithArticlesResponse(KnowledgeCategoryResponse):
    articles: List[KnowledgeArticleResponse] = []
    subcategories: List['CategoryWithArticlesResponse'] = []


# Publish/Unpublish
class PublishArticleRequest(BaseModel):
    article_id: int


class ReviewArticleRequest(BaseModel):
    article_id: int
    comments: Optional[str] = None
