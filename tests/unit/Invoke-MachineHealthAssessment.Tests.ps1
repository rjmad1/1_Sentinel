Describe "Machine Health Assessment - Unit Tests" {
    $collectorScriptPath = Join-Path $PSScriptRoot "..\..\collector\Invoke-EIIPAssessment.ps1"
    
    if (-not (Test-Path $collectorScriptPath)) {
        Write-Error "Collector script not found at $collectorScriptPath"
    }

    # Extract functions only
    $scriptContent = Get-Content -Path $collectorScriptPath -Raw
    $parts = $scriptContent -split '#\s*MAIN ORCHESTRATION'
    Invoke-Expression $parts[0]

    Context "Get-MhaSeverityWeight" {
        It "returns correct weights for each severity" {
            (Get-MhaSeverityWeight -Severity 'Critical') | Should Be 25
            (Get-MhaSeverityWeight -Severity 'High') | Should Be 15
            (Get-MhaSeverityWeight -Severity 'Medium') | Should Be 8
            (Get-MhaSeverityWeight -Severity 'Low') | Should Be 3
            (Get-MhaSeverityWeight -Severity 'Informational') | Should Be 0
            (Get-MhaSeverityWeight -Severity 'Unknown') | Should Be 0
        }
    }

    Context "Get-MhaDomainScore" {
        It "calculates 100 with no findings" {
            # Use a dummy finding for a different domain to avoid empty array binding exception
            $findings = @([pscustomobject]@{ Domain = 'Security'; Severity = 'Informational' })
            (Get-MhaDomainScore -Findings $findings -Domain 'Performance') | Should Be 100
        }

        It "calculates correct penalty score based on findings" {
            $findings = @(
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'High' },
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Medium' }
            )
            # Penalty: High(15) + Medium(8) = 23. Score: 100 - 23 = 77
            (Get-MhaDomainScore -Findings $findings -Domain 'Performance') | Should Be 77
        }

        It "pins minimum score to 0" {
            $findings = @(
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Critical' },
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Critical' },
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Critical' },
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Critical' },
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'Critical' }
            )
            # Penalty: 25 * 5 = 125. Score: Max(0, 100 - 125) = 0
            (Get-MhaDomainScore -Findings $findings -Domain 'Performance') | Should Be 0
        }
    }

    Context "Get-MhaHealthScore" {
        It "calculates 100 overall score when all domain scores are 100" {
            # Use dummy finding of different domain to satisfy mandatory non-empty array constraint
            $findings = @([pscustomobject]@{ Domain = 'Correlation'; Severity = 'Informational' })
            $env = @{}
            $score = Get-MhaHealthScore -Findings $findings -Environment $env
            $score.OverallHealthScore | Should Be 100
            $score.PerformanceScore | Should Be 100
            $score.SecurityScore | Should Be 100
            $score.ReliabilityScore | Should Be 100
            $score.ScalabilityScore | Should Be 100
            $score.ServiceabilityScore | Should Be 100
            $score.UsabilityScore | Should Be 100
        }

        It "calculates correct weighted overall score" {
            $findings = @(
                [pscustomobject]@{ Domain = 'Performance'; Severity = 'High' },       # Performance: 85 (wt 0.20)
                [pscustomobject]@{ Domain = 'Security'; Severity = 'Critical' }       # Security: 75 (wt 0.25)
            )
            $env = @{}
            # Weighted: (85 * 0.20) + (75 * 0.25) + (100 * 0.20) + (100 * 0.15) + (100 * 0.10) + (100 * 0.10)
            # = 17 + 18.75 + 20 + 15 + 10 + 10 = 90.75
            $score = Get-MhaHealthScore -Findings $findings -Environment $env
            $score.OverallHealthScore | Should Be 90.75
        }
    }

    Context "Get-MhaDeduplicatedFindings" {
        It "removes duplicate findings based on Category, Title, and Description" {
            $findings = @(
                [pscustomobject]@{ Category = 'Cat'; Title = 'Title'; Description = 'Desc'; FindingId = 'ID-001'; Severity = 'Low'; Priority = 80 },
                [pscustomobject]@{ Category = 'Cat'; Title = 'Title'; Description = 'Desc'; FindingId = 'ID-002'; Severity = 'Low'; Priority = 80 }
            )
            $dedup = Get-MhaDeduplicatedFindings -Findings $findings
            @($dedup).Count | Should Be 1
            $dedup[0].FindingId | Should Be 'ID-001'
        }

        It "safely handles empty findings list" {
            $dedup = Get-MhaDeduplicatedFindings -Findings @()
            @($dedup).Count | Should Be 0
        }
    }

    Context "Get-MhaSafeProperty" {
        It "extracts object property safely" {
            $obj = [pscustomobject]@{ Test = "Value" }
            (Get-MhaSafeProperty -Object $obj -PropertyName 'Test') | Should Be "Value"
            (Get-MhaSafeProperty -Object $obj -PropertyName 'NonExistent' -DefaultValue "Default") | Should Be "Default"
        }

        It "safely handles null objects" {
            (Get-MhaSafeProperty -Object $null -PropertyName 'Test' -DefaultValue "Default") | Should Be "Default"
        }
    }
}
