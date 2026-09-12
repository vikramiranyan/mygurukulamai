$projectRoot = Split-Path -Parent $PSScriptRoot
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Gurukulam AI.lnk'
$launcherPath = Join-Path $projectRoot 'scripts\start-gurukulam.ps1'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Starts the local Gurukulam AI Vite server after Windows login.'
$shortcut.Save()

Write-Output "Startup shortcut created: $shortcutPath"
Write-Output 'The server will start automatically the next time you sign in to Windows.'
