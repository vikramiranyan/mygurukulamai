$projectRoot = Split-Path -Parent $PSScriptRoot
$portInUse = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) { exit 0 }

Set-Location $projectRoot
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--host', 'localhost' -WorkingDirectory $projectRoot -WindowStyle Minimized
