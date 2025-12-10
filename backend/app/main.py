from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.security_headers import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events"""
    # Startup
    from app.services.report_scheduler import start_scheduler
    start_scheduler()
    yield
    # Shutdown
    from app.services.report_scheduler import stop_scheduler
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT == "development" else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS - restrict methods and headers for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Import routers HERE (after app is created) to avoid circular imports
from app.api.v1 import auth, users, tickets, roles, categories, dashboard, service_requests, reports, changes, change_approvals, notifications, knowledge, assets, sla_policies, chatbot, problems, groups, integrations, scheduled_reports, live_chat, projects
from app.api.v1 import settings as settings_router

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])
app.include_router(roles.router, prefix="/api/v1", tags=["Roles"])
app.include_router(categories.router, prefix="/api/v1", tags=["Categories"])
app.include_router(tickets.router, prefix="/api/v1", tags=["Tickets"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["Dashboard"])
app.include_router(service_requests.router, prefix="/api/v1", tags=["Service Requests"])
app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
app.include_router(changes.router, prefix="/api/v1/changes", tags=["Changes"])
app.include_router(change_approvals.router, prefix="/api/v1/change-approvals", tags=["Change Approvals"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["Knowledge Base"])
app.include_router(assets.router, prefix="/api/v1/assets", tags=["Asset Management"])
app.include_router(sla_policies.router, prefix="/api/v1", tags=["SLA Policies"])
app.include_router(chatbot.router, prefix="/api/v1", tags=["AI Chatbot"])
app.include_router(problems.router, prefix="/api/v1/problems", tags=["Problem Management"])
app.include_router(groups.router, prefix="/api/v1", tags=["Groups"])
app.include_router(settings_router.router, prefix="/api/v1", tags=["Settings"])
app.include_router(integrations.router, prefix="/api/v1", tags=["Integrations"])
app.include_router(scheduled_reports.router, prefix="/api/v1", tags=["Scheduled Reports"])
app.include_router(live_chat.router, prefix="/api/v1", tags=["Live Chat"])
app.include_router(projects.router, prefix="/api/v1", tags=["Projects"])

# Mount static files directory for serving avatars and other static content
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"message": "ITSM Platform API", "version": settings.APP_VERSION}

@app.get("/health")
async def health():
    """Simple health check endpoint for load balancers and container orchestration"""
    return {"status": "healthy"}

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}