Describe "Sentinel Telemetry Collector Helpers" {
    BeforeAll {
        $scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "../../public/Invoke-EIIPAssessment.ps1"
        if (Test-Path $scriptPath) {
            . $scriptPath
        }
    }

    It "Validates Get-MhaEvidenceValue returns correct value" {
        $mockEvidence = @(
            [pscustomobject]@{ Source = 'Disk'; Name = 'DeviceID'; Value = 'C:' },
            [pscustomobject]@{ Source = 'Disk'; Name = 'FreePercent'; Value = 11.4 }
        )

        $val = Get-MhaEvidenceValue -RawEvidence $mockEvidence -Source 'Disk' -Name 'DeviceID'
        $val | Should Be 'C:'

        $valPct = Get-MhaEvidenceValue -RawEvidence $mockEvidence -Source 'Disk' -Name 'FreePercent'
        $valPct | Should Be 11.4
    }

    It "Validates Get-MhaSafeProperty fallback" {
        $obj = [pscustomobject]@{ TestProp = 'Hello' }
        $val = Get-MhaSafeProperty -Object $obj -PropertyName 'TestProp' -DefaultValue 'Fallback'
        $val | Should Be 'Hello'

        $valFallback = Get-MhaSafeProperty -Object $obj -PropertyName 'NonExistent' -DefaultValue 'Fallback'
        $valFallback | Should Be 'Fallback'
    }

    It "Validates Get-MhaDeduplicatedFindings eliminates duplicates" {
        $findingsList = @(
            [pscustomobject]@{ FindingId = 'F1'; Category = 'Disk'; Title = 'Low Space'; Description = 'Disk C: is low'; Priority = 10 },
            [pscustomobject]@{ FindingId = 'F1'; Category = 'Disk'; Title = 'Low Space'; Description = 'Disk C: is low'; Priority = 10 },
            [pscustomobject]@{ FindingId = 'F2'; Category = 'Sec'; Title = 'Firewall'; Description = 'FW Disabled'; Priority = 20 }
        )

        $dedup = Get-MhaDeduplicatedFindings -Findings $findingsList
        $dedup.Count | Should Be 2
    }
}
