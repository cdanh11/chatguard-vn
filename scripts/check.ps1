$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $projectRoot 'apps\api')
try {
    & '.\.venv\Scripts\python.exe' -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
} finally { Pop-Location }
Push-Location (Join-Path $projectRoot 'apps\extension')
try {
    npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed.' }
    npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Extension tests failed.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
} finally { Pop-Location }
