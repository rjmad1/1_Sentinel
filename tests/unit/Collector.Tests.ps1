Describe "Sentinel Telemetry Collector Helpers" {
    It "Validates Get-MhaEvidenceValue returns correct value" {
        $mockEvidence = @(
            [pscustomobject]@{ Source = 'Disk'; Name = 'DeviceID'; Value = 'C:' },
            [pscustomobject]@{ Source = 'Disk'; Name = 'FreePercent'; Value = 11.4 }
        )

        function Get-MhaEvidenceValue {
            param(
                [object[]]$RawEvidence,
                [string]$Source,
                [string]$Name
            )
            $record = $RawEvidence |
                Where-Object { $_.Source -eq $Source -and $_.Name -eq $Name } |
                Select-Object -First 1
            if ($null -eq $record) { return $null }
            return $record.Value
        }

        $val = Get-MhaEvidenceValue -RawEvidence $mockEvidence -Source 'Disk' -Name 'DeviceID'
        $val | Should Be 'C:'

        $valPct = Get-MhaEvidenceValue -RawEvidence $mockEvidence -Source 'Disk' -Name 'FreePercent'
        $valPct | Should Be 11.4
    }

    It "Validates Get-MhaSafeProperty fallback" {
        function Get-MhaSafeProperty {
            param(
                $Object,
                [string]$PropertyName,
                $DefaultValue = $null
            )
            if ($null -eq $Object) { return $DefaultValue }
            try {
                if ($Object.PSObject -and $Object.PSObject.Properties[$PropertyName]) {
                    return $Object.$PropertyName
                }
            } catch {}
            if ($Object -is [System.Collections.IDictionary] -and $Object.Contains($PropertyName)) {
                return $Object[$PropertyName]
            }
            return $DefaultValue
        }

        $obj = [pscustomobject]@{ TestProp = 'Hello' }
        $val = Get-MhaSafeProperty -Object $obj -PropertyName 'TestProp' -DefaultValue 'Fallback'
        $val | Should Be 'Hello'

        $valFallback = Get-MhaSafeProperty -Object $obj -PropertyName 'NonExistent' -DefaultValue 'Fallback'
        $valFallback | Should Be 'Fallback'
    }

    It "Validates Get-MhaDeduplicatedFindings eliminates duplicates" {
        function Get-MhaDeduplicatedFindings {
            param(
                [object[]]$Findings
            )
            if (-not $Findings -or $Findings.Count -eq 0) {
                return [System.Collections.Generic.List[object]]::new()
            }
            $seen = @{}
            foreach ($finding in ($Findings | Sort-Object Priority, FindingId)) {
                if ($null -eq $finding) { continue }
                $key = '{0}|{1}|{2}' -f $finding.Category, $finding.Title, $finding.Description
                if (-not $seen.ContainsKey($key)) { $seen[$key] = $finding }
            }
            $result = [System.Collections.Generic.List[object]]::new()
            foreach ($item in $seen.Values) { $result.Add($item) }
            return $result
        }

        $findingsList = @(
            [pscustomobject]@{ FindingId = 'F1'; Category = 'Disk'; Title = 'Low Space'; Description = 'Disk C: is low'; Priority = 10 },
            [pscustomobject]@{ FindingId = 'F1'; Category = 'Disk'; Title = 'Low Space'; Description = 'Disk C: is low'; Priority = 10 },
            [pscustomobject]@{ FindingId = 'F2'; Category = 'Sec'; Title = 'Firewall'; Description = 'FW Disabled'; Priority = 20 }
        )

        $dedup = Get-MhaDeduplicatedFindings -Findings $findingsList
        $dedup.Count | Should Be 2
    }
}
