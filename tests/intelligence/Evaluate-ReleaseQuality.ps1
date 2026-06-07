# PowerShell Release Quality Evaluator Wrapper
$ErrorActionPreference = 'Stop'
$script:PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== EIIP Release Quality Evaluator Wrapper (PowerShell) ===" -ForegroundColor Cyan
Write-Host "Delegating to JavaScript evaluation engine..." -ForegroundColor Yellow

# Execute evaluateRelease.js
node (Join-Path $script:PSScriptRoot "evaluateRelease.js")

if ($LASTEXITCODE -ne 0) {
    Write-Host "Evaluation FAILED." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Evaluation PASSED." -ForegroundColor Green
    exit 0
}
