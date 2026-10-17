"""Generate portable request schemas from the authoritative Pydantic models."""
import json
from pathlib import Path
from app.main import app
from app.models import DatasetSummary, CandidateRequest, AssessmentFinding, CandidateSummary

target = Path(__file__).resolve().parent
for filename, model in {"dataset.schema.json": DatasetSummary, "config.schema.json": CandidateRequest,
                        "assessment.schema.json": AssessmentFinding, "candidate.schema.json": CandidateSummary}.items():
    (target / filename).write_text(json.dumps(model.model_json_schema(), indent=2), encoding="utf-8")
(target / "openapi.json").write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
