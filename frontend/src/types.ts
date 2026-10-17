export type Role = 'direct_identifier' | 'quasi_identifier' | 'sensitive' | 'research_target' | 'other';
export type Dtype = 'integer' | 'float' | 'category' | 'date' | 'text' | 'boolean';
export type ReleaseMode = 'row_release' | 'synthetic_release' | 'aggregate_query' | 'controlled_access';
export type AssessmentStatus = 'implemented' | 'partial' | 'unsupported' | 'not_applicable' | 'not_assessed' | 'insufficient_data' | 'unavailable' | 'error';
export type Row = Record<string, unknown>;

export interface ColumnSpec {
  name: string;
  dtype: Dtype;
  role: Role;
  unit?: string | null;
  importance: number;
  sensitivityReason?: string | null;
}

export interface TransformStep { method: string; columns: string[]; params: Record<string, unknown> }

export type QueryType = 'group_rate' | 'group_count' | 'group_mean' | 'correlation' | 'difference_in_rates';
export interface ResearchQuery {
  id: string;
  type: QueryType;
  groupBy?: string[];
  target?: string | null;
  filter?: Record<string, unknown>;
  positiveValue?: unknown;
  weight: number;
  tolerance: number;
  minCohort: number;
}

export interface RowUnit { entityColumn: string | null; oneRowPerPersonConfirmed: boolean; repeatedEntitiesDetected: boolean }

/* Field semantics describe what a column means. They never change values or statistical roles, and a meaning is not a vulnerability.
   properties, privacyRoles, alternatives, validation and lineage are service-defined and may be strings, lists or nested objects:
   they are typed `unknown` on purpose and must be summarised, never rendered as React children. */
export interface SemanticField {
  fieldId: string;
  column: string;
  primaryType: string;
  family?: string | null;
  properties?: unknown;
  privacyRoles?: unknown;
  alternatives?: unknown;
  source?: string | null;
  model?: string | null;
  probability?: number | null;
  reviewStatus?: string | null;
  validation?: unknown;
  lineage?: unknown;
}
export interface SemanticMetadataPreview {
  datasetId: string; semanticRevision: string; metadataDigest: string;
  provider: string; model: string; fieldCount: number;
  metadata: { columns: Record<string, unknown>[]; neighboringLabels: string[]; [key: string]: unknown };
}
export interface SemanticProvider { status: string; calls: number; error?: unknown; message?: unknown; [key: string]: unknown }
export interface DatasetSemantics { version: string; revision?: string; fields: SemanticField[]; provider?: SemanticProvider; [key: string]: unknown }
export interface SemanticOntology {
  version: string;
  families: { id: string; label: string; groups?: unknown[] }[];
  types: { id: string; label: string; family: string; parent?: string; aliases?: string[] }[];
  propertyEnums?: Record<string, string[]>;
  privacyRoles?: unknown;
}
export type SemanticOverride = string | { primaryType: string; reviewStatus: 'confirmed' };
export type SemanticOverrides = Record<string, SemanticOverride>;

export interface Dataset {
  rowUnit?: RowUnit;
  datasetId: string;
  name: string;
  rowCount: number;
  schema: ColumnSpec[];
  preview: Row[];
  defaultSteps: TransformStep[];
  defaultWorkload: ResearchQuery[];
  synthetic?: boolean;
  semantic?: DatasetSemantics;
}

export interface Finding {
  id: string;
  attackId?: string;
  status: AssessmentStatus;
  applicability?: string;
  assumptions?: string[];
  narrative: string;
  caveats?: string[];
  numerator?: number;
  denominator?: number;
  metricValue?: number | null;
  metricUnit?: string;
  baseline?: number;
  severity?: 'info' | 'low' | 'medium' | 'high' | string;
  sourceId?: string;
  source?: string;
  algorithm?: string;
  columns?: string[];
  matchedTargets?: number;
  ambiguousTargets?: number;
  unmatchedTargets?: number;
  uniqueCandidateTargets?: number;
  uniqueIncorrectMatches?: number;
  suppressedTargets?: number;
  expectedCorrectRandomTiebreakFraction?: number;
  coverage?: Record<string, unknown>;
  baselineDefinition?: string;
}

