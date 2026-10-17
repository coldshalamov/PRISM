param([string]$Python = "")
$ErrorActionPreference = 'Stop'
$PrismRoot = $PSScriptRoot
$PrismCandidates = @()
if ($Python) { $PrismCandidates += $Python }
else {
    $PrismDefault = Get-Command python -ErrorAction SilentlyContinue
    if ($PrismDefault) { $PrismCandidates += $PrismDefault.Source }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $PrismLauncherPaths = & py -0p 2>&1
        foreach ($PrismLine in $PrismLauncherPaths) {
            if ([string]$PrismLine -match '([A-Za-z]:\\.*python\.exe)') { $PrismCandidates += $Matches[1] }
        }
    }
}
$PrismSelected = $null
foreach ($PrismCandidate in $PrismCandidates) {
    if (-not (Test-Path -LiteralPath $PrismCandidate)) { continue }
    & $PrismCandidate -c "import sys; sys.exit(0 if (3,11) <= sys.version_info[:2] < (3,13) else 1)"
    if ($LASTEXITCODE -eq 0) { $PrismSelected = $PrismCandidate; break }
}
if (-not $PrismSelected) { throw 'Python 3.11 or 3.12 is required. Install one, or run .\setup.ps1 -Python C:\path\to\python.exe' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Install Node.js 20.19+ (or 22.12+) and npm, then rerun setup.' }
& $PrismSelected -m venv (Join-Path $PrismRoot '.venv')
if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python virtual environment.' }
$PrismVenvPython = Join-Path $PrismRoot '.venv\Scripts\python.exe'
& $PrismVenvPython -m pip install -r (Join-Path $PrismRoot 'backend\requirements.lock.txt')
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
& $PrismVenvPython -m pip install --no-deps -e (Join-Path $PrismRoot 'backend')
if ($LASTEXITCODE -ne 0) { throw 'PRISM installation failed.' }
& npm ci --prefix (Join-Path $PrismRoot 'frontend')
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
& npm run build --prefix (Join-Path $PrismRoot 'frontend')
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Write-Host 'PRISM is ready. Run .\start.ps1 and open http://127.0.0.1:8000'
