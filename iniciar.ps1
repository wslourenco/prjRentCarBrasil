$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSCommandPath
$backend = Join-Path $root 'backend'

if (-not (Test-Path $backend)) {
    throw "Pasta backend não encontrada em: $backend"
}

Write-Host "Iniciando SisLoVe..." -ForegroundColor Cyan
Write-Host "Projeto: $root"

Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backend -ArgumentList '/k', 'npm install --silent && node server.js'
Start-Process -FilePath 'cmd.exe' -WorkingDirectory $root -ArgumentList '/k', 'npm install --silent && npm run dev'

Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Se o PowerShell bloquear a execução, rode: Set-ExecutionPolicy -Scope Process Bypass" -ForegroundColor Yellow
