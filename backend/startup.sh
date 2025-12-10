#!/bin/sh
set -e

echo "=== Starting ITSM Backend ==="
echo "Running database migrations..."

# Check if alembic_version table exists and has a version
CURRENT_VERSION=$(python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version_num FROM alembic_version LIMIT 1'))
        row = result.fetchone()
        print(row[0] if row else '')
except Exception as e:
    print('')
" 2>/dev/null || echo "")

if [ -z "$CURRENT_VERSION" ]; then
    echo "No alembic version found. Checking if tables exist..."

    # Check if sla_policies table exists (one of the first tables created)
    TABLE_EXISTS=$(python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sla_policies')\"))
        exists = result.fetchone()[0]
        print('yes' if exists else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

    if [ "$TABLE_EXISTS" = "yes" ]; then
        echo "Tables exist but no alembic version. Checking which columns exist..."

        # Check if first_response_at column exists (added in 20251209_first_response)
        FIRST_RESPONSE_EXISTS=$(python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(\"SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'first_response_at')\"))
        exists = result.fetchone()[0]
        print('yes' if exists else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

        # Check if live_conversations table exists (added in live_chat_001)
        LIVE_CHAT_EXISTS=$(python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'live_conversations')\"))
        exists = result.fetchone()[0]
        print('yes' if exists else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

        # Check if projects table exists (added in project_mgmt_001)
        PROJECTS_EXISTS=$(python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects')\"))
        exists = result.fetchone()[0]
        print('yes' if exists else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

        echo "first_response_at column exists: $FIRST_RESPONSE_EXISTS"
        echo "live_conversations table exists: $LIVE_CHAT_EXISTS"
        echo "projects table exists: $PROJECTS_EXISTS"

        # Determine the correct stamp point based on what exists
        if [ "$PROJECTS_EXISTS" = "yes" ]; then
            echo "Projects table exists. Stamping at project_mgmt_001 (latest)"
            alembic stamp project_mgmt_001
        elif [ "$LIVE_CHAT_EXISTS" = "yes" ]; then
            echo "Live chat tables exist. Stamping at live_chat_001"
            alembic stamp live_chat_001
        elif [ "$FIRST_RESPONSE_EXISTS" = "yes" ]; then
            echo "first_response_at exists. Stamping at add_ticket_date_overrides"
            alembic stamp add_ticket_date_overrides
        else
            echo "Stamping at ticket_assets_001"
            alembic stamp ticket_assets_001
        fi
        echo "Database stamped successfully"
    fi
fi

echo "Current alembic version: $CURRENT_VERSION"
echo "Running alembic upgrade head..."
alembic upgrade head

echo "Migrations complete. Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
