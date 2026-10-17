from __future__ import annotations
from collections import defaultdict
import pandas as pd
from .models import ColumnSpec, ThreatModel, Recipe
from .transforms import key_frame, public_replay
from .data import pii_scan


def equivalence(df: pd.DataFrame, known: list[str]) -> dict:
    cols = [c for c in known if c in df]
    if not len(df): return {'status':'insufficient_data','reason':'Empty candidate','sample_unique_fraction':None,'minimum_class_size':None}
    if not cols: return {'status':'not_applicable','reason':'No selected quasi-identifiers survive; other attacks still apply',
                         'sample_unique_fraction':None,'minimum_class_size':None}
    counts = key_frame(df,cols).value_counts()
    hist = counts.value_counts().sort_index()
    return {'status':'measured','columns':cols,'rows':len(df),'classes':len(counts),
            'minimum_class_size':int(counts.min()),'sample_unique_fraction':float((counts==1).sum()/len(df)),
            'rows_in_classes_below_5':int(counts[counts<5].sum()),
            'uniform_candidate_guessing_model':float(len(counts)/len(df)),
            'class_size_histogram':[{'class_size':int(k),'classes':int(v)} for k,v in hist.items()],
            'interpretation':'Sample equality classes only. 1/k assumes known membership, correct matching, and uniform choice within a class; not real-world identity probability.'}


def sensitive_groups(df: pd.DataFrame, known: list[str], sensitive: list[str]) -> list[dict]:
    cols = [c for c in known if c in df]
    if not len(df) or not cols: return []
    keys = key_frame(df,cols); out = []
    for c in sensitive:
        if c not in df: continue
        vals = df[c].dropna().astype(str)
        if not len(vals): out.append({'column':c,'status':'insufficient_data'}); continue
        if vals.nunique()>50:
            out.append({'column':c,'status':'not_applicable','reason':'Categorical method capped at 50 values; numeric-sensitive inference needs another evaluator'}); continue
        support = sorted(vals.unique()); global_p = vals.value_counts(normalize=True).reindex(support,fill_value=0)
        work = pd.DataFrame({'key':keys,'value':df[c]})
        min_l, homogeneous, max_tv, total = None,0,0.,0
        for _,group in work.groupby('key',sort=False):
            s = group['value'].dropna().astype(str)
            if not len(s): continue
            diversity = int(s.nunique()); min_l = diversity if min_l is None else min(min_l,diversity)
            homogeneous += len(s) if diversity==1 else 0; total += len(s)
            p = s.value_counts(normalize=True).reindex(support,fill_value=0)
            max_tv = max(max_tv,float((p-global_p).abs().sum()/2))
        out.append({'column':c,'status':'measured','minimum_distinct_l':min_l,
            'homogeneous_observed_row_fraction':homogeneous/max(1,total),'observed_sensitive_rows':total,
            'maximum_group_total_variation':max_tv,
            'limitation':'Distinct-l and distribution-shift diagnostics, not semantic l-diversity or general t-closeness certification. Associations may be genuine population patterns.'})
    return out


def exact_linkage(source: pd.DataFrame,candidate: pd.DataFrame,recipe: Recipe | None,
                  lineage: list[int] | None,threat: ThreatModel) -> dict:
    if recipe is None or lineage is None:
        return {'status':'not_assessed','reason':'Imported release has no trusted row correspondence. Similarity is not verified linkage.'}
    if not threat.membership_known:
        return {'status':'not_assessed','reason':'Unknown-membership linkage needs independent nonmember controls and calibrated thresholds.'}
    if len(candidate)==0: return {'status':'insufficient_data','reason':'Candidate is empty'}
    try: target_view = public_replay(source,recipe,threat.known_columns)
    except ValueError as exc: return {'status':'not_applicable','reason':str(exc)}
    cols = [c for c in threat.known_columns if c in candidate and c in target_view]
    if not cols: return {'status':'not_applicable','reason':'No surviving known quasi-identifiers; this does not rule out other attacks.'}
    groups = defaultdict(list)
    candidate_keys = key_frame(candidate,cols)
    for pos,key in enumerate(candidate_keys): groups[key].append(pos)
    # O(1) ground-truth scoring avoids quadratic work for large equality classes.
    true_key = {source_pos: candidate_keys.iloc[pos] for pos, source_pos in enumerate(lineage)}
    target_keys = key_frame(target_view,cols)
    n = len(source); unique,matched,expected = 0,0,0.; examples = []
    for i,key in enumerate(target_keys):
        positions = groups.get(key,[])
        truth_in = i in true_key and true_key[i] == key
        matched += bool(positions)
        if truth_in:
            expected += 1/len(positions); unique += len(positions)==1
        if len(examples)<8 and positions and len(positions)<=3:
            examples.append({'target_position_owner_only':i,'matching_candidates':len(positions),
                             'verified_unique_correct_match':bool(truth_in and len(positions)==1)})
    return {'status':'measured','targets':n,'matched_targets':matched,'unique_correct_matches':unique,
            'verified_unique_linkage_fraction':unique/n,'expected_correct_random_tiebreak_fraction':expected/n,
            'examples':examples,
            'assumptions':['Known source membership; attacker knows selected attributes and public generalization codebooks.',
                           'Ground-truth row mapping is used only for scoring, never supplied to the attacker.',
                           'Complete fixture enumeration; no sampling confidence interval or population generalization is claimed.',
                           'Independent external auxiliary-data validation has not been performed.']}


