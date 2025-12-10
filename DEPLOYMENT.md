# SupportX ITSM Platform - Complete Deployment Guide

This guide will walk you through deploying the ITSM platform to AWS from scratch, assuming you have no prior experience with Git or AWS.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Understanding the Basics](#understanding-the-basics)
3. [Installing Required Tools](#installing-required-tools)
4. [Git Basics & GitHub Setup](#git-basics--github-setup)
5. [AWS Account Setup](#aws-account-setup)
6. [AWS Infrastructure Setup](#aws-infrastructure-setup)
7. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
8. [Database Setup](#database-setup)
9. [Domain and SSL Setup](#domain-and-ssl-setup)
10. [First Deployment](#first-deployment)
11. [Post-Deployment Setup](#post-deployment-setup)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you'll need:

1. **A Computer with Windows 10/11** (this guide uses Windows commands)
2. **Internet Connection**
3. **Credit/Debit Card** (for AWS account - you'll use Free Tier where possible)
4. **Email Address** (for GitHub and AWS accounts)

---

## Understanding the Basics

### What is Git?
Git is a version control system - it tracks changes to your code. Think of it like "Track Changes" in Microsoft Word, but for code.

### What is GitHub?
GitHub is a website that stores your Git repositories (code projects) online. It's like Google Drive for code.

### What is AWS?
Amazon Web Services (AWS) is a cloud platform that provides servers, databases, and other infrastructure to run your application.

### What is CI/CD?
Continuous Integration/Continuous Deployment - automated processes that test your code and deploy it when you make changes.

### How the Application Works:
```
[Users] → [Frontend (React)] → [Backend (FastAPI)] → [Database (PostgreSQL)]
                                      ↓
                               [Redis (Cache)]
```

---

## Installing Required Tools

### Step 1: Install Git

1. Download Git from: https://git-scm.com/download/windows
2. Run the installer, use all default options
3. Verify installation - open Command Prompt (cmd) and type:
```cmd
git --version
```
You should see something like: `git version 2.43.0.windows.1`

### Step 2: Install AWS CLI

1. Download AWS CLI from: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Verify installation:
```cmd
aws --version
```
You should see something like: `aws-cli/2.15.0 Python/3.11.6`

### Step 3: Install Docker Desktop

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer
3. Restart your computer
4. Open Docker Desktop and accept the terms
5. Verify installation:
```cmd
docker --version
```

### Step 4: Install Node.js

1. Download Node.js 20 LTS from: https://nodejs.org/
2. Run the installer
3. Verify installation:
```cmd
node --version
npm --version
```

### Step 5: Install Python

1. Download Python 3.11+ from: https://www.python.org/downloads/
2. **IMPORTANT:** Check "Add Python to PATH" during installation
3. Verify installation:
```cmd
python --version
pip --version
```

---

## Git Basics & GitHub Setup

### Understanding Git Commands

Here are the essential Git commands you'll use:

| Command | What it does | Example |
|---------|--------------|---------|
| `git init` | Initialize a new repository | `git init` |
| `git add` | Stage files for commit | `git add .` (all files) |
| `git commit` | Save changes with a message | `git commit -m "My message"` |
| `git push` | Upload changes to GitHub | `git push origin main` |
| `git pull` | Download changes from GitHub | `git pull origin main` |
| `git status` | See what files changed | `git status` |
| `git branch` | List/create branches | `git branch new-feature` |
| `git checkout` | Switch branches | `git checkout main` |

### Step 1: Configure Git (One-time setup)

Open Command Prompt and run:
```cmd
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"
```

### Step 2: Create GitHub Account

1. Go to https://github.com/signup
2. Create your account with your email
3. Verify your email address

### Step 3: Create a New Repository on GitHub

1. Log in to GitHub
2. Click the **+** icon in the top right → "New repository"
3. Fill in:
   - Repository name: `itsm-platform`
   - Description: `IT Service Management Platform`
   - Visibility: **Private** (recommended for business apps)
4. **DO NOT** check "Add a README file" (we already have code)
5. Click "Create repository"

### Step 4: Push Your Code to GitHub

Open Command Prompt and navigate to your project:
```cmd
cd C:\Users\Hp\Documents\itsm-platform
```

Initialize Git and push to GitHub:
```cmd
:: Initialize git repository (if not already done)
git init

:: Add all files to staging
git add .

:: Create first commit
git commit -m "Initial commit - ITSM Platform"

:: Set the main branch name
git branch -M main

:: Link to your GitHub repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/itsm-platform.git

:: Push code to GitHub
git push -u origin main
```

When prompted, enter your GitHub username and password.

**Note:** GitHub now requires a Personal Access Token instead of password:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with 'repo' scope
3. Use this token as your password

### Step 5: Verify Upload

1. Go to your repository on GitHub
2. You should see all your files there

---

## AWS Account Setup

### Step 1: Create AWS Account

1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Fill in email, password, and account name
4. Choose "Personal" account type
5. Enter payment information (required, but Free Tier is available)
6. Verify your phone number
7. Select "Basic support - Free"

### Step 2: Set Up IAM User for Deployment

**Never use your root account for deployments!** Create a separate user:

1. Log in to AWS Console: https://console.aws.amazon.com/
2. Search for "IAM" in the search bar and click it
3. Click "Users" in the left sidebar
4. Click "Create user"
5. User name: `itsm-deploy`
6. Click "Next"
7. Select "Attach policies directly"
8. Search and select these policies (check the boxes):
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonVPCFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `SecretsManagerReadWrite`
   - `CloudWatchLogsFullAccess`
   - `AmazonRoute53FullAccess` (only if using custom domain)
9. Click "Next" then "Create user"
10. Click on the user name you just created
11. Go to "Security credentials" tab
12. Click "Create access key"
13. Select "Command Line Interface (CLI)"
14. Check "I understand..." and click "Next"
15. Click "Create access key"
16. **IMPORTANT:** Download the CSV file or copy both:
    - Access key ID
    - Secret access key

    **You won't be able to see the secret key again!**

### Step 3: Configure AWS CLI

Open Command Prompt:
```cmd
aws configure
```

Enter when prompted:
- AWS Access Key ID: [paste your Access Key ID]
- AWS Secret Access Key: [paste your Secret Access Key]
- Default region name: `us-east-1`
- Default output format: `json`

### Step 4: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions" in the left sidebar
4. Click "New repository secret"
5. Add these secrets one by one:

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret access key |
| `VITE_API_URL` | Leave empty for now - update after creating Load Balancer (e.g., `http://itsm-alb-xxxxx.us-east-1.elb.amazonaws.com/api/v1`) |

---

## AWS Infrastructure Setup

### Step 1: Create VPC (Virtual Private Cloud)

VPC is your isolated network in AWS.

1. Go to AWS Console → Search "VPC" → Click "VPC"
2. Click "Create VPC"
3. Select "VPC and more" (creates subnets automatically)
4. Configure:
   - Name tag: `itsm`
   - IPv4 CIDR block: `10.0.0.0/16`
   - Number of Availability Zones: `2`
   - Number of public subnets: `2`
   - Number of private subnets: `2`
   - NAT gateways: `In 1 AZ` ($32/month) or `None` (for testing)
   - VPC endpoints: `None`
5. Click "Create VPC"
6. **Note down** the VPC ID (vpc-xxxxxxxxx)

### Step 2: Create ECR Repositories

ECR stores your Docker images.

```cmd
:: Create backend repository
aws ecr create-repository --repository-name itsm-backend --region us-east-1

:: Create frontend repository
aws ecr create-repository --repository-name itsm-frontend --region us-east-1
```

Note down the repository URIs from the output.

### Step 3: Create Security Groups

Security groups control network access.

1. Go to VPC → Security Groups → Create security group
2. Create `itsm-alb-sg` (for Load Balancer):
   - Name: `itsm-alb-sg`
   - Description: `ALB security group`
   - VPC: Select `itsm-vpc`
   - Inbound rules:
     - Type: HTTP, Port: 80, Source: 0.0.0.0/0
     - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
   - Click "Create"

3. Create `itsm-ecs-sg` (for containers):
   - Name: `itsm-ecs-sg`
   - Description: `ECS tasks security group`
   - VPC: Select `itsm-vpc`
   - Inbound rules:
     - Type: Custom TCP, Port: 8000, Source: itsm-alb-sg
     - Type: Custom TCP, Port: 80, Source: itsm-alb-sg
   - Click "Create"

4. Create `itsm-db-sg` (for database):
   - Name: `itsm-db-sg`
   - Description: `RDS security group`
   - VPC: Select `itsm-vpc`
   - Inbound rules:
     - Type: PostgreSQL, Port: 5432, Source: itsm-ecs-sg
   - Click "Create"

### Step 4: Create RDS PostgreSQL Database

1. Go to AWS Console → Search "RDS" → Click "RDS"
2. Click "Create database"
3. Configure:
   - Engine type: PostgreSQL
   - Engine version: PostgreSQL 15.x
   - Templates: **Free tier** (for testing) or **Production** (for live)
   - DB instance identifier: `itsm-db`
   - Master username: `itsm_admin`
   - Master password: Create a strong password (save it!)
   - DB instance class: `db.t3.micro` (Free tier) or `db.t3.small`
   - Storage: 20 GB, Enable storage autoscaling
   - VPC: `itsm-vpc`
   - Subnet group: Create new
   - Public access: **No**
   - VPC security group: `itsm-db-sg`
   - Database name: `itsm`
4. Click "Create database"
5. Wait for status to become "Available" (5-10 minutes)
6. **Note down** the Endpoint (hostname)

### Step 5: Create ElastiCache Redis (Optional but Recommended)

1. Go to AWS Console → Search "ElastiCache"
2. Click "Create cluster" → "Redis OSS caches"
3. Configure:
   - Name: `itsm-redis`
   - Node type: `cache.t3.micro`
   - Number of replicas: 0
   - Subnet group: Create new in itsm-vpc
   - Security group: Create `itsm-redis-sg` allowing port 6379 from itsm-ecs-sg
4. Click "Create"

### Step 6: Create Application Load Balancer

1. Go to EC2 → Load Balancers → Create Load Balancer
2. Choose "Application Load Balancer"
3. Configure:
   - Name: `itsm-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4
   - VPC: `itsm-vpc`
   - Mappings: Select both public subnets
   - Security groups: `itsm-alb-sg`

4. Create Target Groups first:
   - Go to EC2 → Target Groups → Create target group
   - Create `itsm-backend-tg`:
     - Target type: IP
     - Name: `itsm-backend-tg`
     - Protocol: HTTP, Port: 8000
     - VPC: `itsm-vpc`
     - Health check path: `/health`
   - Create `itsm-frontend-tg`:
     - Target type: IP
     - Name: `itsm-frontend-tg`
     - Protocol: HTTP, Port: 80
     - VPC: `itsm-vpc`
     - Health check path: `/`

5. Back to ALB creation:
   - Listeners:
     - HTTP:80 → Forward to `itsm-frontend-tg`
   - Click "Create load balancer"

6. **Note down** the ALB DNS name (itsm-alb-xxxxxxxxx.us-east-1.elb.amazonaws.com)

### Step 7: Create ECS Cluster

1. Go to AWS Console → Search "ECS"
2. Click "Clusters" → "Create cluster"
3. Configure:
   - Cluster name: `itsm-cluster`
   - Infrastructure: AWS Fargate (serverless)
4. Click "Create"

### Step 8: Store Secrets in AWS Secrets Manager

```cmd
:: Generate a secure secret key
:: On Windows, use PowerShell:
powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32,4)"

:: Store database URL (replace with your values)
aws secretsmanager create-secret --name itsm/database-url --secret-string "postgresql://itsm_admin:YOUR_PASSWORD@itsm-db.xxxxx.us-east-1.rds.amazonaws.com:5432/itsm"

:: Store secret key
aws secretsmanager create-secret --name itsm/secret-key --secret-string "YOUR_GENERATED_SECRET_KEY"

:: Store Redis URL (if using ElastiCache)
aws secretsmanager create-secret --name itsm/redis-url --secret-string "redis://itsm-redis.xxxxx.cache.amazonaws.com:6379/0"
```

### Step 9: Create ECS Task Execution Role

1. Go to IAM → Roles → Create role
2. Select "AWS service" → "Elastic Container Service" → "Elastic Container Service Task"
3. Attach policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - `SecretsManagerReadWrite`
4. Role name: `ecsTaskExecutionRole`
5. Create role

### Step 10: Create Task Definitions

Create a file `task-definition-backend.json` on your computer:
```json
{
  "family": "itsm-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "ALLOWED_ORIGINS", "value": "https://yourdomain.com,https://www.yourdomain.com"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:itsm/database-url-XXXXXX"},
        {"name": "SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:itsm/secret-key-XXXXXX"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/itsm-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

Create `task-definition-frontend.json`:
```json
{
  "family": "itsm-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/itsm-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      }
    }
  ]
}
```

Replace `YOUR_ACCOUNT_ID` with your AWS account ID (find it in AWS Console top right).

Register the task definitions:
```cmd
aws ecs register-task-definition --cli-input-json file://task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://task-definition-frontend.json
```

### Step 11: Create ECS Services

```cmd
:: Get your subnet IDs (private subnets)
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-XXXXX" "Name=tag:Name,Values=*private*" --query "Subnets[].SubnetId"

:: Get security group ID
aws ec2 describe-security-groups --filters "Name=group-name,Values=itsm-ecs-sg" --query "SecurityGroups[].GroupId"

:: Get target group ARNs
aws elbv2 describe-target-groups --names itsm-backend-tg --query "TargetGroups[].TargetGroupArn"
aws elbv2 describe-target-groups --names itsm-frontend-tg --query "TargetGroups[].TargetGroupArn"

:: Create backend service (replace subnet-xxx, sg-xxx, and ARN values)
aws ecs create-service ^
  --cluster itsm-cluster ^
  --service-name itsm-backend-service ^
  --task-definition itsm-backend ^
  --desired-count 1 ^
  --launch-type FARGATE ^
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" ^
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=8000"

:: Create frontend service
aws ecs create-service ^
  --cluster itsm-cluster ^
  --service-name itsm-frontend-service ^
  --task-definition itsm-frontend ^
  --desired-count 1 ^
  --launch-type FARGATE ^
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" ^
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=frontend,containerPort=80"
```

---

## CI/CD Pipeline Configuration

### Step 1: Add More GitHub Secrets

Go to GitHub → Repository → Settings → Secrets → Actions

Add these secrets:
| Name | Value |
|------|-------|
| `SUBNET_IDS` | `subnet-xxx,subnet-yyy` (your private subnet IDs) |
| `SECURITY_GROUP_ID` | `sg-xxx` (your itsm-ecs-sg ID) |

### Step 2: Verify CI/CD Files Exist

Your repository should already have these files:
- `.github/workflows/ci.yml` - Runs tests on pull requests
- `.github/workflows/deploy.yml` - Deploys on push to main

---

## Database Setup

### Step 1: Run Initial Migrations

You need to run database migrations from a computer that can reach your RDS database. Since RDS is in a private subnet, you have two options:

**Option A: Use a Bastion Host (More Secure)**

1. Create an EC2 instance in a public subnet
2. Connect to it and run migrations from there

**Option B: Temporarily Allow Public Access (Easier for Initial Setup)**

1. Go to RDS → Your database → Modify
2. Enable "Publicly accessible" temporarily
3. Add your IP to the security group
4. Run migrations locally
5. Disable public access afterward

Run migrations:
```cmd
cd C:\Users\Hp\Documents\itsm-platform\backend

:: Set environment variable (replace with your RDS endpoint)
set DATABASE_URL=postgresql://itsm_admin:YOUR_PASSWORD@itsm-db.xxxxx.us-east-1.rds.amazonaws.com:5432/itsm

:: Activate virtual environment
.\venv\Scripts\activate

:: Run migrations
alembic upgrade head

:: Create super admin user
python create_superadmin.py
```

The `create_superadmin.py` script will prompt you for:
- Admin email
- Admin username
- Admin password (must be strong)
- Admin full name

---

## Domain and SSL Setup

> **No Domain?** Skip to [Deployment Without Domain](#deployment-without-domain-http-only) section below.

### Deployment WITHOUT Domain (HTTP Only)

If you don't have a domain, you can use the Load Balancer's DNS name directly:

1. **Get your ALB DNS name:**
   - Go to EC2 → Load Balancers → Select `itsm-alb`
   - Copy the DNS name (e.g., `itsm-alb-1234567890.us-east-1.elb.amazonaws.com`)

2. **Update GitHub Secret `VITE_API_URL`:**
   ```
   http://itsm-alb-1234567890.us-east-1.elb.amazonaws.com/api/v1
   ```

3. **Configure ALB Listener Rules:**
   - Go to EC2 → Load Balancers → `itsm-alb` → Listeners
   - Edit HTTP:80 listener → View/edit rules
   - Add rule:
     - Condition: Path pattern is `/api/*`
     - Action: Forward to `itsm-backend-tg`
   - Default rule should forward to `itsm-frontend-tg`

4. **Update Backend ALLOWED_ORIGINS:**
   In your ECS task definition or environment, set:
   ```
   ALLOWED_ORIGINS=http://itsm-alb-1234567890.us-east-1.elb.amazonaws.com
   ```

5. **Access your application:**
   ```
   http://itsm-alb-1234567890.us-east-1.elb.amazonaws.com
   ```

> **Note:** Without a domain, you cannot use HTTPS. This is fine for testing but not recommended for production with sensitive data.

---

### Deployment WITH Domain (HTTPS - Recommended for Production)

### Step 1: Get a Domain Name

You can purchase a domain from:
- AWS Route 53 (easiest integration)
- Namecheap
- GoDaddy
- Any domain registrar

### Step 2: Create Hosted Zone in Route 53

1. Go to Route 53 → Hosted zones → Create hosted zone
2. Domain name: `yourdomain.com`
3. Type: Public hosted zone
4. Create

5. If your domain is NOT from Route 53, update nameservers at your registrar to the Route 53 NS records shown

### Step 3: Request SSL Certificate

1. Go to AWS Certificate Manager (ACM)
2. Click "Request certificate"
3. Request a public certificate
4. Domain names:
   - `yourdomain.com`
   - `*.yourdomain.com`
5. Validation method: DNS validation
6. Click "Request"
7. Click "Create records in Route 53" (button appears after request)
8. Wait for status to become "Issued" (can take up to 30 minutes)

### Step 4: Add HTTPS to Load Balancer

1. Go to EC2 → Load Balancers → Select `itsm-alb`
2. Listeners tab → Add listener
3. Protocol: HTTPS, Port: 443
4. Default action: Forward to `itsm-frontend-tg`
5. Security policy: ELBSecurityPolicy-TLS13-1-2-2021-06
6. Certificate: Select your ACM certificate
7. Add

8. Edit HTTP:80 listener:
   - Change action to: Redirect to HTTPS
   - Status code: 301

### Step 5: Create DNS Records

1. Go to Route 53 → Your hosted zone
2. Create record:
   - Record name: (leave empty for root domain)
   - Record type: A
   - Alias: Yes
   - Route traffic to: Application Load Balancer → us-east-1 → itsm-alb
3. Create another record:
   - Record name: `www`
   - Record type: A
   - Alias: Yes → Same as above
4. Create another record:
   - Record name: `api`
   - Record type: A
   - Alias: Yes → Same as above

### Step 6: Configure Backend Routing

Add a listener rule to route API traffic:

1. Go to EC2 → Load Balancers → `itsm-alb` → Listeners
2. Click HTTPS:443 listener → View/edit rules
3. Add rule:
   - Condition: Host header is `api.yourdomain.com`
   - Action: Forward to `itsm-backend-tg`

### Step 7: Update GitHub Secret

Update `VITE_API_URL` secret to your actual API URL:
```
https://api.yourdomain.com/api/v1
```

---

## First Deployment

### Manual Build and Push (First Time)

```cmd
:: Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

:: Build and push backend
cd C:\Users\Hp\Documents\itsm-platform\backend
docker build -t itsm-backend .
docker tag itsm-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-backend:latest

:: Build and push frontend (with API URL)
:: Replace YOUR_ALB_DNS with your actual Load Balancer DNS name
:: Example: itsm-alb-1234567890.us-east-1.elb.amazonaws.com
cd ..\frontend
docker build --build-arg VITE_API_URL=http://YOUR_ALB_DNS/api/v1 -t itsm-frontend .
docker tag itsm-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/itsm-frontend:latest

:: Update ECS services to pull new images
aws ecs update-service --cluster itsm-cluster --service itsm-backend-service --force-new-deployment
aws ecs update-service --cluster itsm-cluster --service itsm-frontend-service --force-new-deployment
```

### Automatic Deployment (Future Changes)

After initial setup, just push to main:
```cmd
git add .
git commit -m "Your changes description"
git push origin main
```

GitHub Actions will automatically:
1. Run tests
2. Build Docker images
3. Push to ECR
4. Deploy to ECS

---

## Post-Deployment Setup

### Step 1: Verify Application is Running

1. Go to ECS → Clusters → itsm-cluster → Services
2. Both services should show "Running" tasks
3. Visit your domain: `https://yourdomain.com`

### Step 2: Login as Super Admin

1. Go to `https://yourdomain.com`
2. Login with the credentials you created in `create_superadmin.py`

### Step 3: Configure System Settings

1. Go to Settings → System Settings
2. Configure:
   - Company name
   - Email settings (SMTP)
   - Timezone
   - Other preferences

### Step 4: Create Additional Users

1. Go to Users
2. Create users for your team with appropriate roles:
   - Admin - Full access
   - Manager - Department oversight
   - Team Lead - Team management
   - Agent - Support staff
   - End User - Regular users

---

## Monitoring and Maintenance

### View Logs

```cmd
:: View backend logs
aws logs tail /ecs/itsm-backend --follow

:: View frontend logs
aws logs tail /ecs/itsm-frontend --follow
```

Or use AWS Console → CloudWatch → Log groups

### Set Up Alerts

1. Go to CloudWatch → Alarms → Create alarm
2. Create alarms for:
   - CPU > 80%
   - Memory > 80%
   - 5xx errors > 10/minute
   - Response time > 3 seconds

### Scale Services

```cmd
:: Scale backend to 2 instances
aws ecs update-service --cluster itsm-cluster --service itsm-backend-service --desired-count 2
```

### Update Application

```cmd
git add .
git commit -m "Description of changes"
git push origin main
:: CI/CD will handle the rest
```

### Database Backups

RDS automatic backups are enabled by default. To restore:
1. Go to RDS → Automated backups
2. Select a backup → Restore to point in time

---

## Troubleshooting

### Common Issues

**1. Task fails to start**
- Check CloudWatch logs for errors
- Verify secrets are configured correctly
- Ensure security groups allow necessary traffic

**2. Database connection failed**
- Verify security group allows port 5432 from ECS
- Check DATABASE_URL is correct
- Verify database is in the same VPC

**3. 502 Bad Gateway**
- Check if backend is healthy (ECS task running)
- Verify target group health checks
- Check backend logs for startup errors

**4. CORS errors**
- Update ALLOWED_ORIGINS environment variable
- Verify frontend is using correct API URL

**5. Cannot push to GitHub**
- Verify you're using Personal Access Token, not password
- Check you have write access to the repository

### Useful Commands

```cmd
:: View ECS service status
aws ecs describe-services --cluster itsm-cluster --services itsm-backend-service

:: View running tasks
aws ecs list-tasks --cluster itsm-cluster

:: Force new deployment
aws ecs update-service --cluster itsm-cluster --service itsm-backend-service --force-new-deployment

:: Rollback to previous version
aws ecs update-service --cluster itsm-cluster --service itsm-backend-service --task-definition itsm-backend:PREVIOUS_VERSION
```

---

## Cost Estimation

Monthly costs (us-east-1, minimal setup):

| Service | Specification | Monthly Cost |
|---------|---------------|--------------|
| ECS Fargate | 2 tasks (backend + frontend) | ~$30 |
| RDS | db.t3.micro | ~$15 (or free tier) |
| ALB | Application Load Balancer | ~$18 |
| ECR | Container storage | ~$1 |
| Route 53 | Hosted zone + queries | ~$1 |
| NAT Gateway | (if used) | ~$32 |
| **Total** | | **~$65-100/month** |

### Cost Optimization Tips

1. Use RDS Free Tier for first 12 months
2. Skip NAT Gateway for testing (tasks won't have internet access)
3. Use Fargate Spot for non-critical workloads
4. Scale down to 1 task during low traffic
5. Reserve capacity for predictable workloads

---

## Security Checklist

- [ ] IAM user has minimal required permissions
- [ ] Database is not publicly accessible
- [ ] Secrets stored in AWS Secrets Manager
- [ ] SSL certificate configured
- [ ] Security groups properly configured
- [ ] Branch protection enabled on GitHub
- [ ] Environment variables don't contain secrets in code

---

## Next Steps

After successful deployment:

1. Set up monitoring dashboards
2. Configure email notifications
3. Create operational runbooks
4. Plan disaster recovery
5. Document your specific configurations

---

**Congratulations!** Your ITSM platform is now deployed on AWS with CI/CD!

For support:
- Check application logs in CloudWatch
- Review GitHub Actions for deployment issues
- Consult AWS documentation for infrastructure questions