export interface ExposureSubset { columns: string[]; unique_fraction: number; k_min: number; p_guess?: number }
export interface HistogramBin { known_fields: number | null; count: number }
export interface ExposureCoverage {
  evaluated?: number; total_possible?: number; skipped?: number; exhaustive?: boolean; subset_cap?: number;
  max_subset_size?: number; histogram_interpretation?: string; not_distinguished?: string; full_qi_evaluated?: boolean;
}
export interface SensitiveResult {
  column: string;
  status: AssessmentStatus | string;
  reason?: string;
  l_min?: number;
  p_guess?: number;
  baseline?: number;
  guess_advantage?: number;
  conditional_entropy_bits?: number;
  homogeneous_classes?: number;
  homogeneous_rows?: number;
  homogeneous_row_fraction?: number;
  t_max?: number;
  t_distance?: string;
  estimation?: string;
  limitation?: string;
}
export interface RiskMetrics {
  sample_unique: number;
  k_min: number;
  p_guess: number;
  row_entropy_bits: number;
  distinct_groups: number;
  prior_row_entropy_bits?: number;
  sample_information_reduction_bits?: number;
  sensitive_guess_advantage: number;
  /** Present only when exact linkage replay applies; null means not applicable, never zero. */
  verified_unique_correct_matches?: number | null;
  verified_linkage_rate?: number | null;
  [key: string]: number | null | undefined;
}
/* Frozen with a candidate snapshot. `measured` null (or a null entry) means the quantity was not measured, never zero. */
export type SemanticSeverity = 'Mild' | 'Moderate' | 'Severe' | 'Needs Assessment';
export interface SemanticFinding {
  id: string;
  attackId: string;
  title: string;
  status: 'implemented' | 'unsupported' | 'not_applicable';
  severity: SemanticSeverity;
  columns: string[];
  explanation: string;
  attackerNeeds: string;
  measured: Record<string, number | string | null> | null;
  mitigations: string[];
  utilityRisks: string[];
  limitations: string[];
  sourceIds: string[];
}
export interface CandidateSemantic {
  version: string;
  semanticRevision?: string;
  findings: SemanticFinding[];
  lineage?: unknown;
  coverage?: unknown;
  limitations?: string[];
}
export interface RiskResult {
  metrics: RiskMetrics;
  semantic?: CandidateSemantic;
  findings: Finding[];
  exposure: { subsets: ExposureSubset[]; minimal_histogram?: HistogramBin[]; coverage?: ExposureCoverage };
  sensitive?: SensitiveResult[];
  qi?: string[];
  sensitive_targets?: string[];
  removed_qi?: string[];
  row_count?: number;
  assumptions?: string[];
  limitations?: string[];
  assessment?: string;
  release_cleared?: boolean;
  declared_qi?: string[];
  removed_sensitive?: string[];
  threat_context?: ThreatContext;
}
export interface ThreatContext {
  membershipKnown: boolean;
  entityColumn?: string | null;
  oneRowPerPersonConfirmed?: boolean;
  repeatedEntitiesDetected?: boolean;
}

