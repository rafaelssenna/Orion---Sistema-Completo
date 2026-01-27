from datetime import datetime
from typing import Optional


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Formatar datetime para string ISO"""
    if dt is None:
        return None
    return dt.isoformat()


def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Converter string ISO para datetime"""
    if dt_str is None:
        return None
    return datetime.fromisoformat(dt_str)
