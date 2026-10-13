$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'apps\extension'
Write-Host 'ChatGuard development server: http://127.0.0.1:3001'
Write-Host 'Load this development folder into your existing Brave profile once:'
Write-Host (Join-Path $extensionRoot '.output\chrome-mv3-dev')
Write-Host 'Disable the production copy while testing. Keep this terminal open.'
Write-Host 'Reader/background updates may stop protection. Open ChatGuard and select the same test person again.'
Push-Location $extensionRoot
try { & npm.cmd run dev; if ($LASTEXITCODE -ne 0) { throw 'Extension dev server stopped with an error.' } }
finally { Pop-Location }
