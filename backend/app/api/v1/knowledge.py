from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import Optional, List
from datetime import datetime
import math
import re

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, require_agent_or_above
from app.models.user import User
from app.models.knowledge import (
    KnowledgeArticle,
    KnowledgeCategory,
    ArticleRating,
    ArticleView,
    ArticleStatus
)
from app.schemas.knowledge import (
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeArticleResponse,
    KnowledgeArticleDetailResponse,
    KnowledgeCategoryCreate,
    KnowledgeCategoryUpdate,
    KnowledgeCategoryResponse,
    ArticleRatingCreate,
    ArticleRatingResponse,
    ArticleSearchParams,
    ArticleAnalyticsResponse,
    CategoryWithArticlesResponse
)

router = APIRouter()


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


# ============ CATEGORIES ============

@router.post("/categories", response_model=KnowledgeCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: KnowledgeCategoryCreate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Create a new knowledge category (Admin only)"""
    # Check if slug already exists
    existing = db.query(KnowledgeCategory).filter(KnowledgeCategory.slug == category_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )

    category = KnowledgeCategory(**category_data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        **category.__dict__,
        "article_count": 0
    }


@router.get("/categories")
async def get_categories(
    parent_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all categories"""
    query = db.query(KnowledgeCategory)

    if parent_id is not None:
        query = query.filter(KnowledgeCategory.parent_id == parent_id)
    if is_active is not None:
        query = query.filter(KnowledgeCategory.is_active == is_active)
    if is_public is not None:
        query = query.filter(KnowledgeCategory.is_public == is_public)

    query = query.order_by(KnowledgeCategory.sort_order, KnowledgeCategory.name)
    categories = query.all()

    result = []
    for cat in categories:
        article_count = db.query(func.count(KnowledgeArticle.id)).filter(
            KnowledgeArticle.category_id == cat.id,
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).scalar()

        result.append({
            **cat.__dict__,
            "article_count": article_count
        })

    return result


@router.get("/categories/{category_id}", response_model=CategoryWithArticlesResponse)
async def get_category(
    category_id: int,
    include_articles: bool = False,
    db: Session = Depends(get_db)
):
    """Get category by ID with optional articles"""
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    result = {
        **category.__dict__,
        "article_count": db.query(func.count(KnowledgeArticle.id)).filter(
            KnowledgeArticle.category_id == category.id
        ).scalar(),
        "articles": [],
        "subcategories": []
    }

    if include_articles:
        articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.category_id == category_id,
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).all()

        result["articles"] = [
            {
                **article.__dict__,
                "author_name": article.author.full_name if article.author else None,
                "category_name": article.category.name if article.category else None
            }
            for article in articles
        ]

    return result