def ablations(df: pd.DataFrame, known: list[str]) -> list[dict]:
    cols = [c for c in known if c in df]
    base = equivalence(df,cols).get('sample_unique_fraction')
    if base is None or len(cols)<2: return []
    rows = []
    for c in cols:
        after = equivalence(df,[x for x in cols if x!=c]).get('sample_unique_fraction')
        rows.append({'column':c,'unique_fraction_without_column':after,
                     'sample_uniqueness_reduction':base-after if after is not None else None})
    return sorted(rows,key=lambda r:r['sample_uniqueness_reduction'] or 0,reverse=True)


def assess(source: pd.DataFrame,candidate: pd.DataFrame,columns: list[ColumnSpec],threat: ThreatModel,
           recipe: Recipe | None = None,lineage: list[int] | None = None) -> dict:
    warnings = []; entity_valid = threat.one_row_per_person_confirmed
    if threat.entity_column:
        if threat.entity_column not in source: raise ValueError('Unknown entity column')
        ids = source[threat.entity_column]
        if ids.isna().any() or ids.duplicated().any():
            entity_valid = False; warnings.append('Entity identifiers are missing or repeated. Row-level metrics are not person-level protection.')
    if not entity_valid: warnings.append('One row per person is not established; metrics describe rows, not people.')
    untouched = [s.name for s in columns if s.role=='identifier' and s.name in candidate and candidate[s.name].nunique(dropna=True)>1]
    if untouched: warnings.append('Identifier-designated columns remain. Pseudonymization is not anonymization.')
    unmodeled = [s.name for s in columns if s.role=='quasi' and s.name in candidate and s.name not in threat.known_columns]
    if unmodeled: warnings.append('Some quasi-identifiers are not in this attacker model; broaden knowledge before release.')
    if any(s.kind=='text' and s.name in candidate for s in columns): warnings.append('Free text is outside reliable detection coverage. Pattern redaction alone is insufficient.')
    if threat.context=='public': warnings.append('Public release is difficult to reverse and permits unknown auxiliary data and colluding recipients.')
    return {'equality_classes':equivalence(candidate,threat.known_columns),
            'source_equality_classes':equivalence(source,threat.known_columns),
            'linkage':exact_linkage(source,candidate,recipe,lineage,threat),
            'sensitive_groups':sensitive_groups(candidate,threat.known_columns,threat.sensitive_columns),
            'pii':pii_scan(candidate),'column_ablations':ablations(candidate,threat.known_columns),
            'retained_identifier_columns':untouched,'unmodeled_quasi_identifiers':unmodeled,
            'unit':'person' if entity_valid else 'row','warnings':warnings,
            'coverage':{'membership_inference':'not_assessed','population_uniqueness':'not_assessed',
                'external_record_linkage':'not_assessed','longitudinal_trajectory_linkage':'not_assessed',
                'genomic_and_family_inference':'not_assessed','aggregate_reconstruction':'demo_only',
                'cross_release_composition':'demo_only','semantic_free_text':'not_assessed'},
            'release_status':'review_required','formal_privacy_guarantee':None}
