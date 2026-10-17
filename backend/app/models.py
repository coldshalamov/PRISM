"""Validated HTTP contract; engine modules use plain dictionary equivalents."""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ColumnSpec(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    dtype: Literal["integer", "float", "category", "date", "text", "boolean"]
    role: Literal["direct_identifier", "quasi_identifier", "sensitive", "research_target", "other"]
    unit: str | None = None
    importance: float = Field(default=1, ge=0, le=100)
    sensitivityReason: str | None = None
    generalization: dict[str, Any] | None = None


class ResearchQuery(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    type: Literal["group_rate", "group_count", "group_mean", "correlation", "difference_in_rates"]
    groupBy: list[str] = Field(default_factory=list, max_length=5)
    target: str | None = None
    filter: dict[str, Any] = Field(default_factory=dict)
    positiveValue: Any = 1
    weight: float = Field(default=1, gt=0, le=100)
    tolerance: float = Field(default=0.05, gt=0, le=1e6)
    minCohort: int = Field(default=5, ge=1, le=100000)


class TransformStep(StrictModel):
    method: str = Field(min_length=1, max_length=40)
    columns: list[str] = Field(default_factory=list, max_length=80)
    params: dict[str, Any] = Field(default_factory=dict)


class ThreatWorkload(StrictModel):
    qi: list[str] | None = Field(default=None, max_length=20)
    sensitive: list[str] | None = Field(default=None, max_length=10)
    workload: list[ResearchQuery] | None = Field(default=None, max_length=20)
    membershipKnown: bool | None = None
    entityColumn: str | None = None
    oneRowPerPersonConfirmed: bool | None = None


class CandidateRequest(ThreatWorkload):
    datasetId: str
    steps: list[TransformStep] = Field(max_length=64)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
    name: str | None = Field(default=None, max_length=100)


class AssessmentRequest(ThreatWorkload):
    candidateId: str


class SchemaRequest(StrictModel):
    schema_: list[ColumnSpec] = Field(alias="schema", min_length=1, max_length=80)
    entityColumn: str | None = None
    oneRowPerPersonConfirmed: bool | None = None


class SearchConstraints(StrictModel):
    minK: int = Field(default=1, ge=1, le=100000)
    maxSuppression: float = Field(default=0.1, ge=0, le=1)
    maxUnique: float = Field(default=1, ge=0, le=1)
    maxLoss: float = Field(default=1, ge=0, le=1)


class SearchRequest(ThreatWorkload):
    datasetId: str
    maxCandidates: int = Field(default=24, ge=1, le=80)
    constraints: SearchConstraints | None = None


class AuditRequest(ThreatWorkload):
    originalDatasetId: str
    protectedDatasetId: str
    mode: Literal["unpaired_microdata", "paired_row_preserving", "synthetic"] = "unpaired_microdata"
    columnMapping: dict[str, str] = Field(default_factory=dict)
    lineage: list[int] | None = Field(default=None, max_length=100000)


class ReportRequest(StrictModel):
    candidateId: str
    format: Literal["json", "html", "recipe", "csv"] = "html"
    acknowledgments: list[Literal["authority", "limitations", "reviewed"]] = Field(default_factory=list, max_length=3)


class CandidateRecipe(StrictModel):
    steps: list[TransformStep]
    seed: int = 42
    version: str
    releaseMode: Literal["row_release", "synthetic_release", "aggregate_query", "controlled_access"]
    provenance: str | None = None


class AssessmentFinding(StrictModel):
    model_config = ConfigDict(extra="allow", allow_inf_nan=False)
    id: str
    attackId: str
    status: Literal["implemented", "partial", "unsupported", "not_applicable", "error"]
    applicability: str = ""
    assumptions: list[str] = Field(default_factory=list)
    narrative: str
    caveats: list[str] = Field(default_factory=list)
    numerator: float | None = None
    denominator: float | None = None
    metricValue: float | None = None
    metricUnit: str | None = None
    ci95: tuple[float, float] | None = None
    baseline: float | None = None
    severity: Literal["info", "low", "medium", "high"] | None = None
    sourceId: str | None = None


class DatasetSummary(StrictModel):
    datasetId: str
    name: str
    rowCount: int
    schema_: list[ColumnSpec] = Field(alias="schema")
    preview: list[dict[str, Any]]
    defaultSteps: list[TransformStep]
    defaultWorkload: list[ResearchQuery]
    synthetic: bool
    rowUnit: dict[str, Any]


class CandidateSummary(StrictModel):
    # Engine-specific diagnostics evolve independently; required HTTP fields are
    # frozen while additional documented diagnostics remain serializable.
    model_config = ConfigDict(extra="allow", allow_inf_nan=False)
    candidateId: str
    datasetId: str
    name: str
    rowCount: int
    recipe: CandidateRecipe
    preview: list[dict[str, Any]]
    columns: list[str]
    risk: dict[str, Any]
    utility: dict[str, Any]
    constraints: list[dict[str, Any]]
    frontierMember: bool
    alignment: Literal["verified", "unpaired"]
    createdAt: str
