from pathlib import Path
from collections import Counter, defaultdict
import math, re, json, statistics
P=Path(__file__).resolve().parent
FINAL=P/'PRISM_Complete_Specification_v3.md'
checks=[]
def check(name,condition,details=''):
    checks.append({'check':name,'passed':bool(condition),'details':details})
    if not condition: raise AssertionError(name+': '+details)
def metrics(values):
    counts=Counter(values); n=len(values)
    h=sum(c/n*math.log2(c) for c in counts.values())
    return {'k':min(counts.values()),'u':sum(c for c in counts.values() if c==1)/n,'pg':len(counts)/n,'H':h,'reduction':math.log2(n)-h}
def almost(x,y): return abs(x-y)<1e-12
ages=[41,42,43,44,46,47,48,49]
for label,values,expected in [
('F01 exact ages',ages,{'k':1,'u':1,'pg':1,'H':0,'reduction':3}),
('F01 shared five-year bands',[5*math.floor(x/5) for x in ages],{'k':4,'u':0,'pg':.25,'H':2,'reduction':1}),
('F01 shared ten-year bands',[10*math.floor(x/10) for x in ages],{'k':8,'u':0,'pg':.125,'H':3,'reduction':0})]:
    actual=metrics(values)
    check(label,all(almost(actual[k],v) for k,v in expected.items()),json.dumps(actual))
ranges=[(a-2,a+2) for a in ages]
check('F01 centered intervals invert exactly',[(l+u)/2 for l,u in ranges]==ages and metrics(ranges)['u']==1)
q=['A']*5+['B']*5;s=['X']*5+['Y']*5
check('F02 k=5 with homogeneous sensitive groups',metrics(q)['k']==5 and all(len(set(s[i] for i in range(10) if q[i]==g))==1 for g in set(q)))
x=[30,40,50,60];ys=[10,20,30,40];yz=list(reversed(ys))
check('F03 equal marginals opposite correlations',statistics.mean(ys)==statistics.mean(yz) and statistics.pvariance(ys)==statistics.pvariance(yz) and almost(statistics.correlation(x,ys),1) and almost(statistics.correlation(x,yz),-1))
subjects=['a']*4+['b']*4; q2=['q1']*4+['q2']*4
g=defaultdict(set)
for k,v in zip(q2,subjects):g[k].add(v)
check('F04 duplicate rows do not create people',metrics(q2)['k']==4 and min(map(len,g.values()))==1)
intersection=set(range(40,45))&set(range(44,49))
check('F05 interval composition recovers integer age',intersection=={44},str(intersection))
def entropy(vals):
    n=len(vals);return -sum(c/n*math.log2(c/n) for c in Counter(vals).values())
def mi(a,b):return entropy(a)+entropy(b)-entropy(list(zip(a,b)))
a=[0,0,1,1];b=[0,1,0,1];z=[v^w for v,w in zip(a,b)]
check('F06 XOR needs joint analysis',almost(mi(a,z),0) and almost(mi(b,z),0) and almost(mi(list(zip(a,b)),z),1))
check('Binning exact boundary and negative floor',5*math.floor(45/5)==45 and 5*math.floor(-1/5)==-5)
semantic=json.loads((P/'semantic_types.json').read_text()); rules=json.loads((P/'risk_rules.json').read_text())
check('144 unique semantic leaf IDs',len(semantic)==144 and len({x['id'] for x in semantic})==144)
check('15 semantic families',len({x['family'] for x in semantic})==15)
check('60 unique rule IDs',len(rules)==60 and {x['id'] for x in rules}=={f'R{i:02}' for i in range(1,61)})
valid_d={f'D{i:02}' for i in range(1,26)};valid_t={f'T{i:02}' for i in range(1,24)}
check('All taxonomy detector references resolve',all(set(x['default_detectors'])<=valid_d for x in semantic))
check('All rule detector references resolve',all(set(x['detectors'])<=valid_d for x in rules))
check('All rule mitigation references resolve',all(set(x['mitigations'])<=valid_t|{'review'} for x in rules))
text=FINAL.read_text()
policies={'DIRECT','QI_CLASS','HOMOGENEITY','DISTRIBUTION','LINK','RECOVERY','TOKEN','AGGREGATE','SYNTHETIC','CONTEXT','GAP','METHOD','UTILITY'}
check('All rule severity policies defined',all(x['severity_policy'] in policies and f'`{x["severity_policy"]}`' in text for x in rules))
check('All detector sections present',all(re.search(rf'^### {d} ',text,re.M) for d in valid_d))
check('All transformation definitions present',all(f'| {t} |' in text for t in valid_t))
check('90 acceptance tests defined',len(set(re.findall(r'^\| (A\d\d) \|',text,re.M)))==90)
refs=set(re.findall(r'\[S(\d+)\]',text))
check('All cited sources defined',refs=={str(i) for i in range(1,14)} and all(f'**[S{i}]' in text for i in range(1,14)))
check('Markdown fences balanced',sum(line.startswith('```') for line in text.splitlines())%2==0)
check('No transcript-only citation artifacts',not any(x in text for x in ['turn0file','',':::writing']))
check('No unfilled placeholder TODOs',not re.search(r'\bTODO\b|\bTBD\b|<insert|PLACEHOLDER',text))
check('Complete end marker',text.rstrip().endswith('**End of specification.**'))
report={'artifact':str(FINAL),'scope':'Specification arithmetic and internal consistency only; not application, API or security validation','checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks)}
(P/'spec_validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
