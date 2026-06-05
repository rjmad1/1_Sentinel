Describe "PowerShell Collector Integration" {
    $collectorScriptPath = Join-Path $PSScriptRoot "..\..\collector\Invoke-EIIPAssessment.ps1"
    $tempPath = Join-Path $PSScriptRoot "..\..\temp_integration_report"

    It "executes the script and validates output report files" {
        # Setup
        if (Test-Path $tempPath) { 
            Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
        }
        New-Item -ItemType Directory -Path $tempPath -Force | Out-Null

        try {
            # Invoke the collector script to assess the local host
            & $collectorScriptPath -OutputPath $tempPath -OutputFormat 'All' -ExecutionMode 'Audit' -ErrorAction Stop
            
            # Assert that all standard files exist in the output directory
            (Test-Path (Join-Path $tempPath "Assessment.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "EnvironmentOverview.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "Findings.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "HealthScore.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "RiskMatrix.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "CapacityForecast.json")) | Should Be $true
            (Test-Path (Join-Path $tempPath "ExecutiveSummary.html")) | Should Be $true
            (Test-Path (Join-Path $tempPath "ExecutiveSummary.md")) | Should Be $true
            (Test-Path (Join-Path $tempPath "SentinelHistory.db")) | Should Be $true
        }
        finally {
            # Teardown
            if (Test-Path $tempPath) { 
                Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
            }
        }
    }
}
