$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'apps\api'
$extensionRoot = Join-Path $projectRoot 'apps\extension'
$pythonExe = Join-Path $apiRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) {
    py -3.11 -m venv (Join-Path $apiRoot '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.11, then retry.' }
}
$requirementsPath = Join-Path $apiRoot 'requirements-lock.txt'
if (-not (Test-Path -LiteralPath $requirementsPath)) { $requirementsPath = Join-Path $apiRoot 'requirements-dev.txt' }
& $pythonExe -m pip install --disable-pip-version-check -r $requirementsPath
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
$envPath = Join-Path $apiRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    $apiToken = & $pythonExe -c 'import secrets; print(secrets.token_urlsafe(32))'
    $content = "CHATGUARD_API_TOKEN=$apiToken`nGROQ_API_KEY=`nGROQ_MODEL=openai/gpt-oss-120b`n"
    [System.IO.File]::WriteAllText($envPath, $content, (New-Object System.Text.UTF8Encoding($false)))
}
Push-Location $extensionRoot
try {
    if (Test-Path -LiteralPath 'package-lock.json') { npm.cmd ci --no-audit --no-fund }
    else { npm.cmd install --no-audit --no-fund }
    if ($LASTEXITCODE -ne 0) { throw 'Extension dependency installation failed.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Extension build failed.' }
} finally { Pop-Location }
Write-Host 'Ready. Run scripts\start-backend.ps1, then load apps\extension\.output\chrome-mv3 in Chrome.'
