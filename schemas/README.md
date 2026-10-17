# Frozen API contract

`openapi.json` is generated from the running Pydantic/FastAPI request models. The manually synchronized TypeScript response types live in `frontend/src/types.ts`; plain engine dictionaries and required response shapes are frozen in `IMPLEMENTATION_CONTRACT.md`.

Regenerate after a deliberate contract change from the repository root:

```powershell
.\.venv\Scripts\python.exe schemas\generate.py
```