@router.put("/categories/{category_id}", response_model=KnowledgeCategoryResponse)
async def update_category(
    category_id: int,
    category_data: KnowledgeCategoryUpdate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Update a category (Admin only)"""
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return {
        **category.__dict__,
        "article_count": db.query(func.count(KnowledgeArticle.id)).filter(
            KnowledgeArticle.category_id == category.id
        ).scalar()
    }


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Delete a category (Admin only)"""
    category = db.query(KnowledgeCategory).filter(KnowledgeCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if has articles
    article_count = db.query(func.count(KnowledgeArticle.id)).filter(
        KnowledgeArticle.category_id == category_id
    ).scalar()

    if article_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {article_count} articles"
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}


# ============ ARTICLES ============

@router.post("/articles", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_data: KnowledgeArticleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new knowledge article"""
    # Check if slug already exists
    existing = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == article_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )

    article = KnowledgeArticle(
        **article_data.dict(),
        author_id=current_user.id
    )

    db.add(article)
    db.commit()
    db.refresh(article)

    return {
        **article.__dict__,
        "author_name": current_user.full_name,
        "category_name": article.category.name if article.category else None
    }


@router.get("/articles")
async def get_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_faq: Optional[bool] = None,
    author_id: Optional[int] = None,
    tags: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get paginated list of articles"""
    query = db.query(KnowledgeArticle)

    # Filters
    if search:
        query = query.filter(
            or_(
                KnowledgeArticle.title.ilike(f"%{search}%"),
                KnowledgeArticle.summary.ilike(f"%{search}%"),
                KnowledgeArticle.content.ilike(f"%{search}%"),
                KnowledgeArticle.tags.ilike(f"%{search}%")
            )
        )

    if category_id:
        query = query.filter(KnowledgeArticle.category_id == category_id)

    if status:
        query = query.filter(KnowledgeArticle.status == status)

    if is_featured is not None:
        query = query.filter(KnowledgeArticle.is_featured == is_featured)

    if is_faq is not None:
        query = query.filter(KnowledgeArticle.is_faq == is_faq)

    if author_id:
        query = query.filter(KnowledgeArticle.author_id == author_id)

    if tags:
        query = query.filter(KnowledgeArticle.tags.ilike(f"%{tags}%"))

    # Count total
    total = query.count()

    # Pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Get articles
    articles = query.order_by(desc(KnowledgeArticle.created_at)).offset(skip).limit(page_size).all()

    items = [
        {
            **article.__dict__,
            "author_name": article.author.full_name if article.author else None,
            "category_name": article.category.name if article.category else None
        }
        for article in articles
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/articles/{article_id}", response_model=KnowledgeArticleDetailResponse)
async def get_article(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get article by ID"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Track view
    view = ArticleView(
        article_id=article_id,
        user_id=current_user.id if current_user else None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(view)

    # Increment view count
    article.view_count += 1
    db.commit()

    # Get related articles (same category)
    related_articles = []
    if article.category_id:
        related_articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.category_id == article.category_id,
            KnowledgeArticle.id != article_id,
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).limit(5).all()

    return {
        **article.__dict__,
        "author_name": article.author.full_name if article.author else None,
        "category_name": article.category.name if article.category else None,
        "related_articles": [
            {
                **rel.__dict__,
                "author_name": rel.author.full_name if rel.author else None,
                "category_name": rel.category.name if rel.category else None
            }
            for rel in related_articles
        ]
    }


@router.get("/articles/slug/{slug}", response_model=KnowledgeArticleDetailResponse)
async def get_article_by_slug(
    slug: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get article by slug"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Track view
    view = ArticleView(
        article_id=article.id,
        user_id=current_user.id if current_user else None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(view)

    # Increment view count
    article.view_count += 1
    db.commit()

    # Get related articles (same category)
    related_articles = []
    if article.category_id:
        related_articles = db.query(KnowledgeArticle).filter(
            KnowledgeArticle.category_id == article.category_id,
            KnowledgeArticle.id != article.id,
            KnowledgeArticle.status == ArticleStatus.PUBLISHED
        ).limit(5).all()

    return {
        **article.__dict__,
        "author_name": article.author.full_name if article.author else None,
        "category_name": article.category.name if article.category else None,
        "related_articles": [
            {
                **rel.__dict__,
                "author_name": rel.author.full_name if rel.author else None,
                "category_name": rel.category.name if rel.category else None
            }
            for rel in related_articles
        ]
    }


@router.put("/articles/{article_id}", response_model=KnowledgeArticleResponse)
async def update_article(
    article_id: int,
    article_data: KnowledgeArticleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an article"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    update_data = article_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    db.commit()
    db.refresh(article)

    return {
        **article.__dict__,
        "author_name": article.author.full_name if article.author else None,
        "category_name": article.category.name if article.category else None
    }


@router.post("/articles/{article_id}/publish")
async def publish_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish an article"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.status = ArticleStatus.PUBLISHED
    article.published_at = datetime.utcnow()

    db.commit()
    return {"message": "Article published successfully"}


@router.post("/articles/{article_id}/unpublish")
async def unpublish_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unpublish an article"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.status = ArticleStatus.DRAFT

    db.commit()
    return {"message": "Article unpublished successfully"}


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an article"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    db.delete(article)
    db.commit()
    return {"message": "Article deleted successfully"}


# ============ RATINGS ============

@router.post("/articles/{article_id}/rate", response_model=ArticleRatingResponse)
async def rate_article(
    article_id: int,
    is_helpful: bool,
    feedback: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Rate an article"""
    article = db.query(KnowledgeArticle).filter(KnowledgeArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Check if user already rated
    if current_user:
        existing = db.query(ArticleRating).filter(
            ArticleRating.article_id == article_id,
            ArticleRating.user_id == current_user.id
        ).first()
        if existing:
            existing.is_helpful = is_helpful
            existing.feedback = feedback
            db.commit()
            return existing

    # Create new rating
    rating = ArticleRating(
        article_id=article_id,
        user_id=current_user.id if current_user else None,
        is_helpful=is_helpful,
        feedback=feedback,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None
    )
    db.add(rating)

    # Update article counts
    if is_helpful:
        article.helpful_count += 1
    else:
        article.not_helpful_count += 1

    db.commit()
    db.refresh(rating)

    return rating


# ============ ANALYTICS ============

@router.get("/analytics/overview", response_model=ArticleAnalyticsResponse)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get knowledge base analytics overview"""
    total_articles = db.query(func.count(KnowledgeArticle.id)).scalar()
    published_articles = db.query(func.count(KnowledgeArticle.id)).filter(
        KnowledgeArticle.status == ArticleStatus.PUBLISHED
    ).scalar()
    draft_articles = db.query(func.count(KnowledgeArticle.id)).filter(
        KnowledgeArticle.status == ArticleStatus.DRAFT
    ).scalar()

    total_views = db.query(func.sum(KnowledgeArticle.view_count)).scalar() or 0
    total_ratings = db.query(func.count(ArticleRating.id)).scalar()

    helpful_ratings = db.query(func.count(ArticleRating.id)).filter(
        ArticleRating.is_helpful == True
    ).scalar()
    helpful_percentage = (helpful_ratings / total_ratings * 100) if total_ratings > 0 else 0

    # Popular articles
    popular_articles = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.status == ArticleStatus.PUBLISHED
    ).order_by(desc(KnowledgeArticle.view_count)).limit(10).all()

    # Recent articles
    recent_articles = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.status == ArticleStatus.PUBLISHED
    ).order_by(desc(KnowledgeArticle.published_at)).limit(10).all()

    return {
        "total_articles": total_articles,
        "published_articles": published_articles,
        "draft_articles": draft_articles,
        "total_views": total_views,
        "total_ratings": total_ratings,
        "helpful_percentage": round(helpful_percentage, 2),
        "popular_articles": [
            {
                **article.__dict__,
                "author_name": article.author.full_name if article.author else None,
                "category_name": article.category.name if article.category else None
            }
            for article in popular_articles
        ],
        "recent_articles": [
            {
                **article.__dict__,
                "author_name": article.author.full_name if article.author else None,
                "category_name": article.category.name if article.category else None
            }
            for article in recent_articles
        ]
    }
