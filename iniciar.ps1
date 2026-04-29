$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSCommandPath
$backend = Join-Path $root 'backend'

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-MySqlService {
    $services = Get-Service -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match '^(MySQL|MariaDB)' -or
        $_.DisplayName -match 'MySQL|MariaDB'
    } |
    Sort-Object Name

    return $services | Select-Object -First 1
}

if (-not (Test-Path $backend)) {
    throw "Pasta backend não encontrada em: $backend"
}

Write-Host "Iniciando RentCarBrasil..." -ForegroundColor Cyan
Write-Host "Projeto: $root"

$mySqlService = Get-MySqlService
if ($null -eq $mySqlService) {
    Write-Host "[AVISO] Nenhum serviço MySQL/MariaDB encontrado no Windows. O backend pode entrar em modo demonstração." -ForegroundColor Yellow
}
elseif ($mySqlService.Status -ne 'Running') {
    Write-Host "[AVISO] Serviço de banco '$($mySqlService.Name)' está parado." -ForegroundColor Yellow

    if (Test-IsAdministrator) {
        try {
            Start-Service -Name $mySqlService.Name
            Write-Host "[OK] Serviço '$($mySqlService.Name)' iniciado com sucesso." -ForegroundColor Green
        }
        catch {
            Write-Host "[AVISO] Falha ao iniciar '$($mySqlService.Name)': $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   O sistema continuará e pode entrar em modo demonstração." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "[INFO] Solicitando permissao de Administrador para iniciar '$($mySqlService.Name)'..." -ForegroundColor Cyan
        try {
            $startCmd = "Start-Service -Name '$($mySqlService.Name)'"
            Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $startCmd | Out-Null

            $mySqlService = Get-Service -Name $mySqlService.Name -ErrorAction SilentlyContinue
            if ($mySqlService -and $mySqlService.Status -eq 'Running') {
                Write-Host "[OK] Servico '$($mySqlService.Name)' iniciado com sucesso." -ForegroundColor Green
            }
            else {
                Write-Host "[AVISO] Nao foi possivel iniciar '$($mySqlService.Name)' apos tentativa de elevacao." -ForegroundColor Yellow
                Write-Host "   O sistema continuara e pode entrar em modo demonstracao." -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "[AVISO] Elevacao cancelada ou falhou: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   O sistema continuara e pode entrar em modo demonstracao." -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "[OK] Serviço '$($mySqlService.Name)' já está em execução." -ForegroundColor Green
}

Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backend -ArgumentList '/k', 'npm install --silent && node server.js'
Start-Process -FilePath 'cmd.exe' -WorkingDirectory $root -ArgumentList '/k', 'npm install --silent && npm run dev'

Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Se o PowerShell bloquear a execução, rode: Set-ExecutionPolicy -Scope Process Bypass" -ForegroundColor Yellow
