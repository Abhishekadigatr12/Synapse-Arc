# Starts the local SYNAPSE-ARC demo stack for the static frontend.
# Launches the backend API and telemetry generator in separate processes.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    throw "Python virtual environment not found at $python"
}

$logsDir = Join-Path $root 'logs'
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}


$backendLog = Join-Path $logsDir 'backend-demo.log'
$telemetryLog = Join-Path $logsDir 'telemetry-demo.log'

$backendCommand = "& '$python' -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 *> '$backendLog'"
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $backendCommand) -WorkingDirectory $root | Out-Null

$telemetryCommand = "`$env:BACKEND_URL='http://127.0.0.1:8000'; `$env:NODES='5'; `$env:INTERVAL='5'; & '$python' services\telemetry-service\main.py"
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', "$telemetryCommand *> '$telemetryLog'") -WorkingDirectory $root | Out-Null

Write-Host "Started backend and telemetry workers."
Write-Host "Backend log: $backendLog"
Write-Host "Telemetry log: $telemetryLog"