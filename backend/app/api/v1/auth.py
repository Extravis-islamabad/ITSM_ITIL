from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limiter import limiter
from app.schemas.auth import LoginRequest, LoginResponse, RefreshTokenRequest, TokenResponse
from app.services.auth_service import AuthService
from app.models.user import User
from datetime import datetime
import base64

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint - Rate limited to 5 attempts per minute"""
    try:
        result = AuthService.login(db, credentials.username, credentials.password)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    return AuthService.refresh_token(db, request.refresh_token)

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Refresh user data
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "employee_id": current_user.employee_id,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "is_superuser": current_user.is_superuser,
        "avatar_url": current_user.avatar_url,
        "timezone": current_user.timezone,
        "language": current_user.language,
        "role_id": current_user.role_id,
        "role": current_user.role.name if current_user.role else None,
        "department_id": current_user.department_id,
        "department": current_user.department.name if current_user.department else None,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login,
    }

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout endpoint"""
    return {"message": "Logged out successfully"}


# Avatar upload configuration
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp"
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture for current user - stored as base64 in database"""

    # Validate file extension
    filename = file.filename or ""
    file_ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Convert to base64
    base64_data = base64.b64encode(content).decode('utf-8')
    mime_type = MIME_TYPES.get(file_ext, "image/jpeg")

    # Update user's avatar data in database
    current_user.avatar_data = base64_data
    current_user.avatar_mime_type = mime_type
    current_user.avatar_url = f"/api/v1/auth/avatar/{current_user.id}"  # URL to fetch avatar
    current_user.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

    return {
        "message": "Avatar uploaded successfully",
        "avatar_url": current_user.avatar_url
    }


@router.get("/avatar/{user_id}")
async def get_avatar(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user avatar image from database"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.avatar_data:
        raise HTTPException(status_code=404, detail="Avatar not found")

    # Decode base64 and return as image
    image_data = base64.b64decode(user.avatar_data)
    return Response(
        content=image_data,
        media_type=user.avatar_mime_type or "image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}  # Cache for 1 hour
    )


@router.delete("/me/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete profile picture for current user"""

    if not current_user.avatar_data and not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No avatar to delete"
        )

    # Clear avatar data
    current_user.avatar_data = None
    current_user.avatar_mime_type = None
    current_user.avatar_url = None
    current_user.updated_at = datetime.utcnow()

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

    return {"message": "Avatar deleted successfully"}