"""merge tindak lanjut laporan dan hapus perlu_info_tambahan

Revision ID: ba82717fb517
Revises: a1b2c3d4e5f6, e5f6a7b8c9d0
Create Date: 2026-11-04 16:38:32.302478

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba82717fb517'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'e5f6a7b8c9d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
