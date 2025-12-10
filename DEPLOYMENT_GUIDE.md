# ITSM Platform - Deployment Guide

This guide covers deploying the ITSM platform to various environments including on-premises VMs, cloud providers, and containerized setups.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Deployment Options](#deployment-options)
   - [Option 1: Docker Compose (Recommended for On-Premises)](#option-1-docker-compose-recommended-for-on-premises)
   - [Option 2: Direct Deployment (No Docker)](#option-2-direct-deployment-no-docker)
   - [Option 3: Kubernetes](#option-3-kubernetes)
   - [Option 4: AWS ECS](#option-4-aws-ecs)
5. [Database Setup](#database-setup)
6. [Reverse Proxy & SSL](#reverse-proxy--ssl)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer / Nginx                    │
│                    (SSL Termination, Port 443/80)                │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      ▼                       ▼
         ┌────────────────────┐   ┌────────────────────┐
         │   Frontend (React) │   │  Backend (FastAPI) │
         │     Port 80/3000   │   │    Port 8000       │
         └────────────────────┘   └─────────┬──────────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      │                     │                     │
                      ▼                     ▼                     ▼
         ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
         │    PostgreSQL      │ │      Redis         │ │   SMTP Server    │
         │    Port 5432       │ │    Port 6379       │ │   (External)     │
         └────────────────────┘ └────────────────────┘ └──────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + Vite | User interface |
| Backend | Python FastAPI | REST API |
| Database | PostgreSQL 14+ | Data persistence |
| Cache | Redis (optional) | Session caching |
| Reverse Proxy | Nginx | SSL, load balancing |

---

## Prerequisites

### Minimum Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB | 50 GB SSD |
| OS | Ubuntu 20.04+ / CentOS 8+ / RHEL 8+ | Ubuntu 22.04 LTS |

### Required Software

```bash
# For Docker deployment
- Docker 20.10+
- Docker Compose 2.0+

# For direct deployment
- Python 3.11+
- Node.js 18+ (for building frontend)
- PostgreSQL 14+
- Nginx 1.18+

# Optional
- Redis 6+
- Certbot (for SSL)
```

---

## Environment Variables

### Backend Environment Variables

Create `/opt/itsm/backend/.env` or set as system environment variables:

```bash
# ===========================================
# DATABASE (Required)
# ===========================================
DATABASE_URL=postgresql://itsm_user:YOUR_SECURE_PASSWORD@localhost:5432/itsm_db

# ===========================================
# SECURITY (Required - Generate secure keys!)
# ===========================================
# Generate with: openssl rand -hex 32
SECRET_KEY=your-super-secret-key-minimum-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ===========================================
# CORS (Required)
# ===========================================
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ===========================================
# EMAIL (Required for notifications)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME=ITSM Support

# ===========================================
# APPLICATION (Optional)
# ===========================================
APP_NAME=ITSM Platform
APP_VERSION=1.0.0
ENVIRONMENT=production
LOG_LEVEL=INFO
TIMEZONE=UTC

# ===========================================
# REDIS (Optional - for caching)
# ===========================================
REDIS_URL=redis://localhost:6379/0

# ===========================================
# FILE STORAGE (Optional)
# ===========================================
# For AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET_NAME=

# For local storage
UPLOAD_DIR=/opt/itsm/uploads
```

### Frontend Environment Variables

Create during build or in `/opt/itsm/frontend/.env`:

```bash
# API URL (Required)
VITE_API_URL=https://your-domain.com/api/v1

# Or for same-domain deployment
VITE_API_URL=/api/v1
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended for On-Premises)

This is the simplest deployment method for on-premises VMs.

#### Step 1: Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Step 2: Create Directory Structure

```bash
sudo mkdir -p /opt/itsm
cd /opt/itsm
```

#### Step 3: Create docker-compose.yml

```yaml
# /opt/itsm/docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    container_name: itsm-postgres
    restart: always
    environment:
      POSTGRES_USER: itsm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: itsm_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U itsm_user -d itsm_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - itsm-network

  # Redis Cache (Optional)
  redis:
    image: redis:7-alpine
    container_name: itsm-redis
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - itsm-network

  # Backend API
  backend:
    image: itsm-backend:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: itsm-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://itsm_user:${DB_PASSWORD:-changeme}@postgres:5432/itsm_db
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_TLS=${SMTP_TLS:-true}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - EMAIL_FROM=${EMAIL_FROM}
      - EMAIL_FROM_NAME=${EMAIL_FROM_NAME:-ITSM}
      - REDIS_URL=redis://redis:6379/0
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    volumes:
      - uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - itsm-network

  # Frontend
  frontend:
    image: itsm-frontend:latest
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL:-/api/v1}
    container_name: itsm-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - itsm-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: itsm-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - frontend
      - backend
    networks:
      - itsm-network

volumes:
  postgres_data:
  redis_data:
  uploads:

networks:
  itsm-network:
    driver: bridge
```

#### Step 4: Create Nginx Configuration

```bash
mkdir -p /opt/itsm/nginx/conf.d
```

```nginx
# /opt/itsm/nginx/conf.d/default.conf

upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (uncomment when SSL is configured)
    # return 301 https://$server_name$request_uri;

    # Or serve directly over HTTP (development/internal)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://backend/health;
    }
}

# HTTPS Server (uncomment when SSL is configured)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com;
#
#     ssl_certificate /etc/nginx/ssl/fullchain.pem;
#     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
#     ssl_prefer_server_ciphers off;
#
#     # ... same location blocks as above ...
# }
```

```nginx
# /opt/itsm/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # File upload size
    client_max_body_size 50M;

    include /etc/nginx/conf.d/*.conf;
}
```

#### Step 5: Create .env file

```bash
# /opt/itsm/.env

# Database
DB_PASSWORD=your-secure-database-password

# Security
SECRET_KEY=your-64-character-secret-key-generate-with-openssl-rand-hex-32

# CORS
ALLOWED_ORIGINS=https://your-domain.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME=ITSM Support

# Frontend
VITE_API_URL=https://your-domain.com/api/v1
```

#### Step 6: Clone and Deploy

```bash
cd /opt/itsm

# Clone the repository
git clone https://github.com/your-org/itsm-platform.git .

# Or copy files from release

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

#### Step 7: Initialize Database

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create initial admin user (if needed)
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@your-domain.com',
    hashed_password=get_password_hash('AdminPassword123!'),
    full_name='System Administrator',
    is_superuser=True,
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created')
"
```

---

### Option 2: Direct Deployment (No Docker)

For environments where Docker is not available.

#### Step 1: Install Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip \
    postgresql postgresql-contrib nginx redis-server \
    nodejs npm git curl

# CentOS/RHEL
sudo dnf install -y python3.11 python3-pip postgresql-server \
    postgresql-contrib nginx redis nodejs npm git curl
```

#### Step 2: Setup PostgreSQL

```bash
# Initialize database (CentOS/RHEL only)
sudo postgresql-setup --initdb

# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER itsm_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE itsm_db OWNER itsm_user;
GRANT ALL PRIVILEGES ON DATABASE itsm_db TO itsm_user;
EOF
```

#### Step 3: Setup Backend

```bash
# Create application directory
sudo mkdir -p /opt/itsm
sudo chown $USER:$USER /opt/itsm
cd /opt/itsm

# Clone repository
git clone https://github.com/your-org/itsm-platform.git .

# Setup Python virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
nano .env

# Run migrations
alembic upgrade head
```

#### Step 4: Setup Backend Service

```bash
# /etc/systemd/system/itsm-backend.service

[Unit]
Description=ITSM Backend API
After=network.target postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/opt/itsm/backend
Environment="PATH=/opt/itsm/backend/venv/bin"
EnvironmentFile=/opt/itsm/backend/.env
ExecStart=/opt/itsm/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable itsm-backend
sudo systemctl start itsm-backend

# Check status
sudo systemctl status itsm-backend
```

#### Step 5: Build Frontend

```bash
cd /opt/itsm/frontend

# Install dependencies
npm install

# Create .env
echo "VITE_API_URL=/api/v1" > .env

# Build for production
npm run build

# Copy build to nginx directory
sudo mkdir -p /var/www/itsm
sudo cp -r dist/* /var/www/itsm/
sudo chown -R www-data:www-data /var/www/itsm
```

#### Step 6: Configure Nginx

```nginx
# /etc/nginx/sites-available/itsm

server {
    listen 80;
    server_name your-domain.com;

    root /var/www/itsm;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/itsm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option 3: Kubernetes

For enterprise deployments with Kubernetes.

#### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: itsm
---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: itsm-secrets
  namespace: itsm
type: Opaque
stringData:
  DATABASE_URL: postgresql://itsm_user:password@postgres:5432/itsm_db
  SECRET_KEY: your-secret-key
  SMTP_PASSWORD: your-smtp-password
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: itsm-config
  namespace: itsm
data:
  ALLOWED_ORIGINS: "https://your-domain.com"
  SMTP_HOST: "smtp.gmail.com"
  SMTP_PORT: "587"
  SMTP_TLS: "true"
  SMTP_USER: "your-email@gmail.com"
  EMAIL_FROM: "noreply@your-domain.com"
  ENVIRONMENT: "production"
---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: itsm-backend
  namespace: itsm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: itsm-backend
  template:
    metadata:
      labels:
        app: itsm-backend
    spec:
      containers:
      - name: backend
        image: your-registry/itsm-backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: itsm-config
        - secretRef:
            name: itsm-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: itsm-backend
  namespace: itsm
spec:
  selector:
    app: itsm-backend
  ports:
  - port: 8000
    targetPort: 8000
---
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: itsm-frontend
  namespace: itsm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: itsm-frontend
  template:
    metadata:
      labels:
        app: itsm-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/itsm-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
# k8s/frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: itsm-frontend
  namespace: itsm
spec:
  selector:
    app: itsm-frontend
  ports:
  - port: 80
    targetPort: 80
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: itsm-ingress
  namespace: itsm
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - your-domain.com
    secretName: itsm-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: itsm-backend
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: itsm-frontend
            port:
              number: 80
```

#### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check status
kubectl get all -n itsm

# View logs
kubectl logs -f deployment/itsm-backend -n itsm
```

---

### Option 4: AWS ECS

Current production setup. See `.github/workflows/deploy.yml` for CI/CD configuration.

#### Key AWS Resources Needed

1. **ECR Repositories**: `itsm-backend`, `itsm-frontend`
2. **ECS Cluster**: `itsm-cluster`
3. **ECS Services**: `itsm-backend`, `itsm-frontend-service`
4. **RDS PostgreSQL**: Database
5. **Application Load Balancer**: Traffic routing
6. **Target Groups**: Backend and frontend routing
7. **Security Groups**: Network access control

#### Task Definition Environment Variables

Set these in the ECS Task Definition:

```json
{
  "containerDefinitions": [
    {
      "name": "backend",
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql://..."},
        {"name": "SECRET_KEY", "value": "..."},
        {"name": "ALLOWED_ORIGINS", "value": "https://..."},
        {"name": "SMTP_HOST", "value": "smtp.gmail.com"},
        {"name": "SMTP_PORT", "value": "587"},
        {"name": "SMTP_TLS", "value": "true"},
        {"name": "SMTP_USER", "value": "..."},
        {"name": "SMTP_PASSWORD", "value": "..."},
        {"name": "EMAIL_FROM", "value": "..."}
      ]
    }
  ]
}
```

---

## Database Setup

### PostgreSQL Configuration

```bash
# /etc/postgresql/14/main/postgresql.conf (optimize for production)

# Memory
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 768MB    # 75% of RAM
work_mem = 16MB
maintenance_work_mem = 128MB

# Connections
max_connections = 100

# WAL
wal_level = replica
max_wal_senders = 3

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
```

### Backup Script

```bash
#!/bin/bash
# /opt/itsm/scripts/backup.sh

BACKUP_DIR="/opt/itsm/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="itsm_db"
DB_USER="itsm_user"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

### Cron Job for Backups

```bash
# Add to crontab
0 2 * * * /opt/itsm/scripts/backup.sh >> /var/log/itsm-backup.log 2>&1
```

---

## Reverse Proxy & SSL

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (usually automatic, but verify)
sudo certbot renew --dry-run
```

### SSL with Custom Certificate

```bash
# Copy certificates
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.crt /etc/nginx/ssl/fullchain.pem
sudo cp your-key.key /etc/nginx/ssl/privkey.pem
sudo chmod 600 /etc/nginx/ssl/privkey.pem
```

---

## Post-Deployment

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend
curl http://localhost/

# Database connection
docker-compose exec backend python -c "from app.core.database import engine; print(engine.execute('SELECT 1').fetchone())"
```

### Create Admin User

```bash
# Docker Compose
docker-compose exec backend python scripts/create_admin.py

# Direct deployment
cd /opt/itsm/backend
source venv/bin/activate
python scripts/create_admin.py
```

### Monitoring

#### Basic Monitoring Script

```bash
#!/bin/bash
# /opt/itsm/scripts/health_check.sh

BACKEND_URL="http://localhost:8000/health"
ALERT_EMAIL="admin@your-domain.com"

response=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL)

if [ "$response" != "200" ]; then
    echo "ITSM Backend is DOWN! HTTP $response" | mail -s "ITSM Alert" $ALERT_EMAIL
fi
```

#### Prometheus Metrics (Optional)

The backend exposes metrics at `/metrics` if enabled.

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U itsm_user -h localhost -d itsm_db

# Check DATABASE_URL format
# postgresql://user:password@host:port/database
```

#### 2. CORS Errors

- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check for trailing slashes (should not have them)
- Ensure protocol matches (http vs https)

#### 3. Email Not Sending

```bash
# Test SMTP connection
python -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('your-email@gmail.com', 'your-app-password')
print('SMTP connection successful')
"
```

For Gmail:
- Enable 2FA on Google account
- Generate App Password at https://myaccount.google.com/apppasswords

#### 4. Migrations Failed

```bash
# Check current migration state
alembic current

# Show migration history
alembic history

# Stamp to specific revision (if needed)
alembic stamp head
```

#### 5. Frontend Not Loading

```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify frontend build
ls -la /var/www/itsm/

# Check nginx config
sudo nginx -t
```

### Log Locations

| Component | Log Location |
|-----------|--------------|
| Backend | `/var/log/itsm/backend.log` or `docker-compose logs backend` |
| Nginx | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |
| PostgreSQL | `/var/log/postgresql/postgresql-14-main.log` |
| Systemd | `journalctl -u itsm-backend -f` |

### Support

For issues:
1. Check logs for specific error messages
2. Verify environment variables are set correctly
3. Ensure all services are running
4. Check network connectivity between services

---

## Quick Reference

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build

# Execute command in container
docker-compose exec backend python manage.py [command]

# Database backup
docker-compose exec postgres pg_dump -U itsm_user itsm_db > backup.sql
```

### Systemd Commands

```bash
# Start/Stop/Restart
sudo systemctl start itsm-backend
sudo systemctl stop itsm-backend
sudo systemctl restart itsm-backend

# View status
sudo systemctl status itsm-backend

# View logs
journalctl -u itsm-backend -f

# Enable auto-start
sudo systemctl enable itsm-backend
```

---

## Checklist for New Deployments

- [ ] Server meets minimum requirements
- [ ] PostgreSQL installed and configured
- [ ] Database and user created
- [ ] Backend .env configured
- [ ] Frontend built with correct API URL
- [ ] Nginx configured with SSL
- [ ] Backend service running
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Health check passing
- [ ] Backup script configured
- [ ] Monitoring set up
- [ ] Firewall rules configured
- [ ] DNS pointing to server