export interface CohortRecord {
  group: Record<string, unknown>;
  value: number | null;
  count: number;
  missing?: number;
  ci95?: [number, number] | null;
  cohorts?: CohortRecord[];
  direction?: { minus: Record<string, unknown>; plus: Record<string, unknown> };
}
export interface UtilityQuery {
  id: string;
  label: string;
  type?: QueryType;
  original: unknown;
  protected: unknown;
  originalDetails?: CohortRecord[];
  protectedDetails?: CohortRecord[];
  error: number | null;
  tolerance: number;
  weight?: number;
  pass: boolean;
  issues?: string[];
  warnings?: string[];
  normalizedError?: number;
  minCohort?: number;
  signFlip?: boolean;
  status?: 'implemented' | 'unavailable' | string;
  /** Optional evaluator fields for interval filters that straddle a threshold. */
  filterCoverage?: unknown;
  inclusionBounds?: unknown;
  /** Set when a pound-source mean was compared in kilograms: show these units, never the source label beside kg values. */
  inputUnit?: string;
  inputTolerance?: number;
  comparisonUnit?: string;
  unitStatus?: string;
}
export interface DistributionBin { label: string; count: number; fraction: number; lower?: number; upper?: number; tail?: boolean }
export interface Distribution {
  column: string;
  type: 'numeric' | 'categorical' | string;
  original: DistributionBin[];
  protected: DistributionBin[];
  missing_original?: number;
  missing_protected?: number;
  total_original?: number;
  total_protected?: number;
  dropped?: boolean;
  mean_original?: number | null;
  mean_protected?: number | null;
  midpoint_approximation?: boolean;
  categories_total?: number;
  categories_shown?: number;
  /** Optional: comparison at a shared hierarchy (e.g. ZIP prefix) and the raw lexical distance. */
  semanticComparison?: unknown;
  lexicalTv?: number | null;
  lexicalTvDefinition?: string;
  unit?: string | null;
  status?: string;
  unitComparison?: unknown;
  limitation?: string;
}
export interface Correlation {
  x: string; y: string; original: number | null; protected: number | null; sign_flip: boolean;
  n_original?: number; n_protected?: number; midpoint_approximation?: boolean;
}
export interface UtilityResult {
  loss: number | null;
  queries: UtilityQuery[];
  distributions: Distribution[];
  correlations: Correlation[];
  warnings?: string[];
  loss_definition?: string;
  alignment?: string;
  rows_original?: number;
  rows_protected?: number;
  /** Optional aggregate subgroup retention / missingness / query effects. */
  subgroups?: SubgroupItem[];
  worstSubgroup?: WorstSubgroup;
  unitComparisons?: unknown[];
  workloadCoverageComplete?: boolean;
}
export interface SubgroupItem {
  group: Record<string, unknown>;
  status: string;
  minSupport: number;
  countOriginal: number;
  countProtected: number;
  observedCountProtected: number | null;
  cohortCountDifference: number | null;
  retainedCount: number | null;
  retention: number | null;
  alignment: string;
  reason?: string;
  missingness: { column: string; original: number; protected: number | null; delta: number | null; dropped: boolean }[];
  queries: Pick<UtilityQuery, 'id' | 'type' | 'original' | 'protected' | 'error' | 'tolerance' | 'pass' | 'issues' | 'status' | 'normalizedError' | 'signFlip'>[];
  correlations: { queryId: string; original: unknown; protected: unknown; sign_flip: boolean }[];
}
export interface WorstSubgroup {
  assessed: number;
  insufficientEvidence: number;
  unavailableQueries: number;
  worstRetention: { group: Record<string, unknown>; retention: number; countOriginal: number; retainedCount: number; status: string } | null;
  worstQuery: ({ group: Record<string, unknown> } & Partial<UtilityQuery>) | null;
  worstMissingness: ({ group: Record<string, unknown> } & Record<string, unknown>) | null;
  coverage: { cap: number; evaluated: number; skipped: { columns: string[]; reason: string }[]; definition: string };
}
export interface Constraint { id: string; pass: boolean; reason: string }
export interface Candidate {
  candidateId: string;
  datasetId: string;
  name: string;
  rowCount: number;
  recipe: { steps: TransformStep[]; seed: number; version: string; releaseMode: ReleaseMode; baseDatasetId?: string };
  preview: Row[];
  columns: string[];
  risk: RiskResult;
  utility: UtilityResult;
  constraints: Constraint[];
  frontierMember: boolean;
  explanation?: string;
  alignment: 'verified' | 'unpaired';
  createdAt: string;
  objectives?: Record<string, number>;
  feasible?: boolean;
  suppression_rate?: number;
  searchDepth?: number;
  recipeHash?: string;
  /** Frozen inputs of this immutable snapshot (returned by the local service). */
  threatModel?: { qi: string[]; sensitive: string[] };
  threatContext?: ThreatContext;
  workload?: ResearchQuery[];
  schema?: ColumnSpec[];
  auditMode?: string;
  transformReport?: { warnings?: string[]; suppressed_rows?: number; suppression_rate?: number };
}
export interface SearchResult {
  jobId: string;
  status: string;
  candidates: Candidate[];
  evaluated: number;
  cap: number;
  requestedCap?: number;
  attempted?: number;
  termination: string;
  objectives: string[];
  failures?: { recipeHash?: string; reason: string }[];
  message?: string;
  feasibleCount?: number;
  evaluationCoverage?: { run?: string[]; skipped?: string[]; retest?: string };
}
export interface RegistryEntry {
  id: string;
  name?: string;
  status?: string;
  description?: string;
  assumptions?: string[] | string;
  controls?: string[] | string;
  control?: string;
  limitations?: string[] | string;
  limitation?: string;
  source?: string;
  sourceUrl?: string;
  sourceId?: string;
  summary?: string;
  coverage?: string;
  catalogCoverage?: string;
  aliases?: string[];
  implemented?: string;
  mitigation?: string;
  searchText?: string;
  engineMethod?: string;
  scientific_tradeoff?: string;
  applicability?: string;
  [key: string]: unknown;
}
export interface RegistrySource { id: string; title?: string; url?: string }
export interface Registry {
  attacks: RegistryEntry[];
  methods: RegistryEntry[];
  integrations: RegistryEntry[];
  /** Educational / protection catalogue entries distinct from executable engine methods. */
  protectionCatalog?: RegistryEntry[];
  /** The executable engine analyses the 26 broad threat families map onto via aliases. */
  engineAnalyses?: RegistryEntry[];
  familyCount?: number;
  protectionCount?: number;
  catalogAttribution?: Record<string, string>;
  sources?: RegistrySource[];
  releaseModes?: { id: string; status: string }[];
  warning?: string;
}
export interface LabExperiment {
  id: string; title: string; explanation: string; inputs: Record<string, unknown>;
  result: Record<string, unknown>; lesson: string; assumptions: string[]; status: string;
}
export interface LabResult { experiments: LabExperiment[] }
/** Upload capability and limits are reported by the actual service. */
export interface ApiHealth {
  status: string; version?: string; deploymentMode?: 'synthetic_demo' | 'hosted_workbench' | 'local' | string; uploadsAllowed?: boolean;
  maxUploadBytes?: number; maxDatasets?: number; maxRows?: number; maxColumns?: number;
  backendProvider?: string; computeProvider?: string; storageProvider?: string; modelInRuntime?: boolean;
  sessionTtlSeconds?: number; maxSearchCandidates?: number; maxCandidates?: number;
  [key: string]: unknown;
}

export type ViewId = 'guide' | 'workbench' | 'map' | 'lab' | 'intent' | 'pareto' | 'report';
export type ExportFormat = 'json' | 'html' | 'recipe' | 'csv';
export type AuditMode = 'unpaired_microdata' | 'paired_row_preserving' | 'synthetic';
