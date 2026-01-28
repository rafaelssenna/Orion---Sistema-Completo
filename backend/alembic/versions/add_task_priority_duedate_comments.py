"""add_task_priority_duedate_comments

Revision ID: add_task_features_001
Revises: 90de70892894
Create Date: 2026-01-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_task_features_001'
down_revision: Union[str, None] = '90de70892894'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create taskpriority enum type
    taskpriority_enum = sa.Enum('baixa', 'media', 'alta', 'urgente', name='taskpriority')
    taskpriority_enum.create(op.get_bind(), checkfirst=True)

    # Add priority and due_date columns to tasks
    op.add_column('tasks', sa.Column('priority', sa.Enum('baixa', 'media', 'alta', 'urgente', name='taskpriority'), nullable=True))
    op.add_column('tasks', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))

    # Set default value for existing rows
    op.execute("UPDATE tasks SET priority = 'media' WHERE priority IS NULL")

    # Create task_comments table
    op.create_table('task_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_comments_id'), 'task_comments', ['id'], unique=False)


def downgrade() -> None:
    # Drop task_comments table
    op.drop_index(op.f('ix_task_comments_id'), table_name='task_comments')
    op.drop_table('task_comments')

    # Remove columns from tasks
    op.drop_column('tasks', 'due_date')
    op.drop_column('tasks', 'priority')

    # Drop the enum type
    sa.Enum(name='taskpriority').drop(op.get_bind(), checkfirst=True)
