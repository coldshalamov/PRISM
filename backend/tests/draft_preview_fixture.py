"""Synthetic reference cases for the browser preview / Python engine check."""
import json
import pandas as pd
from app import transforms

rows = [{"id": "SYN-001", "age": 43, "weight": 160.5, "zip": "00901", "DOS": "2021-01-01T00:30:00+02:00", "value": 2.5},
        {"id": "SYN-002", "age": 44, "weight": 149.5, "zip": "02101", "DOS": "2021-01-04T05:12:00Z", "value": -2.5},
        {"id": "SYN-003", "age": 45, "weight": 180, "zip": None, "DOS": None, "value": 3.5}]
schema = [{"name": name, "dtype": dtype, "role": "direct_identifier" if name == "id" else "quasi_identifier", "importance": 1,
           **({"unit": "lb"} if name == "weight" else {})}
          for name, dtype in [("id", "text"), ("age", "integer"), ("weight", "float"), ("zip", "category"), ("DOS", "date"), ("value", "float")]]
recipes = [
    [{"method": "drop", "columns": ["id"], "params": {}}, {"method": "band", "columns": ["age"], "params": {"width": 5}},
     {"method": "band", "columns": ["weight"], "params": {"width": 5, "convertFrom": "lb"}},
     {"method": "zip_prefix", "columns": ["zip"], "params": {"length": 3}}],
    [{"method": "round", "columns": ["value"], "params": {"decimals": 0}}],
    [{"method": "top_bottom", "columns": ["age"], "params": {"min": 44, "max": 44}}],
    [{"method": "centered_interval", "columns": ["age"], "params": {"radius": 1}}],
    [{"method": "mask", "columns": ["id"], "params": {}}],
    *[[{"method": "date_generalize", "columns": ["DOS"], "params": {"precision": precision}}]
      for precision in ("hour", "day", "week", "month", "quarter", "year")],
]
cases = []
for steps in recipes:
    output, _, _ = transforms.apply(pd.DataFrame(rows), schema, steps)
    cases.append({"source": rows, "schema": schema, "steps": steps,
                  "expected": json.loads(output.to_json(orient="records")), "columns": list(output.columns)})
print(json.dumps(cases, allow_nan=False))
