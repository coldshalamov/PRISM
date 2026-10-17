$ErrorActionPreference = 'Stop'
$PrismPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $PrismPython)) { throw 'Run .\setup.ps1 first.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'frontend\dist\index.html'))) { throw 'Build the frontend first: npm run build --prefix frontend' }
Write-Host 'PRISM: http://127.0.0.1:8000 (loopback only; Ctrl+C stops the local process)'
Push-Location (Join-Path $PSScriptRoot 'backend')
try { & $PrismPython -m app.main } finally { Pop-Location }
