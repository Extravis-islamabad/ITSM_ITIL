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
        echo "Tables exist but no alembic version. Stamping database..."
        # Stamp with the last known good migration before the new ones
        # This tells alembic these migrations are already applied
        alembic stamp ticket_assets_001
        echo "Database stamped with ticket_assets_001"
    fi
fi

echo "Current alembic version: $CURRENT_VERSION"
echo "Running alembic upgrade head..."
alembic upgrade head

echo "Migrations complete. Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
