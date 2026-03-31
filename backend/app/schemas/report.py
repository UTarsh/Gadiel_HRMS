from typing import Any, Dict, List

from pydantic import BaseModel


class MonthlyReportOut(BaseModel):
    month: int
    year: int
    tasks: Dict[str, Any]
    attendance: Dict[str, Any]
    leaves: Dict[str, Any]
    payroll: Dict[str, Any]
    employee_snapshot: List[Dict[str, Any]]
