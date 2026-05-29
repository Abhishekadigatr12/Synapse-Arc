# Helper PowerShell script to run docker-compose with retries and diagnostics
# Usage: Open PowerShell as Administrator and run: .\scripts\run_compose.ps1

$ErrorActionPreference = 'Stop'
$logDir = "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Write-Host "Pulling base images (postgres:15, redis:7) to catch any network/auth issues..."
try {
    docker pull postgres:15 2>&1 | Tee-Object -FilePath "$logDir\docker_pull_postgres.log"
    docker pull redis:7 2>&1 | Tee-Object -FilePath "$logDir\docker_pull_redis.log"
} catch {
    Write-Warning "docker pull failed: $_"
}

Write-Host "Starting docker compose up --build"
try {
    docker compose up --build 2>&1 | Tee-Object -FilePath "$logDir\docker_compose_up.log"
} catch {
    Write-Error "docker compose failed: $_"
    Write-Host "Gathering diagnostics..."
    docker ps -a 2>&1 | Tee-Object -FilePath "$logDir\docker_ps_a.log"
    docker compose ps 2>&1 | Tee-Object -FilePath "$logDir\docker_compose_ps.log"
    docker compose logs --no-color backend > "$logDir\backend_logs.log" 2>&1
    docker compose logs --no-color postgres > "$logDir\postgres_logs.log" 2>&1
    docker compose logs --no-color redis > "$logDir\redis_logs.log" 2>&1
    docker info 2>&1 | Tee-Object -FilePath "$logDir\docker_info.log"
    Write-Host "Diagnostics written to $logDir. Please review and paste failures here if you want help debugging."
    exit 1
}

Write-Host "docker compose completed. If running in foreground, press Ctrl+C to stop; check logs directory for full output: $logDir"