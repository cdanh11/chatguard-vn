$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'apps\api'
$pythonExe = Join-Path $apiRoot '.venv\Scripts\python.exe'
$envPath = Join-Path $apiRoot '.env'
if (-not (Test-Path -LiteralPath $pythonExe) -or -not (Test-Path -LiteralPath $envPath)) { throw 'Run scripts\setup.ps1 first.' }
$tokenLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^CHATGUARD_API_TOKEN=' } | Select-Object -First 1
if (-not $tokenLine) { throw 'CHATGUARD_API_TOKEN is missing.' }
Write-Host 'ChatGuard VN local server: http://127.0.0.1:8000/demo/#ctv'
Write-Host 'Paste this local token into the extension settings (never use your Groq key):'
Write-Host ($tokenLine -replace '^CHATGUARD_API_TOKEN=', '')
Push-Location $apiRoot
try { & $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log }
finally { Pop-Location }
