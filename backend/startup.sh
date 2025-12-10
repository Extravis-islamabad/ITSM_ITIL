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

echo "Current alembic version from DB: $CURRENT_VERSION"

# Always check actual schema state to determine correct version
echo "Checking actual database schema state..."

# Check if first_response_at column exists
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

# Check if live_conversations table exists
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

# Check if projects table exists
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

echo "Schema state: first_response_at=$FIRST_RESPONSE_EXISTS, live_conversations=$LIVE_CHAT_EXISTS, projects=$PROJECTS_EXISTS"

# Determine the correct version based on actual schema
if [ "$PROJECTS_EXISTS" = "yes" ]; then
    CORRECT_VERSION="project_mgmt_001"
elif [ "$LIVE_CHAT_EXISTS" = "yes" ]; then
    CORRECT_VERSION="live_chat_001"
elif [ "$FIRST_RESPONSE_EXISTS" = "yes" ]; then
    CORRECT_VERSION="add_ticket_date_overrides"
else
    CORRECT_VERSION="ticket_assets_001"
fi

echo "Correct version based on schema: $CORRECT_VERSION"

# If current version doesn't match what schema shows, fix it
if [ "$CURRENT_VERSION" != "$CORRECT_VERSION" ]; then
    echo "Version mismatch! Updating alembic_version to $CORRECT_VERSION..."
    python -c "
from sqlalchemy import create_engine, text
from app.core.config import settings
engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    # Delete existing version
    conn.execute(text('DELETE FROM alembic_version'))
    # Insert correct version
    conn.execute(text(\"INSERT INTO alembic_version (version_num) VALUES ('$CORRECT_VERSION')\"))
    conn.commit()
    print('Alembic version updated successfully')
"
fi

# Run migrations
echo "Running alembic upgrade head..."
alembic upgrade head

echo "Migrations complete. Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
