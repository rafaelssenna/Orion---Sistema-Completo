"""Add new user roles: marketing, administrativo, designer

Revision ID: add_new_roles_001
Revises:
Create Date: 2024-01-27

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_new_roles_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add new enum values to the userrole type
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'marketing'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'administrativo'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'designer'")


def downgrade():
    # PostgreSQL doesn't support removing enum values directly
    # Would need to recreate the enum type to remove values
    pass
