# backend/state.py
from typing import Dict, Any, List, TypedDict

class AgentState(TypedDict):
    # Data Layer
    file_name: str
    raw_data_summary: str
    structured_records_count: int
    
    # Analysis Layer
    identified_problems: List[Dict[str, Any]]
    chart_configuration: Dict[str, Any]  # Passed directly to React Recharts
    
    # Strategy Layer
    marketing_strategy: Dict[str, Any]
    validation_feedback: str
    validation_passed: bool
    
    # Execution Layer
    predicted_roi: Dict[str, Any]
    final_campaign_timeline: List[Dict[str, Any]]
    generated_assets: List[Dict[str, str]]