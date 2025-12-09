"""
Script to add date override columns to tickets table
Run this script to add the new columns for ticket date overrides

Usage:
    cd backend
    python scripts/add_date_override_columns.py
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine, SessionLocal

def add_columns():
    """Add date override columns to tickets table"""
    db = SessionLocal()

    try:
        # Check if columns already exist
        check_sql = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name IN (
            'created_at_override',
            'resolved_at_override',
            'closed_at_override',
            'override_reason',
            'override_by_id'
        );
        """

        result = db.execute(text(check_sql))
        existing_columns = [row[0] for row in result.fetchall()]

        columns_to_add = []

        if 'created_at_override' not in existing_columns:
            columns_to_add.append("ADD COLUMN created_at_override TIMESTAMP WITH TIME ZONE NULL")

        if 'resolved_at_override' not in existing_columns:
            columns_to_add.append("ADD COLUMN resolved_at_override TIMESTAMP WITH TIME ZONE NULL")

        if 'closed_at_override' not in existing_columns:
            columns_to_add.append("ADD COLUMN closed_at_override TIMESTAMP WITH TIME ZONE NULL")

        if 'override_reason' not in existing_columns:
            columns_to_add.append("ADD COLUMN override_reason TEXT NULL")

        if 'override_by_id' not in existing_columns:
            columns_to_add.append("ADD COLUMN override_by_id INTEGER NULL REFERENCES users(id)")

        if columns_to_add:
            alter_sql = f"ALTER TABLE tickets {', '.join(columns_to_add)};"
            db.execute(text(alter_sql))
            db.commit()
            print(f"Successfully added {len(columns_to_add)} columns to tickets table")
            for col in columns_to_add:
                print(f"  - {col}")
        else:
            print("All date override columns already exist")

        return True

    except Exception as e:
        print(f"Error adding columns: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Adding date override columns to tickets table...")
    success = add_columns()
    if success:
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed!")
        sys.exit(1)
