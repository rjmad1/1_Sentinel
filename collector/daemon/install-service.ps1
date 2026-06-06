# PowerShell Service Installation Script for Sentinel Collector Daemon
# Must be run in an Elevated PowerShell Session (Run as Administrator)

$ServiceName = "SentinelCollector"
$DisplayName = "Sentinel Infrastructure Telemetry Collector"
$Description = "Executes background telemetry collection for 1_Sentinel client UI."
$BinaryName = "sentinel-collector.exe"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinaryPath = Join-Path $ScriptDir "target\release\$BinaryName"

if (-not (Test-Path $BinaryPath)) {
    $BinaryPath = Join-Path $ScriptDir $BinaryName
}

if (-not (Test-Path $BinaryPath)) {
    Write-Error "Could not locate precompiled daemon binary '$BinaryName' in release target folder or current folder. Please compile it first using 'cargo build --release'."
    Exit 1
}

# Check if service already exists
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "Stopping and removing existing $ServiceName service..."
    Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
}

Write-Host "Installing Windows Service: $ServiceName..."
Write-Host "Binary Path: $BinaryPath"

# Register the service via sc.exe (works reliably across PowerShell versions)
sc.exe create $ServiceName binPath= "$BinaryPath" start= auto DisplayName= "$DisplayName" | Out-Null
sc.exe description $ServiceName "$Description" | Out-Null

# Start the service
Write-Host "Starting service..."
Start-Service -Name $ServiceName

$Status = Get-Service -Name $ServiceName
if ($Status.Status -eq "Running") {
    Write-Host "Windows Service successfully installed and started! Listening on http://localhost:1337" -ForegroundColor Green
} else {
    Write-Warning "Service was installed but failed to start automatically. Current status: $($Status.Status)"
}
