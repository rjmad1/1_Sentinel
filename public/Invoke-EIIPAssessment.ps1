#requires -Version 5.1
<#
.SYNOPSIS
    Enterprise Machine Health Assessment Framework
.DESCRIPTION
    Read-only enterprise machine assessment framework for Windows-first environments.
    Supports:
        - Windows 10 / 11
        - Windows Server 2019 / 2022
    Graceful degradation on Linux/macOS.

    This script orchestrates:
        - Environment detection
        - Evidence collection
        - Domain analysis
        - Correlation
        - Risk scoring
        - Health scoring
        - Report generation
        - Export

    All modules are consolidated inline. No external module files required.
.NOTES
    Assessment only.
    No destructive actions.
    No configuration changes.
    No remediation execution.
#>
[CmdletBinding()]
param(
    [ValidateSet('ReadOnly','Audit','DeepAudit')]
    [string]$ExecutionMode = 'Audit',

    [ValidateSet('HTML','Markdown','JSON','All')]
    [string]$OutputFormat = 'All',

    [string]$OutputPath = "$env:TEMP\MachineHealthReport",

    [switch]$IncludeSecurityScan,
    [switch]$IncludeNetworkAnalysis,
    [switch]$IncludeCapacityAnalysis,
    [switch]$IncludeRemediationGuidance,
    [switch]$VerboseLogging,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

#region ── Script-level state ─────────────────────────────────────────────────

$script:FrameworkVersion  = '1.0.0'
$script:AssessmentStart   = Get-Date
$script:MhaLogFile        = $null
$script:MhaVerboseEnabled = $false

#endregion

#region ══════════════════════════════════════════════════════════════════════
#  CORE  (MachineHealthAssessment.Core.psm1)
#══════════════════════════════════════════════════════════════════════════════

enum MhaSeverity {
    Critical
    High
    Medium
    Low
    Informational
}

enum MhaConfidence {
    High
    Medium
    Low
    Unknown
}

enum MhaValidationState {
    Validated
    Partial
    Missing
    Failed
    Unsupported
}

function Initialize-MhaLogging {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$LogPath,
        [switch]$VerboseEnabled
    )
    $script:MhaLogFile        = $LogPath
    $script:MhaVerboseEnabled = [bool]$VerboseEnabled
    $dir = Split-Path -Parent $LogPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    "[$(Get-Date -Format s)] [Info] Logging initialized." |
        Out-File -FilePath $script:MhaLogFile -Encoding utf8 -Force
}

function Write-MhaLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [ValidateSet('Info','Warn','Error','Debug')] [string]$Level,
        [Parameter(Mandatory)] [string]$Message
    )
    $line = "[$(Get-Date -Format s)] [$Level] $Message"
    if ($script:MhaLogFile) {
        $line | Out-File -FilePath $script:MhaLogFile -Append -Encoding utf8
    }
    if ($script:MhaVerboseEnabled -or $Level -in @('Warn','Error')) {
        switch ($Level) {
            'Info'  { Write-Verbose $Message }
            'Warn'  { Write-Warning $Message }
            'Error' {
                # Override $ErrorActionPreference locally so Write-Error does not terminate
                # even when the caller has set $ErrorActionPreference = 'Stop'.
                $local:ErrorActionPreference = 'Continue'
                Write-Error $Message
            }
            'Debug' { Write-Verbose "DEBUG: $Message" }
        }
    }
}

function New-MhaEvidenceRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Name,
        [Parameter()]          [AllowNull()] $Value,
        [ValidateSet('Validated','Partial','Missing','Failed','Unsupported')]
        [string]$ValidationState = 'Validated',
        [string]$Collector  = '',
        [string]$Notes      = '',
        [string]$Timestamp  = (Get-Date).ToString('o')
    )
    [pscustomobject]@{
        Source          = $Source
        Name            = $Name
        Value           = $Value
        ValidationState = $ValidationState
        Collector       = $Collector
        Notes           = $Notes
        Timestamp       = $Timestamp
    }
}

function New-MhaFinding {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$FindingId,
        [Parameter(Mandatory)] [string]$Category,
        [Parameter(Mandatory)] [ValidateSet('Critical','High','Medium','Low','Informational')] [string]$Severity,
        [Parameter(Mandatory)] [ValidateSet('High','Medium','Low','Unknown')] [string]$Confidence,
        [Parameter(Mandatory)] [string]$Title,
        [Parameter(Mandatory)] [string]$Description,
        [Parameter(Mandatory)] [object[]]$Evidence,
        [Parameter(Mandatory)] [string]$Impact,
        [Parameter(Mandatory)] [string]$BusinessRisk,
        [Parameter(Mandatory)] [string]$RootCauseHypothesis,
        [Parameter(Mandatory)] [string]$RecommendedRemediation,
        [Parameter(Mandatory)] [ValidateSet('Low','Medium','High')] [string]$EstimatedEffort,
        [Parameter(Mandatory)] [string]$VerificationMethod,
        [string]$Domain   = '',
        [int]   $Priority = -1          # -1 = auto-assign from severity
    )
    # Auto-assign priority from severity so remediation plans sort meaningfully.
    if ($Priority -lt 0) {
        $Priority = switch ($Severity) {
            'Critical'      { 10 }
            'High'          { 20 }
            'Medium'        { 50 }
            'Low'           { 80 }
            'Informational' { 90 }
            default         { 100 }
        }
    }
    [pscustomobject]@{
        FindingId              = $FindingId
        Category               = $Category
        Domain                 = $Domain
        Severity               = $Severity
        Confidence             = $Confidence
        Priority               = $Priority
        Title                  = $Title
        Description            = $Description
        Evidence               = $Evidence
        Impact                 = $Impact
        BusinessRisk           = $BusinessRisk
        RootCauseHypothesis    = $RootCauseHypothesis
        RecommendedRemediation = $RecommendedRemediation
        EstimatedEffort        = $EstimatedEffort
        VerificationMethod     = $VerificationMethod
        CreatedOn              = (Get-Date).ToString('o')
    }
}

function New-MhaCollectorFailure {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$Collector,
        [Parameter(Mandatory)] [string]$Scope,
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet('High','Medium','Low','Unknown')] [string]$Confidence = 'High',
        [string]$ExceptionType   = '',
        [string]$Recommendation  = 'Review permissions, telemetry availability, and platform support.'
    )
    [pscustomobject]@{
        Collector      = $Collector
        Scope          = $Scope
        Message        = $Message
        Confidence     = $Confidence
        ExceptionType  = $ExceptionType
        Recommendation = $Recommendation
        Timestamp      = (Get-Date).ToString('o')
    }
}

function Get-MhaEvidenceValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$RawEvidence,
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Name
    )
    $record = $RawEvidence |
        Where-Object { $_.Source -eq $Source -and $_.Name -eq $Name } |
        Select-Object -First 1
    if ($null -eq $record) { return $null }
    return $record.Value
}

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

function Test-MhaEvidenceCollection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$RawEvidence,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$CollectorFailures
    )
    $messages           = [System.Collections.Generic.List[object]]::new()
    $validationFindings = [System.Collections.Generic.List[object]]::new()

    if ($RawEvidence.Count -eq 0) {
        $validationFindings.Add(
            (New-MhaFinding `
                -FindingId   'EVIDENCE-0001' `
                -Category    'EvidenceQuality' `
                -Domain      'Framework' `
                -Severity    'High' `
                -Confidence  'High' `
                -Title       'No evidence collected' `
                -Description 'Assessment completed without raw evidence.' `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Framework' -Name 'RawEvidenceCount' -Value 0 -ValidationState 'Failed')) `
                -Impact      'No validated findings can be produced with confidence.' `
                -BusinessRisk           'Decision-making based on incomplete assessment output.' `
                -RootCauseHypothesis    'Collector initialization or execution failure.' `
                -RecommendedRemediation 'Review logs and collector initialization path. Re-run with verbose logging.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Verify raw evidence artifacts contain source records.'
            )
        )
    }

    foreach ($failure in $CollectorFailures) {
        $messages.Add($failure)
        $validationFindings.Add(
            (New-MhaFinding `
                -FindingId   ("COLLECTOR-" + ($failure.Collector -replace '\W','').ToUpper() + "-FAIL") `
                -Category    'CollectorFailure' `
                -Domain      'Framework' `
                -Severity    'Medium' `
                -Confidence  $failure.Confidence `
                -Title       "Collector limitation or failure: $($failure.Collector)" `
                -Description $failure.Message `
                -Evidence    @(
                    (New-MhaEvidenceRecord -Source 'CollectorFailure' -Name $failure.Collector `
                        -Value $failure.Message -ValidationState 'Failed' -Collector $failure.Collector)
                ) `
                -Impact      'Assessment coverage is reduced in the affected scope.' `
                -BusinessRisk           'Hidden machine health issues may remain undetected.' `
                -RootCauseHypothesis    $failure.ExceptionType `
                -RecommendedRemediation $failure.Recommendation `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Correct the collector issue and re-run the assessment.'
            )
        )
    }

    [pscustomobject]@{
        Messages           = $messages
        ValidationFindings = $validationFindings
    }
}

function Get-MhaDeduplicatedFindings {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings
    )
    # Guard against null or empty input before Sort-Object, which would throw in StrictMode.
    if (-not $Findings -or $Findings.Count -eq 0) {
        return [System.Collections.Generic.List[object]]::new()
    }
    $seen = @{}
    # Sort by numeric Priority (auto-assigned from severity), then by FindingId for stable order.
    foreach ($finding in ($Findings | Sort-Object Priority, FindingId)) {
        if ($null -eq $finding) { continue }
        $key = '{0}|{1}|{2}' -f $finding.Category, $finding.Title, $finding.Description
        if (-not $seen.ContainsKey($key)) { $seen[$key] = $finding }
    }
    # Explicitly build a List[object] from the ValueCollection so callers can call .Add().
    $result = [System.Collections.Generic.List[object]]::new()
    foreach ($item in $seen.Values) { $result.Add($item) }
    return $result
}

function New-MhaDefaultHealthScore {
    [pscustomobject]@{
        Formula              = 'Default fallback score'
        OverallHealthScore   = 0
        PerformanceScore     = 0
        SecurityScore        = 0
        ReliabilityScore     = 0
        ScalabilityScore     = 0
        ServiceabilityScore  = 0
        UsabilityScore       = 0
    }
}

function New-MhaEmptyCapacityForecast {
    [pscustomobject]@{
        Storage = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence='Unknown'; Note='No verified information.' }
        Memory  = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence='Unknown'; Note='No verified information.' }
        CPU     = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence='Unknown'; Note='No verified information.' }
    }
}

#endregion Core

#region ══════════════════════════════════════════════════════════════════════
#  ENVIRONMENT  (MachineHealthAssessment.Environment.psm1)
#══════════════════════════════════════════════════════════════════════════════

function Get-MhaEnvironmentOverview {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [ValidateSet('ReadOnly','Audit','DeepAudit')] [string]$ExecutionMode
    )
    $platformFamily = if ($IsWindows) { 'Windows' } elseif ($IsLinux) { 'Linux' } elseif ($IsMacOS) { 'macOS' } else { 'Unknown' }

    $admin = $false
    if ($IsWindows) {
        try {
            $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
            $principal = [Security.Principal.WindowsPrincipal]::new($identity)
            $admin     = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        } catch { $admin = $false }
    }

    $osCaption = $null; $osVersion = $null; $osBuild = $null
    $manufacturer = $null; $model = $null; $serial = $null; $lastBoot = $null
    $supportedPlatform = $false

    if ($IsWindows) {
        try {
            $os   = Get-CimInstance -ClassName Win32_OperatingSystem
            $cs   = Get-CimInstance -ClassName Win32_ComputerSystem
            $bios = Get-CimInstance -ClassName Win32_BIOS
            $osCaption    = $os.Caption
            $osVersion    = $os.Version
            $osBuild      = $os.BuildNumber
            $manufacturer = $cs.Manufacturer
            $model        = $cs.Model
            $serial       = $bios.SerialNumber
            $lastBoot     = $os.LastBootUpTime
        } catch {
            Write-MhaLog -Level Warn -Message "Failed to read core environment CIM data: $($_.Exception.Message)"
        }
        if ($osCaption -match 'Windows 10|Windows 11|Windows Server 2019|Windows Server 2022') {
            $supportedPlatform = $true
        }
    }

    [pscustomobject]@{
        Source              = 'EnvironmentOverview'
        PlatformFamily      = $platformFamily
        SupportedPlatform   = $supportedPlatform
        ExecutionMode       = $ExecutionMode
        IsElevated          = $admin
        ComputerName        = $env:COMPUTERNAME
        UserName            = [System.Environment]::UserName
        Domain              = $env:USERDOMAIN
        PowerShellVersion   = $PSVersionTable.PSVersion.ToString()
        OSName              = $osCaption
        OSVersion           = $osVersion
        OSBuild             = $osBuild
        Manufacturer        = $manufacturer
        Model               = $model
        SerialNumber        = $serial
        LastBootTime        = $lastBoot
        CollectionTimestamp = (Get-Date).ToString('o')
    }
}

#endregion Environment

#region ══════════════════════════════════════════════════════════════════════
#  COLLECTORS – WINDOWS  (MachineHealthAssessment.Collectors.Windows.psm1)
#══════════════════════════════════════════════════════════════════════════════

function Invoke-MhaWindowsEvidenceCollection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [ValidateSet('ReadOnly','Audit','DeepAudit')] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $rawEvidence      = [System.Collections.Generic.List[object]]::new()
    $collectorFailures = [System.Collections.Generic.List[object]]::new()

    $collectors = @(
        'Get-OperatingSystemEvidence',
        'Get-ProcessorEvidence',
        'Get-MemoryEvidence',
        'Get-DiskEvidence',
        'Get-NetworkEvidence',
        'Get-ServiceEvidence',
        'Get-StartupEvidence',
        'Get-SecurityEvidence',
        'Get-EventLogEvidence',
        'Get-InstalledSoftwareEvidence'
    )

    foreach ($collector in $collectors) {
        try {
            Write-MhaLog -Level Info -Message "Running collector: $collector"
            $result = & $collector `
                -Environment            $Environment `
                -ExecutionMode          $ExecutionMode `
                -IncludeSecurityScan:$IncludeSecurityScan `
                -IncludeNetworkAnalysis:$IncludeNetworkAnalysis `
                -IncludeCapacityAnalysis:$IncludeCapacityAnalysis
            foreach ($item in $result) { $rawEvidence.Add($item) }
        } catch {
            $collectorFailures.Add(
                (New-MhaCollectorFailure `
                    -Collector     $collector `
                    -Scope         'WindowsEvidenceCollection' `
                    -Message       $_.Exception.Message `
                    -ExceptionType $_.Exception.GetType().FullName
                )
            )
        }
    }

    [pscustomobject]@{
        RawEvidence       = $rawEvidence
        CollectorFailures = $collectorFailures
    }
}

function Get-OperatingSystemEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()
    $os   = Get-CimInstance Win32_OperatingSystem
    $cs   = Get-CimInstance Win32_ComputerSystem
    $bios = Get-CimInstance Win32_BIOS

    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'Caption'                   -Value $os.Caption))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'Version'                   -Value $os.Version))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'BuildNumber'               -Value $os.BuildNumber))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'InstallDate'               -Value $os.InstallDate))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'LastBootUpTime'            -Value $os.LastBootUpTime))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'FreePhysicalMemoryKB'      -Value $os.FreePhysicalMemory))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'TotalVisibleMemoryKB'      -Value $os.TotalVisibleMemorySize))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'FreeVirtualMemoryKB'       -Value $os.FreeVirtualMemory))
    $output.Add((New-MhaEvidenceRecord -Source 'OS' -Name 'FreeSpaceInPagingFilesKB'  -Value $os.FreeSpaceInPagingFiles))

    $output.Add((New-MhaEvidenceRecord -Source 'ComputerSystem' -Name 'Manufacturer'        -Value $cs.Manufacturer))
    $output.Add((New-MhaEvidenceRecord -Source 'ComputerSystem' -Name 'Model'               -Value $cs.Model))
    $output.Add((New-MhaEvidenceRecord -Source 'ComputerSystem' -Name 'TotalPhysicalMemory' -Value $cs.TotalPhysicalMemory))

    $output.Add((New-MhaEvidenceRecord -Source 'BIOS' -Name 'SerialNumber' -Value $bios.SerialNumber))

    return $output
}

function Get-ProcessorEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()
    $cpu = Get-CimInstance Win32_Processor

    # Guard: CIM query may return nothing on a severely degraded system.
    if (-not $cpu) {
        $output.Add((New-MhaEvidenceRecord -Source 'CPU' -Name 'ProcessorName' -Value $null -ValidationState 'Failed' -Notes 'Win32_Processor CIM query returned no results.'))
        return $output
    }

    $output.Add((New-MhaEvidenceRecord -Source 'CPU' -Name 'ProcessorName'             -Value ($cpu.Name -join '; ')))
    $output.Add((New-MhaEvidenceRecord -Source 'CPU' -Name 'NumberOfCores'             -Value (($cpu | Measure-Object -Property NumberOfCores -Sum).Sum)))
    $output.Add((New-MhaEvidenceRecord -Source 'CPU' -Name 'NumberOfLogicalProcessors' -Value (($cpu | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum)))
    $output.Add((New-MhaEvidenceRecord -Source 'CPU' -Name 'MaxClockSpeedMHz'          -Value (($cpu | Measure-Object -Property MaxClockSpeed -Maximum).Maximum)))

    try {
        $samples = switch ($ExecutionMode) { 'ReadOnly' { 2 } 'Audit' { 3 } 'DeepAudit' { 5 } }
        $counters = @(
            '\Processor(_Total)\% Processor Time',
            '\System\Processor Queue Length',
            '\Processor(_Total)\% Interrupt Time'
        )
        $counterResult = Get-Counter -Counter $counters -SampleInterval 2 -MaxSamples $samples
        $all = foreach ($s in $counterResult.CounterSamples) {
            [pscustomobject]@{ Path = $s.Path; Value = [math]::Round($s.CookedValue, 2) }
        }
        $output.Add((New-MhaEvidenceRecord -Source 'CPUCounter' -Name 'Samples' -Value $all))
    } catch {
        # Common cause: counter names are localized on non-English Windows editions.
        # On non-English systems the counter path differs (e.g. German: \Prozessor(_Total)\...).
        $errNote = "[$($_.Exception.GetType().Name)] $($_.Exception.Message). Counter names are locale-specific; non-English OS may require translated paths."
        $output.Add((New-MhaEvidenceRecord -Source 'CPUCounter' -Name 'Samples' -Value $null -ValidationState 'Failed' -Notes $errNote))
    }

    return $output
}

function Get-MemoryEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()

    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $output.Add((New-MhaEvidenceRecord -Source 'Memory' -Name 'FreePhysicalMemoryKB'     -Value $os.FreePhysicalMemory))
        $output.Add((New-MhaEvidenceRecord -Source 'Memory' -Name 'TotalVisibleMemoryKB'     -Value $os.TotalVisibleMemorySize))
        $output.Add((New-MhaEvidenceRecord -Source 'Memory' -Name 'FreeVirtualMemoryKB'      -Value $os.FreeVirtualMemory))
        $output.Add((New-MhaEvidenceRecord -Source 'Memory' -Name 'FreeSpaceInPagingFilesKB' -Value $os.FreeSpaceInPagingFiles))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Memory' -Name 'CoreMetrics' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $samples = switch ($ExecutionMode) { 'ReadOnly' { 2 } 'Audit' { 3 } 'DeepAudit' { 5 } }
        $counters = @(
            '\Memory\Available MBytes',
            '\Memory\Pages/sec',
            '\Memory\Pool Nonpaged Bytes',
            '\Memory\Pool Paged Bytes',
            '\Memory\Committed Bytes',
            '\Memory\Commit Limit'
        )
        $counterResult = Get-Counter -Counter $counters -SampleInterval 2 -MaxSamples $samples
        $all = foreach ($s in $counterResult.CounterSamples) {
            [pscustomobject]@{ Path = $s.Path; Value = [math]::Round($s.CookedValue, 2) }
        }
        $output.Add((New-MhaEvidenceRecord -Source 'MemoryCounter' -Name 'Samples' -Value $all))
    } catch {
        $errNote = "[$($_.Exception.GetType().Name)] $($_.Exception.Message). Counter names are locale-specific; non-English OS may require translated paths."
        $output.Add((New-MhaEvidenceRecord -Source 'MemoryCounter' -Name 'Samples' -Value $null -ValidationState 'Failed' -Notes $errNote))
    }

    return $output
}

function Get-DiskEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()
    $logical  = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
    $physical = Get-CimInstance Win32_DiskDrive

    $output.Add((New-MhaEvidenceRecord -Source 'Disk' -Name 'LogicalDisks'  -Value $logical))
    $output.Add((New-MhaEvidenceRecord -Source 'Disk' -Name 'PhysicalDisks' -Value $physical))

    try {
        $samples = switch ($ExecutionMode) { 'ReadOnly' { 2 } 'Audit' { 3 } 'DeepAudit' { 5 } }
        $counters = @(
            '\LogicalDisk(_Total)\% Free Space',
            '\PhysicalDisk(_Total)\Avg. Disk sec/Read',
            '\PhysicalDisk(_Total)\Avg. Disk sec/Write',
            '\PhysicalDisk(_Total)\Disk Reads/sec',
            '\PhysicalDisk(_Total)\Disk Writes/sec',
            '\PhysicalDisk(_Total)\Current Disk Queue Length'
        )
        $counterResult = Get-Counter -Counter $counters -SampleInterval 2 -MaxSamples $samples
        $all = foreach ($s in $counterResult.CounterSamples) {
            [pscustomobject]@{ Path = $s.Path; Value = [math]::Round($s.CookedValue, 4) }
        }
        $output.Add((New-MhaEvidenceRecord -Source 'DiskCounter' -Name 'Samples' -Value $all))
    } catch {
        $errNote = "[$($_.Exception.GetType().Name)] $($_.Exception.Message). Counter names are locale-specific; non-English OS may require translated paths."
        $output.Add((New-MhaEvidenceRecord -Source 'DiskCounter' -Name 'Samples' -Value $null -ValidationState 'Failed' -Notes $errNote))
    }

    return $output
}

function Get-NetworkEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output   = [System.Collections.Generic.List[object]]::new()
    $adapters = Get-NetAdapter -ErrorAction SilentlyContinue
    $ipconfig = Get-NetIPConfiguration -ErrorAction SilentlyContinue

    $output.Add((New-MhaEvidenceRecord -Source 'Network' -Name 'Adapters'       -Value $adapters -ValidationState $(if ($adapters) { 'Validated' } else { 'Partial' })))
    $output.Add((New-MhaEvidenceRecord -Source 'Network' -Name 'IPConfiguration' -Value $ipconfig -ValidationState $(if ($ipconfig) { 'Validated' } else { 'Partial' })))

    if ($IncludeNetworkAnalysis) {
        try {
            $samples = switch ($ExecutionMode) { 'ReadOnly' { 2 } 'Audit' { 3 } 'DeepAudit' { 5 } }
            $counters = @(
                '\Network Interface(*)\Bytes Total/sec',
                '\TCPv4\Segments Retransmitted/sec',
                '\IPv4\Datagrams Received Discarded',
                '\IPv4\Datagrams Outbound Discarded'
            )
            $counterResult = Get-Counter -Counter $counters -SampleInterval 2 -MaxSamples $samples
            $all = foreach ($s in $counterResult.CounterSamples) {
                [pscustomobject]@{ Path = $s.Path; Value = [math]::Round($s.CookedValue, 2) }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'NetworkCounter' -Name 'Samples' -Value $all))
        } catch {
            $errNote = "[$($_.Exception.GetType().Name)] $($_.Exception.Message). Counter names are locale-specific; non-English OS may require translated paths."
        $output.Add((New-MhaEvidenceRecord -Source 'NetworkCounter' -Name 'Samples' -Value $null -ValidationState 'Failed' -Notes $errNote))
        }
    }

    return $output
}

function Get-ServiceEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()
    $services   = Get-Service | Select-Object Name, DisplayName, Status, StartType
    # StartType can be $null for driver services or kernel services — guard before comparing.
    $failedAuto = $services | Where-Object { $null -ne $_.StartType -and $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' }

    $output.Add((New-MhaEvidenceRecord -Source 'Service' -Name 'AllServices'                  -Value $services))
    $output.Add((New-MhaEvidenceRecord -Source 'Service' -Name 'AutomaticServicesNotRunning'  -Value $failedAuto))

    return $output
}

function Get-StartupEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()

    try {
        $startup = Get-CimInstance Win32_StartupCommand
        $output.Add((New-MhaEvidenceRecord -Source 'Startup' -Name 'StartupCommands' -Value $startup))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Startup' -Name 'StartupCommands' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $tasks = Get-ScheduledTask | Where-Object { $_.State -in @('Ready','Running') }
        $output.Add((New-MhaEvidenceRecord -Source 'Startup' -Name 'ScheduledTasks' -Value $tasks))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Startup' -Name 'ScheduledTasks' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    return $output
}

function Get-SecurityEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()

    try {
        $defender = Get-MpComputerStatus -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'DefenderStatus' -Value $defender))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'DefenderStatus' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $fw = Get-NetFirewallProfile -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'FirewallProfiles' -Value $fw))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'FirewallProfiles' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $bitlocker = Get-BitLockerVolume -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'BitLockerVolumes' -Value $bitlocker))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'BitLockerVolumes' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $tpm = Get-Tpm -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'TPM' -Value $tpm))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'TPM' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        # Resolve the Administrators group by its well-known SID (S-1-5-32-544) so the lookup
        # succeeds on non-English Windows editions where the group name is localised
        # (e.g. German: "Administratoren", French: "Administrateurs").
        $adminSid       = [Security.Principal.SecurityIdentifier]'S-1-5-32-544'
        $adminGroupName = ($adminSid.Translate([Security.Principal.NTAccount])).Value.Split('\')[-1]
        $localAdmins    = Get-LocalGroupMember -Group $adminGroupName -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'LocalAdministrators' -Value $localAdmins))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'LocalAdministrators' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $localUsers = Get-LocalUser -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'LocalUsers' -Value $localUsers))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'LocalUsers' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    try {
        $tcp = Get-NetTCPConnection -State Listen -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'ListeningTcpPorts' -Value $tcp))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Security' -Name 'ListeningTcpPorts' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    return $output
}

function Get-EventLogEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output    = [System.Collections.Generic.List[object]]::new()
    $hours     = switch ($ExecutionMode) { 'ReadOnly' { 24 } 'Audit' { 72 } 'DeepAudit' { 168 } }
    $startTime = (Get-Date).AddHours(-1 * $hours)

    try {
        $systemCritical = Get-WinEvent -FilterHashtable @{ LogName='System'; StartTime=$startTime; Level=@(1,2) } -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'SystemCriticalErrorEvents' -Value ($systemCritical | Select-Object -First 500)))
    } catch {
        # Get-WinEvent throws (even with -ErrorAction Stop) when the filter matches zero events.
        # Treat "no events found" as a valid empty result, not a collector failure —
        # otherwise the Serviceability engine raises a false-positive finding every run on a healthy machine.
        if ($_.Exception.Message -match 'No events were found') {
            $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'SystemCriticalErrorEvents' -Value @() -ValidationState 'Validated' -Notes 'No critical or error events in the assessed window.'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'SystemCriticalErrorEvents' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
        }
    }

    try {
        $applicationCritical = Get-WinEvent -FilterHashtable @{ LogName='Application'; StartTime=$startTime; Level=@(1,2) } -ErrorAction Stop
        $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'ApplicationCriticalErrorEvents' -Value ($applicationCritical | Select-Object -First 500)))
    } catch {
        if ($_.Exception.Message -match 'No events were found') {
            $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'ApplicationCriticalErrorEvents' -Value @() -ValidationState 'Validated' -Notes 'No critical or error events in the assessed window.'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'EventLog' -Name 'ApplicationCriticalErrorEvents' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
        }
    }

    return $output
}

function Get-InstalledSoftwareEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis
    )
    $output = [System.Collections.Generic.List[object]]::new()

    # 1. Registry Installed Applications
    try {
        $paths = @(
            'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
            'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
        )
        $apps = foreach ($path in $paths) {
            Get-ItemProperty $path -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName } |
                Select-Object DisplayName, DisplayVersion, Publisher, InstallDate
        }
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'InstalledApplications' -Value $apps))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'InstalledApplications' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 2. Windows Store Apps
    try {
        $storeApps = if ($Environment.IsElevated) {
            Get-AppxPackage -AllUsers -ErrorAction SilentlyContinue | Select-Object Name, Publisher, Version
        } else {
            Get-AppxPackage -ErrorAction SilentlyContinue | Select-Object Name, Publisher, Version
        }
        $valState = if ($storeApps) { 'Validated' } else { 'Missing' }
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'StoreApps' -Value $storeApps -ValidationState $valState))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'StoreApps' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 3. Winget Packages
    try {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            # Run winget list with source agreements accepted to prevent interactive prompts
            $wingetOut = winget list --accept-source-agreements --accept-package-agreements -e -s winget -s msstore 2>$null
            $wingetData = @()
            if ($wingetOut) {
                # Simple parsing of table headers: Name Id Version Available Source
                $lines = $wingetOut | Where-Object { $_ -match '\S' }
                if ($lines.Count -gt 2) {
                    $headerLine = $lines[0]
                    # Find positions
                    $posId = $headerLine.IndexOf("Id")
                    $posVer = $headerLine.IndexOf("Version")
                    $posAvail = $headerLine.IndexOf("Available")
                    $posSrc = $headerLine.IndexOf("Source")
                    
                    if ($posId -gt 0 -and $posVer -gt 0) {
                        for ($i = 2; $i -lt $lines.Count; $i++) {
                            $line = $lines[$i]
                            if ($line.Length -gt $posSrc) {
                                $name = $line.Substring(0, $posId).Trim()
                                $id = $line.Substring($posId, $posVer - $posId).Trim()
                                $ver = $line.Substring($posVer, $posAvail - $posVer).Trim()
                                $avail = $line.Substring($posAvail, $posSrc - $posAvail).Trim()
                                $src = $line.Substring($posSrc).Trim()
                                $wingetData += [pscustomobject]@{ Name = $name; Id = $id; Version = $ver; Available = $avail; Source = $src }
                            }
                        }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WingetPackages' -Value $wingetData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WingetPackages' -Value $null -ValidationState 'Unsupported' -Notes 'Winget command is not available.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WingetPackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 4. Chocolatey Packages
    try {
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            $chocoOut = choco list -l -r 2>$null
            $chocoData = @()
            if ($chocoOut) {
                foreach ($line in $chocoOut) {
                    if ($line -match '^([^|]+)\|([^|]+)$') {
                        $chocoData += [pscustomobject]@{ Name = $Matches[1]; Version = $Matches[2] }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ChocolateyPackages' -Value $chocoData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ChocolateyPackages' -Value $null -ValidationState 'Unsupported' -Notes 'Chocolatey is not installed.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ChocolateyPackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 5. Scoop Packages
    try {
        if (Get-Command scoop -ErrorAction SilentlyContinue) {
            $scoopOut = scoop list 2>$null
            $scoopData = @()
            if ($scoopOut) {
                # Scoop list format: Name Version Source Info
                $lines = $scoopOut | Where-Object { $_ -match '\S' }
                if ($lines.Count -gt 3) {
                    for ($i = 3; $i -lt $lines.Count; $i++) {
                        $parts = $lines[$i] -split '\s+'
                        if ($parts.Count -ge 2) {
                            $scoopData += [pscustomobject]@{ Name = $parts[0]; Version = $parts[1]; Source = $parts[2] }
                        }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ScoopPackages' -Value $scoopData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ScoopPackages' -Value $null -ValidationState 'Unsupported' -Notes 'Scoop is not installed.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'ScoopPackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 6. Python Packages (pip)
    try {
        $pipCmd = $null
        if (Get-Command pip -ErrorAction SilentlyContinue) {
            $pipCmd = "pip"
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            $pipCmd = "python -m pip"
        }

        if ($pipCmd) {
            $pipOut = Invoke-Expression "$pipCmd list --format=json" -ErrorAction SilentlyContinue
            $pipData = @()
            if ($pipOut) {
                try {
                    $pipData = $pipOut | ConvertFrom-Json
                } catch {
                    $lines = Invoke-Expression "$pipCmd list" -ErrorAction SilentlyContinue
                    if ($lines -and $lines.Count -gt 2) {
                        for ($i = 2; $i -lt $lines.Count; $i++) {
                            $parts = $lines[$i] -split '\s+'
                            if ($parts.Count -ge 2) {
                                $pipData += [pscustomobject]@{ name = $parts[0]; version = $parts[1] }
                            }
                        }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'PythonPackages' -Value $pipData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'PythonPackages' -Value $null -ValidationState 'Unsupported' -Notes 'Python/pip is not installed or not in PATH.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'PythonPackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 7. Node Packages (npm global)
    try {
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            $npmOut = npm list -g --depth=0 --json 2>$null
            $npmData = @()
            if ($npmOut) {
                try {
                    $parsedNpm = $npmOut | ConvertFrom-Json
                    if ($parsedNpm.dependencies) {
                        foreach ($depName in $parsedNpm.dependencies.psobject.properties.Name) {
                            $dep = $parsedNpm.dependencies.$depName
                            $npmData += [pscustomobject]@{ Name = $depName; Version = $dep.version }
                        }
                    }
                } catch {
                    # Silently ignore json parse error
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'NodePackages' -Value $npmData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'NodePackages' -Value $null -ValidationState 'Unsupported' -Notes 'Node.js/npm is not installed.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'NodePackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 8. Docker Images & Containers
    try {
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            $imagesOut = docker images --format "{{.Repository}}|{{.Tag}}|{{.ID}}|{{.Size}}" 2>$null
            $imagesData = @()
            if ($imagesOut) {
                foreach ($line in $imagesOut) {
                    $parts = $line -split '\|'
                    if ($parts.Count -ge 4) {
                        $imagesData += [pscustomobject]@{ Repository = $parts[0]; Tag = $parts[1]; ImageId = $parts[2]; Size = $parts[3] }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DockerImages' -Value $imagesData -ValidationState 'Validated'))

            $containersOut = docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.ID}}" 2>$null
            $containersData = @()
            if ($containersOut) {
                foreach ($line in $containersOut) {
                    $parts = $line -split '\|'
                    if ($parts.Count -ge 4) {
                        $containersData += [pscustomobject]@{ Name = $parts[0]; Image = $parts[1]; Status = $parts[2]; ContainerId = $parts[3] }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DockerContainers' -Value $containersData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DockerImages' -Value $null -ValidationState 'Unsupported' -Notes 'Docker is not installed or service is offline.'))
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DockerContainers' -Value $null -ValidationState 'Unsupported' -Notes 'Docker is not installed or service is offline.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DockerImages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 9. VS Code Extensions
    try {
        $extData = @()
        if (Get-Command code -ErrorAction SilentlyContinue) {
            $codeOut = code --list-extensions --show-versions 2>$null
            if ($codeOut) {
                foreach ($line in $codeOut) {
                    if ($line -match '^([^@]+)@([^@]+)$') {
                        $extData += [pscustomobject]@{ Id = $Matches[1]; Version = $Matches[2] }
                    }
                }
            }
        }
        if ($extData.Count -eq 0) {
            $extDir = Join-Path $env:USERPROFILE ".vscode\extensions"
            if (Test-Path $extDir) {
                $dirs = Get-ChildItem -Path $extDir -Directory
                foreach ($dir in $dirs) {
                    if ($dir.Name -match '^(.+)-(\d+\.\d+\.\d+.*)$') {
                        $extData += [pscustomobject]@{ Id = $Matches[1]; Version = $Matches[2] }
                    }
                }
            }
        }
        $valState = if ($extData) { 'Validated' } else { 'Missing' }
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'VSCodeExtensions' -Value $extData -ValidationState $valState))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'VSCodeExtensions' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 10. WSL Packages (dpkg)
    try {
        if (Get-Command wsl -ErrorAction SilentlyContinue) {
            $wslList = wsl --list --quiet 2>$null
            $wslData = @()
            if ($wslList) {
                $wslOut = wsl dpkg-query -W -f='${Package}|${Version}\n' 2>$null
                if ($wslOut) {
                    foreach ($line in $wslOut) {
                        $parts = $line.Trim() -split '\|'
                        if ($parts.Count -ge 2) {
                            $wslData += [pscustomobject]@{ Name = $parts[0]; Version = $parts[1] }
                        }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WSLPackages' -Value $wslData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WSLPackages' -Value $null -ValidationState 'Unsupported' -Notes 'WSL is not enabled or not installed.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'WSLPackages' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 11. PowerShell Modules
    try {
        $modules = Get-Module -ListAvailable -ErrorAction SilentlyContinue | Select-Object Name, Version -Unique
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'PowerShellModules' -Value $modules -ValidationState 'Validated'))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'PowerShellModules' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 12. .NET SDKs
    try {
        if (Get-Command dotnet -ErrorAction SilentlyContinue) {
            $dotnetOut = dotnet --list-sdks 2>$null
            $dotnetData = @()
            if ($dotnetOut) {
                foreach ($line in $dotnetOut) {
                    if ($line -match '^([\d\.\-\w]+)\s+\[(.*)\]$') {
                        $dotnetData += [pscustomobject]@{ Version = $Matches[1]; Path = $Matches[2] }
                    }
                }
            }
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DotNetSdks' -Value $dotnetData -ValidationState 'Validated'))
        } else {
            $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DotNetSdks' -Value $null -ValidationState 'Unsupported' -Notes '.NET Core SDK is not installed.'))
        }
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'DotNetSdks' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    # 13. Java JDKs
    try {
        $javaData = @()
        if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
            $javaData += [pscustomobject]@{ Path = $env:JAVA_HOME; Source = 'JAVA_HOME Env' }
        }
        $commonJavaPath = "C:\Program Files\Java"
        if (Test-Path $commonJavaPath) {
            $subdirs = Get-ChildItem -Path $commonJavaPath -Directory -ErrorAction SilentlyContinue
            foreach ($s in $subdirs) {
                $javaData += [pscustomobject]@{ Path = $s.FullName; Source = 'Program Files Scan' }
            }
        }
        $valState = if ($javaData) { 'Validated' } else { 'Missing' }
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'JavaJdks' -Value $javaData -ValidationState $valState))
    } catch {
        $output.Add((New-MhaEvidenceRecord -Source 'Software' -Name 'JavaJdks' -Value $null -ValidationState 'Failed' -Notes $_.Exception.Message))
    }

    return $output
}

#endregion Collectors

#region ══════════════════════════════════════════════════════════════════════
#  ANALYSIS  (MachineHealthAssessment.Analysis.psm1)
#══════════════════════════════════════════════════════════════════════════════

function Invoke-MhaAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] [ValidateSet('ReadOnly','Audit','DeepAudit')] [string]$ExecutionMode,
        [switch]$IncludeSecurityScan,
        [switch]$IncludeNetworkAnalysis,
        [switch]$IncludeCapacityAnalysis,
        [switch]$IncludeRemediationGuidance
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    foreach ($item in (Invoke-MhaPerformanceAssessment   -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }
    foreach ($item in (Invoke-MhaSecurityAssessment      -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }
    foreach ($item in (Invoke-MhaReliabilityAssessment   -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }
    foreach ($item in (Invoke-MhaScalabilityAssessment   -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }
    foreach ($item in (Invoke-MhaServiceabilityAssessment -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }
    foreach ($item in (Invoke-MhaUsabilityAssessment     -RawEvidence $RawEvidence -Environment $Environment)) { $findings.Add($item) }

    [pscustomobject]@{ Findings = $findings }
}

function Invoke-MhaPerformanceAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $logicalDisks = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Disk' -Name 'LogicalDisks'
    if ($logicalDisks) {
        foreach ($disk in $logicalDisks) {
            # Guard FreeSpace null in addition to Size=0; both can occur on unusual volumes.
            $freePct = if ($null -ne $disk.FreeSpace -and $null -ne $disk.Size -and $disk.Size -gt 0) {
                [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 2)
            } else { $null }
            if ($null -ne $freePct -and $freePct -lt 15) {
                $findings.Add((New-MhaFinding `
                    -FindingId   "PERF-DISKFREE-$($disk.DeviceID -replace ':','')" `
                    -Category    'DiskCapacity' `
                    -Domain      'Performance' `
                    -Severity    'High' `
                    -Confidence  'High' `
                    -Title       "Low free space on $($disk.DeviceID)" `
                    -Description 'The volume has less than 15 percent free space available.' `
                    -Evidence    @(
                        (New-MhaEvidenceRecord -Source 'Disk' -Name 'DeviceID'    -Value $disk.DeviceID),
                        (New-MhaEvidenceRecord -Source 'Disk' -Name 'FreePercent' -Value $freePct)
                    ) `
                    -Impact                 'Low free space can degrade performance, increase fragmentation pressure, and reduce update reliability.' `
                    -BusinessRisk           'Build failures, patching failures, and production instability.' `
                    -RootCauseHypothesis    'Capacity growth exceeded available storage management controls.' `
                    -RecommendedRemediation 'Free disk space, archive stale artifacts, move large datasets, or expand the volume.' `
                    -EstimatedEffort        'Medium' `
                    -VerificationMethod     'Re-run assessment and confirm free space is above threshold.'
                ))
            }
        }
    }

    $cpuCounters = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'CPUCounter' -Name 'Samples'
    if ($cpuCounters) {
        $cpuUsage = $cpuCounters | Where-Object { $_.Path -match '% processor time' }      | Select-Object -ExpandProperty Value
        $queueLen = $cpuCounters | Where-Object { $_.Path -match 'processor queue length' } | Select-Object -ExpandProperty Value

        if ($cpuUsage) {
            $avgCpu = [math]::Round((($cpuUsage | Measure-Object -Average).Average), 2)
            if ($avgCpu -ge 85) {
                $findings.Add((New-MhaFinding `
                    -FindingId   'PERF-CPU-001' `
                    -Category    'CpuSaturation' `
                    -Domain      'Performance' `
                    -Severity    'High' `
                    -Confidence  'Medium' `
                    -Title       'Sustained CPU utilization is elevated' `
                    -Description "Average sampled CPU utilization is $avgCpu percent." `
                    -Evidence    @((New-MhaEvidenceRecord -Source 'CPUCounter' -Name 'AverageCpuPercent' -Value $avgCpu)) `
                    -Impact                 'Sustained CPU pressure can increase latency and reduce workload responsiveness.' `
                    -BusinessRisk           'User slowdown, queue backlogs, and service quality degradation.' `
                    -RootCauseHypothesis    'Insufficient compute headroom or workload contention.' `
                    -RecommendedRemediation 'Review top CPU consumers, tune workloads, and consider scaling or process isolation.' `
                    -EstimatedEffort        'Medium' `
                    -VerificationMethod     'Re-sample CPU counters after remediation.'
                ))
            }
        }

        if ($queueLen) {
            $avgQueue = [math]::Round((($queueLen | Measure-Object -Average).Average), 2)
            if ($avgQueue -ge 4) {
                $findings.Add((New-MhaFinding `
                    -FindingId   'PERF-CPUQUEUE-001' `
                    -Category    'CpuQueue' `
                    -Domain      'Performance' `
                    -Severity    'Medium' `
                    -Confidence  'Medium' `
                    -Title       'Processor queue length is elevated' `
                    -Description "Average sampled processor queue length is $avgQueue." `
                    -Evidence    @((New-MhaEvidenceRecord -Source 'CPUCounter' -Name 'AverageProcessorQueueLength' -Value $avgQueue)) `
                    -Impact                 'Runnable work is waiting for CPU time.' `
                    -BusinessRisk           'Burst workloads may push the machine into visible contention.' `
                    -RootCauseHypothesis    'Thread contention or sustained compute oversubscription.' `
                    -RecommendedRemediation 'Review high-thread processes and right-size workload concurrency.' `
                    -EstimatedEffort        'Medium' `
                    -VerificationMethod     'Confirm processor queue length normalizes after tuning.'
                ))
            }
        }
    }

    return $findings
}

function Invoke-MhaSecurityAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $fw = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'FirewallProfiles'
    if ($fw) {
        $disabledProfiles = $fw | Where-Object { -not $_.Enabled }
        if ($disabledProfiles) {
            $findings.Add((New-MhaFinding `
                -FindingId   'SEC-FW-001' `
                -Category    'Firewall' `
                -Domain      'Security' `
                -Severity    'High' `
                -Confidence  'High' `
                -Title       'One or more firewall profiles are disabled' `
                -Description 'The local firewall is not enabled across all discovered profiles.' `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Security' -Name 'DisabledFirewallProfiles' -Value ($disabledProfiles | Select-Object Name, Enabled))) `
                -Impact                 'Host-based traffic filtering is weakened.' `
                -BusinessRisk           'Increased exposure to lateral movement and unwanted inbound access.' `
                -RootCauseHypothesis    'Firewall baseline drift or intentional weakening for application compatibility.' `
                -RecommendedRemediation 'Re-enable disabled firewall profiles and validate required allow rules.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Confirm all firewall profiles report Enabled=True.'
            ))
        }
    }

    $defender = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'DefenderStatus'
    $rtEnabled = Get-MhaSafeProperty -Object $defender -PropertyName 'RealTimeProtectionEnabled'
    if ($defender -and $rtEnabled -ne $true) {
        $findings.Add((New-MhaFinding `
            -FindingId   'SEC-DEF-001' `
            -Category    'Defender' `
            -Domain      'Security' `
            -Severity    'High' `
            -Confidence  'High' `
            -Title       'Real-time antimalware protection is not enabled' `
            -Description 'Microsoft Defender real-time protection is not enabled.' `
            -Evidence    @((New-MhaEvidenceRecord -Source 'Security' -Name 'RealTimeProtectionEnabled' -Value $rtEnabled)) `
            -Impact                 'Malicious file and process activity may evade real-time interception.' `
            -BusinessRisk           'Increased malware execution risk on the endpoint or server.' `
            -RootCauseHypothesis    'Protection disabled, passive mode, or third-party control overlap.' `
            -RecommendedRemediation 'Validate security platform ownership and ensure real-time protection is enabled or an equivalent control is active.' `
            -EstimatedEffort        'Medium' `
            -VerificationMethod     'Re-run defender status collection and confirm real-time protection is enabled.'
        ))
    }

    $bitlocker = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'BitLockerVolumes'
    if ($bitlocker) {
        $unprotected = $bitlocker | Where-Object { (Get-MhaSafeProperty -Object $_ -PropertyName 'ProtectionStatus') -ne 'On' -and (Get-MhaSafeProperty -Object $_ -PropertyName 'VolumeType') -eq 'OperatingSystem' }
        if ($unprotected) {
            $findings.Add((New-MhaFinding `
                -FindingId   'SEC-BDE-001' `
                -Category    'BitLocker' `
                -Domain      'Security' `
                -Severity    'High' `
                -Confidence  'Medium' `
                -Title       'Operating system volume is not protected by BitLocker' `
                -Description 'An operating system volume does not show active BitLocker protection.' `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Security' -Name 'UnprotectedBitLockerVolumes' -Value ($unprotected | Select-Object MountPoint, ProtectionStatus, VolumeType))) `
                -Impact                 'At-rest protection for local data may be insufficient.' `
                -BusinessRisk           'Data exposure risk after theft, loss, or offline disk access.' `
                -RootCauseHypothesis    'Drive encryption was never enabled or protection is suspended.' `
                -RecommendedRemediation 'Enable and escrow BitLocker protection on operating system volumes where policy requires it.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Verify ProtectionStatus is On for operating system volumes.'
            ))
        }
    }

    $tpm = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'TPM'
    if ($tpm) {
        $tpmPresent = Get-MhaSafeProperty -Object $tpm -PropertyName 'TpmPresent' -DefaultValue $false
        $tpmReady   = Get-MhaSafeProperty -Object $tpm -PropertyName 'TpmReady' -DefaultValue $false
        if ($tpmPresent -ne $true -or $tpmReady -ne $true) {
            $findings.Add((New-MhaFinding `
                -FindingId   'SEC-TPM-001' `
                -Category    'TPM' `
                -Domain      'Security' `
                -Severity    'Medium' `
                -Confidence  'High' `
                -Title       'TPM is absent or not ready' `
                -Description 'The TPM does not report as present and ready.' `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Security' -Name 'TPMStatus' -Value $tpm)) `
                -Impact                 'Hardware-backed trust features may be unavailable or degraded.' `
                -BusinessRisk           'Reduced support for secure boot chains, credential protection, and device encryption scenarios.' `
                -RootCauseHypothesis    'Hardware TPM absent, disabled in firmware, or not provisioned.' `
                -RecommendedRemediation 'Review firmware settings and TPM provisioning state. Enable and initialize TPM where supported.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Confirm TpmPresent=True and TpmReady=True.'
            ))
        }
    }

    $localAdmins = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'LocalAdministrators'
    if ($localAdmins) {
        $adminCount = @($localAdmins).Count
        if ($adminCount -gt 3) {
            $findings.Add((New-MhaFinding `
                -FindingId   'SEC-LADM-001' `
                -Category    'LocalAdministrators' `
                -Domain      'Security' `
                -Severity    'Medium' `
                -Confidence  'Medium' `
                -Title       'Local Administrators group membership is broader than expected' `
                -Description "The local Administrators group contains $adminCount members." `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Security' -Name 'LocalAdministratorsCount' -Value $adminCount)) `
                -Impact                 'Privilege sprawl increases accidental and malicious change risk.' `
                -BusinessRisk           'Elevated blast radius for credential misuse and unauthorized changes.' `
                -RootCauseHypothesis    'Access hygiene drift or exception accumulation.' `
                -RecommendedRemediation 'Review local admin membership and remove non-essential accounts and groups.' `
                -EstimatedEffort        'Low' `
                -VerificationMethod     'Re-run and validate expected privileged group membership.'
            ))
        }
    }

    return $findings
}

function Invoke-MhaReliabilityAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $systemEvents = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'EventLog' -Name 'SystemCriticalErrorEvents'
    if ($systemEvents) {
        $count = @($systemEvents).Count
        if ($count -ge 20) {
            $findings.Add((New-MhaFinding `
                -FindingId   'REL-SYSLOG-001' `
                -Category    'SystemEvents' `
                -Domain      'Reliability' `
                -Severity    'High' `
                -Confidence  'Medium' `
                -Title       'High volume of recent critical or error system events' `
                -Description "Recent system log collection contains $count critical or error events in the assessed window." `
                -Evidence    @((New-MhaEvidenceRecord -Source 'EventLog' -Name 'SystemCriticalErrorEventCount' -Value $count)) `
                -Impact                 'Recurring low-level failures may indicate driver, storage, update, or service instability.' `
                -BusinessRisk           'Unplanned outages and degraded machine trustworthiness.' `
                -RootCauseHypothesis    'Underlying platform instability or unresolved recurring faults.' `
                -RecommendedRemediation 'Cluster events by provider and event ID, then address the highest-frequency root cause first.' `
                -EstimatedEffort        'High' `
                -VerificationMethod     'Re-run after corrective action and verify event rate decreases.'
            ))
        }
    }

    $failedAuto = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Service' -Name 'AutomaticServicesNotRunning'
    if ($failedAuto) {
        $count = @($failedAuto).Count
        if ($count -gt 0) {
            $findings.Add((New-MhaFinding `
                -FindingId   'REL-SVC-001' `
                -Category    'ServiceAvailability' `
                -Domain      'Reliability' `
                -Severity    'Medium' `
                -Confidence  'High' `
                -Title       'Automatic services are not running' `
                -Description "$count automatic services are not currently running." `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Service' -Name 'AutomaticServicesNotRunning' -Value ($failedAuto | Select-Object Name, DisplayName, Status, StartType))) `
                -Impact                 'Expected service behavior may be degraded or absent.' `
                -BusinessRisk           'Operational interruptions, missing dependencies, or degraded workstation/server function.' `
                -RootCauseHypothesis    'Service crash, dependency failure, disabled dependency, or startup issue.' `
                -RecommendedRemediation 'Review service dependencies and recent service-related events, then restore expected service state through standard change control.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Confirm required automatic services remain running after restart or repair.'
            ))
        }
    }

    return $findings
}

function Invoke-MhaScalabilityAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $memTotalKb = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Memory' -Name 'TotalVisibleMemoryKB'
    if ($null -eq $memTotalKb) {
        $memTotalKb = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'OS' -Name 'TotalVisibleMemoryKB'
    }
    $memFreeKb  = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Memory' -Name 'FreePhysicalMemoryKB'
    if ($null -eq $memFreeKb) {
        $memFreeKb = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'OS' -Name 'FreePhysicalMemoryKB'
    }
    # Use explicit null checks rather than truthiness so that $memFreeKb = 0 (fully exhausted RAM)
    # still triggers the finding instead of being silently skipped by if(0) = $false.
    if ($null -ne $memTotalKb -and $null -ne $memFreeKb -and $memTotalKb -gt 0) {
        $usedPct = [math]::Round((1 - ($memFreeKb / $memTotalKb)) * 100, 2)
        if ($usedPct -ge 90) {
            $findings.Add((New-MhaFinding `
                -FindingId   'SCALE-MEM-001' `
                -Category    'MemoryExhaustionRisk' `
                -Domain      'Scalability' `
                -Severity    'High' `
                -Confidence  'High' `
                -Title       'Memory headroom is critically low' `
                -Description "Estimated current memory utilization is $usedPct percent." `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Memory' -Name 'MemoryUtilizationPercent' -Value $usedPct)) `
                -Impact                 'Additional workload growth may trigger paging and severe responsiveness loss.' `
                -BusinessRisk           'System instability under bursts and constrained future scaling.' `
                -RootCauseHypothesis    'RAM capacity is misaligned with workload demand.' `
                -RecommendedRemediation 'Reduce memory-heavy workloads, tune application limits, or increase RAM capacity.' `
                -EstimatedEffort        'Medium' `
                -VerificationMethod     'Re-check memory utilization after changes.'
            ))
        }
    }

    $cpuLogical = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'CPU' -Name 'NumberOfLogicalProcessors'
    # Explicit null + range check: truthiness would skip $cpuLogical = 0 which can't happen
    # on real hardware but would still produce a misleading silent skip.
    if ($null -ne $cpuLogical -and $cpuLogical -gt 0 -and $cpuLogical -le 4) {
        $findings.Add((New-MhaFinding `
            -FindingId   'SCALE-CPU-ARCH-001' `
            -Category    'CpuHeadroom' `
            -Domain      'Scalability' `
            -Severity    'Low' `
            -Confidence  'Medium' `
            -Title       'Logical processor count limits growth headroom for multi-threaded workloads' `
            -Description "The machine reports $cpuLogical logical processors." `
            -Evidence    @((New-MhaEvidenceRecord -Source 'CPU' -Name 'NumberOfLogicalProcessors' -Value $cpuLogical)) `
            -Impact                 'Parallel build, AI, CI, and development workloads may saturate sooner.' `
            -BusinessRisk           'Reduced suitability for future concurrency-heavy workloads.' `
            -RootCauseHypothesis    'Hardware profile is closer to general-purpose endpoint sizing than engineering-node sizing.' `
            -RecommendedRemediation 'Evaluate workload class and consider higher-core configuration for AI, build, or shared engineering use.' `
            -EstimatedEffort        'High' `
            -VerificationMethod     'Compare against target workload concurrency requirements.'
        ))
    }

    return $findings
}

function Invoke-MhaServiceabilityAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $eventLogsMissing = $RawEvidence | Where-Object { $_.Source -eq 'EventLog' -and $_.ValidationState -in @('Failed','Missing') }
    if ($eventLogsMissing) {
        $findings.Add((New-MhaFinding `
            -FindingId   'SERV-OBS-001' `
            -Category    'MonitoringReadiness' `
            -Domain      'Serviceability' `
            -Severity    'Medium' `
            -Confidence  'High' `
            -Title       'Event log telemetry collection is incomplete' `
            -Description 'Required event log evidence could not be collected reliably.' `
            -Evidence    @($eventLogsMissing) `
            -Impact                 'Troubleshooting and historical correlation quality are reduced.' `
            -BusinessRisk           'Longer incident resolution times and lower confidence in failure analysis.' `
            -RootCauseHypothesis    'Permissions, retention gaps, log corruption, or collector limitations.' `
            -RecommendedRemediation 'Validate log service health, retention settings, and collector permissions.' `
            -EstimatedEffort        'Medium' `
            -VerificationMethod     'Confirm event log evidence is collected successfully on the next run.'
        ))
    }

    return $findings
}

function Invoke-MhaUsabilityAssessment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $findings = [System.Collections.Generic.List[object]]::new()

    $startupCommands = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Startup' -Name 'StartupCommands'
    $startupCount = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Startup' -Name 'StartupCommandCount'
    $count = 0
    $hasStartup = $false
    if ($startupCommands) {
        $count = @($startupCommands).Count
        $hasStartup = $true
    } elseif ($null -ne $startupCount) {
        $count = $startupCount
        $hasStartup = $true
    }
    if ($hasStartup -and $count -ge 15) {
            $findings.Add((New-MhaFinding `
                -FindingId   'USE-STARTUP-001' `
                -Category    'StartupImpact' `
                -Domain      'Usability' `
                -Severity    'Medium' `
                -Confidence  'Medium' `
                -Title       'High startup item count may increase boot and sign-in friction' `
                -Description "The machine has $count startup command entries." `
                -Evidence    @((New-MhaEvidenceRecord -Source 'Startup' -Name 'StartupCommandCount' -Value $count)) `
                -Impact                 'Longer sign-in readiness and increased user friction.' `
                -BusinessRisk           'Reduced productivity and slower recovery after reboot.' `
                -RootCauseHypothesis    'Software accumulation and weak startup hygiene.' `
                -RecommendedRemediation 'Review startup entries and remove or delay non-essential launch items.' `
                -EstimatedEffort        'Low' `
                -VerificationMethod     'Measure reduced startup inventory and improved post-login readiness.'
            ))
    }

    return $findings
}

#endregion Analysis

#region ══════════════════════════════════════════════════════════════════════
#  CORRELATION  (MachineHealthAssessment.Correlation.psm1)
#══════════════════════════════════════════════════════════════════════════════

function Invoke-MhaCorrelationEngine {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings,
        [Parameter(Mandatory)] [object[]]$RawEvidence,
        [Parameter(Mandatory)] $Environment
    )
    $correlations        = [System.Collections.Generic.List[object]]::new()
    $correlationFindings = [System.Collections.Generic.List[object]]::new()

    $hasCpu         = $Findings | Where-Object { $_.Domain -eq 'Performance' -and $_.Category -in @('CpuSaturation','CpuQueue') }
    $hasReliability = $Findings | Where-Object { $_.Domain -eq 'Reliability' }

    if ($hasCpu -and $hasReliability) {
        $correlations.Add([pscustomobject]@{
            CorrelationId = 'CORR-PR-001'
            Pattern       = 'Performance -> Reliability'
            Description   = 'Performance pressure and reliability issues coexist.'
            Confidence    = 'Medium'
        })
        $correlationFindings.Add((New-MhaFinding `
            -FindingId   'CORR-PR-001' `
            -Category    'Correlation' `
            -Domain      'Correlation' `
            -Severity    'High' `
            -Confidence  'Medium' `
            -Title       'Performance pressure is likely contributing to reliability risk' `
            -Description 'CPU contention findings and reliability findings were both detected in the same assessment window.' `
            -Evidence    @(
                (New-MhaEvidenceRecord -Source 'Correlation' -Name 'PerformanceFindingCount' -Value (@($hasCpu).Count)),
                (New-MhaEvidenceRecord -Source 'Correlation' -Name 'ReliabilityFindingCount' -Value (@($hasReliability).Count))
            ) `
            -Impact                 'Transient performance issues may be amplifying service and application instability.' `
            -BusinessRisk           'Small degradations can escalate into recurring operational incidents.' `
            -RootCauseHypothesis    'Shared resource contention is affecting workload stability.' `
            -RecommendedRemediation 'Address top compute pressure and unstable services together instead of treating them as isolated defects.' `
            -EstimatedEffort        'Medium' `
            -VerificationMethod     'Re-assess after reducing CPU contention and compare event and service stability trends.'
        ))
    }

    $lowDisk = @($Findings | Where-Object { $_.Category -eq 'DiskCapacity' })
    if ($lowDisk.Count -gt 0) {
        $correlations.Add([pscustomobject]@{
            CorrelationId = 'CORR-STOR-001'
            Pattern       = 'Storage Growth -> Outage Risk'
            Description   = 'Low disk headroom creates direct outage and maintenance risk.'
            Confidence    = 'High'
        })
        # Flatten evidence from all disk findings into a single flat array.
        # Without flattening, member enumeration on a multi-item $lowDisk returns an array of arrays,
        # which breaks the [object[]]$Evidence parameter contract and corrupts the evidence model.
        $lowDiskEvidence = @($lowDisk | ForEach-Object { $_.Evidence } | ForEach-Object { $_ } | Where-Object { $null -ne $_ })
        if ($lowDiskEvidence.Count -eq 0) {
            $lowDiskEvidence = @(New-MhaEvidenceRecord -Source 'Correlation' -Name 'DiskCapacityFindingCount' -Value $lowDisk.Count)
        }
        $correlationFindings.Add((New-MhaFinding `
            -FindingId   'CORR-STOR-001' `
            -Category    'Correlation' `
            -Domain      'Correlation' `
            -Severity    'High' `
            -Confidence  'High' `
            -Title       'Storage capacity pressure creates outage risk' `
            -Description 'Low storage headroom is correlated with update failure, logging failure, and workload interruption risk.' `
            -Evidence    $lowDiskEvidence `
            -Impact                 'Core machine functions may fail when storage exhaustion thresholds are crossed.' `
            -BusinessRisk           'Unexpected downtime, failed builds, broken updates, and data handling errors.' `
            -RootCauseHypothesis    'Capacity planning and cleanup controls are insufficient for growth rate.' `
            -RecommendedRemediation 'Treat storage cleanup or expansion as a near-term remediation priority.' `
            -EstimatedEffort        'Medium' `
            -VerificationMethod     'Verify sustained free-space headroom after corrective action.'
        ))
    }

    [pscustomobject]@{
        Correlations        = $correlations
        CorrelationFindings = $correlationFindings
    }
}

#endregion Correlation

#region ══════════════════════════════════════════════════════════════════════
#  SCORING  (MachineHealthAssessment.Scoring.psm1)
#══════════════════════════════════════════════════════════════════════════════

function Get-MhaSeverityWeight {
    param([string]$Severity)
    switch ($Severity) {
        'Critical'      { return 25 }
        'High'          { return 15 }
        'Medium'        { return 8  }
        'Low'           { return 3  }
        'Informational' { return 0  }
        default         { return 0  }
    }
}

function Get-MhaDomainScore {
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings,
        [Parameter(Mandatory)] [string]$Domain
    )
    $penalty = 0
    foreach ($f in ($Findings | Where-Object { $_.Domain -eq $Domain })) {
        $penalty += Get-MhaSeverityWeight -Severity $f.Severity
    }
    return [math]::Round([math]::Max(0, 100 - $penalty), 2)
}

function Get-MhaHealthScore {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings,
        [Parameter(Mandatory)] $Environment
    )
    $performance    = Get-MhaDomainScore -Findings $Findings -Domain 'Performance'
    $security       = Get-MhaDomainScore -Findings $Findings -Domain 'Security'
    $reliability    = Get-MhaDomainScore -Findings $Findings -Domain 'Reliability'
    $scalability    = Get-MhaDomainScore -Findings $Findings -Domain 'Scalability'
    $serviceability = Get-MhaDomainScore -Findings $Findings -Domain 'Serviceability'
    $usability      = Get-MhaDomainScore -Findings $Findings -Domain 'Usability'

    # Weights: Performance 0.20, Security 0.25, Reliability 0.20, Scalability 0.15, Serviceability 0.10, Usability 0.10
    $overall = ($performance * 0.20) + ($security * 0.25) + ($reliability * 0.20) +
               ($scalability * 0.15) + ($serviceability * 0.10) + ($usability * 0.10)

    [pscustomobject]@{
        Formula             = 'Overall = Performance*0.20 + Security*0.25 + Reliability*0.20 + Scalability*0.15 + Serviceability*0.10 + Usability*0.10'
        OverallHealthScore  = [math]::Round($overall, 2)
        PerformanceScore    = $performance
        SecurityScore       = $security
        ReliabilityScore    = $reliability
        ScalabilityScore    = $scalability
        ServiceabilityScore = $serviceability
        UsabilityScore      = $usability
    }
}

function Get-MhaRiskMatrix {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings
    )
    foreach ($sev in @('Critical','High','Medium','Low','Informational')) {
        $items = $Findings | Where-Object { $_.Severity -eq $sev }
        [pscustomobject]@{
            Severity         = $sev
            FindingCount     = @($items).Count
            TechnicalImpact  = if (@($items).Count -gt 0) { ($items | Select-Object -First 3 | ForEach-Object { $_.Impact      }) -join ' | ' } else { '' }
            BusinessImpact   = if (@($items).Count -gt 0) { ($items | Select-Object -First 3 | ForEach-Object { $_.BusinessRisk }) -join ' | ' } else { '' }
            OperationalImpact = if (@($items).Count -gt 0) { 'Operational review required' } else { 'None observed' }
        }
    }
}

function Get-MhaCapacityForecast {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$RawEvidence,
        [Parameter(Mandatory)] [string]$ExecutionMode
    )
    $confidence = if ($ExecutionMode -eq 'DeepAudit') { 'Low' } else { 'Unknown' }
    [pscustomobject]@{
        Storage = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence=$confidence; Note='No verified forecast generated. Historical trend data insufficient.' }
        Memory  = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence=$confidence; Note='No verified forecast generated. Historical trend data insufficient.' }
        CPU     = [pscustomobject]@{ Day30=$null; Day90=$null; Day180=$null; Day365=$null; Confidence=$confidence; Note='No verified forecast generated. Historical trend data insufficient.' }
    }
}

#endregion Scoring

#region ══════════════════════════════════════════════════════════════════════
#  REPORTING  (MachineHealthAssessment.Reporting.psm1)
#══════════════════════════════════════════════════════════════════════════════

function ConvertTo-MhaHtmlSafe {
    # Encode the five HTML special characters so that dynamic values (computer names,
    # OS strings, drive IDs, finding text) cannot break the HTML report structure.
    param([AllowNull()][AllowEmptyString()][string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return '' }
    $Text -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' -replace '"','&quot;' -replace "'","&#39;"
}

function Export-MhaReports {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $AssessmentContext,
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Correlations,
        [Parameter(Mandatory)] $HealthScore,
        [Parameter(Mandatory)] $RiskMatrix,
        [Parameter(Mandatory)] $CapacityForecast,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$RawEvidence,
        [Parameter(Mandatory)] [string]$OutputPath,
        [Parameter(Mandatory)] [ValidateSet('HTML','Markdown','JSON','All')] [string]$OutputFormat
    )

    $reportMap   = [ordered]@{}
    $ts          = Get-Date -Format 'yyyyMMdd_HHmmss'

    $assessmentJson = Join-Path $OutputPath 'Assessment.json'
    $envJson     = Join-Path $OutputPath 'EnvironmentOverview.json'
    $findJson    = Join-Path $OutputPath 'Findings.json'
    $healthJson  = Join-Path $OutputPath 'HealthScore.json'
    $riskJson    = Join-Path $OutputPath 'RiskMatrix.json'
    $capJson     = Join-Path $OutputPath 'CapacityForecast.json'
    $findCsv     = Join-Path $OutputPath 'Findings.csv'
    $rawJson     = Join-Path $OutputPath "RawEvidence_$ts.json"
    $mdPath      = Join-Path $OutputPath 'ExecutiveSummary.md'
    $htmlPath    = Join-Path $OutputPath 'ExecutiveSummary.html'

    # Build consolidated V1 schema mapping
    $assets = @()
    $logicalDisks = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Disk' -Name 'LogicalDisks'
    if ($logicalDisks) {
        foreach ($d in $logicalDisks) {
            $assets += [ordered]@{
                DeviceID  = $d.DeviceID
                Size      = $d.Size
                FreeSpace = $d.FreeSpace
                DriveType = $d.DriveType
            }
        }
    }

    $software = @()
    $installedApps = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Software' -Name 'InstalledApplications'
    if ($installedApps) {
        foreach ($app in $installedApps) {
            $software += [ordered]@{
                Name      = $app.DisplayName
                Version   = $app.DisplayVersion
                Publisher = $app.Publisher
                Source    = "Registry"
            }
        }
    }
    $wingetPkgs = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Software' -Name 'WingetPackages'
    if ($wingetPkgs) {
        foreach ($pkg in $wingetPkgs) {
            $software += [ordered]@{
                Name      = $pkg.Name
                Version   = $pkg.Version
                Publisher = $null
                Source    = "Winget"
            }
        }
    }

    $services = @()
    $allServices = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Service' -Name 'AllServices'
    if ($allServices) {
        foreach ($s in $allServices) {
            $services += [ordered]@{
                Name        = $s.Name
                DisplayName = $s.DisplayName
                Status      = $s.Status
                StartType   = $s.StartType
            }
        }
    }

    $security = [ordered]@{
        DefenderStatus      = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'DefenderStatus'
        FirewallProfiles    = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'FirewallProfiles'
        BitLockerVolumes    = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'BitLockerVolumes'
        TPM                 = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'TPM'
        LocalAdministrators = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'Security' -Name 'LocalAdministrators'
    }

    $reliability = [ordered]@{
        SystemCriticalErrorEvents      = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'EventLog' -Name 'SystemCriticalErrorEvents'
        ApplicationCriticalErrorEvents = Get-MhaEvidenceValue -RawEvidence $RawEvidence -Source 'EventLog' -Name 'ApplicationCriticalErrorEvents'
    }

    $assessmentObj = [ordered]@{
        AssessmentId     = $AssessmentContext.AssessmentId
        Machine          = $Environment
        Assets           = $assets
        Software         = $software
        Services         = $services
        Security         = $security
        Reliability      = $reliability
        RawEvidence      = $RawEvidence
        # Direct dashboard support subfields
        Findings         = $Findings
        HealthScore      = $HealthScore
        RiskMatrix       = $RiskMatrix
        CapacityForecast = $CapacityForecast
    }

    $assessmentObj    | ConvertTo-Json -Depth 100 | Out-File -FilePath $assessmentJson -Encoding utf8
    $Environment     | ConvertTo-Json -Depth 8  | Out-File -FilePath $envJson    -Encoding utf8
    $Findings        | ConvertTo-Json -Depth 8  | Out-File -FilePath $findJson   -Encoding utf8
    $HealthScore     | ConvertTo-Json -Depth 8  | Out-File -FilePath $healthJson -Encoding utf8
    $RiskMatrix      | ConvertTo-Json -Depth 8  | Out-File -FilePath $riskJson   -Encoding utf8
    $CapacityForecast | ConvertTo-Json -Depth 8 | Out-File -FilePath $capJson    -Encoding utf8
    $RawEvidence     | ConvertTo-Json -Depth 100 | Out-File -FilePath $rawJson    -Encoding utf8

    $Findings | Select-Object FindingId, Domain, Category, Severity, Confidence, Title, Description,
        Impact, BusinessRisk, RecommendedRemediation, EstimatedEffort, VerificationMethod |
        Export-Csv -Path $findCsv -NoTypeInformation -Encoding utf8

    $criticalFindings = $Findings | Where-Object { $_.Severity -in @('Critical','High') } | Sort-Object Priority
    $topFindings      = $criticalFindings | Select-Object -First 10

    # ── Markdown ─────────────────────────────────────────────────────────────
    $findingLines = if ($topFindings) {
        ($topFindings | ForEach-Object { "- [$($_.Severity)] $($_.Title): $($_.Description)" }) -join "`r`n"
    } else { '- No critical or high-severity findings identified.' }

    $remediationRows = if ($Findings) {
        ($Findings | Sort-Object Priority | Select-Object -First 15 | ForEach-Object {
            "| $($_.Priority) | $($_.Title) | $($_.Severity) | $($_.EstimatedEffort) | Risk reduction | $($_.RecommendedRemediation) | $($_.VerificationMethod) | Review standard change rollback plan |"
        }) -join "`r`n"
    } else { '' }

    $md = @"
# Executive Summary

## Environment Overview
- Computer Name: $($Environment.ComputerName)
- OS Name: $($Environment.OSName)
- OS Version: $($Environment.OSVersion)
- Platform Family: $($Environment.PlatformFamily)
- Supported Platform: $($Environment.SupportedPlatform)
- Elevated: $($Environment.IsElevated)

## Final Health Scores
- Overall Health Score: $($HealthScore.OverallHealthScore)
- Performance Score: $($HealthScore.PerformanceScore)
- Security Score: $($HealthScore.SecurityScore)
- Reliability Score: $($HealthScore.ReliabilityScore)
- Scalability Score: $($HealthScore.ScalabilityScore)
- Serviceability Score: $($HealthScore.ServiceabilityScore)
- Usability Score: $($HealthScore.UsabilityScore)

## Critical Findings
$findingLines

## Monitoring Recommendations
- Validate event log retention and collector permissions.
- Centralize machine health outputs for longitudinal trending.
- Add scheduled execution for recurring assessments.
- Integrate report outputs with SIEM, CMDB, or service desk workflow.

## Automation Recommendations
- Build remediation playbooks only after evidence confidence is stable.
- Gate future remediation with approval workflows.
- Keep assessment collectors read-only.
- Store prior run outputs for trend-based forecasting.

## Prioritized Remediation Plan
| Priority | Issue | Severity | Effort | Expected Benefit | Recommended Action | Verification Steps | Rollback Considerations |
|---|---|---|---|---|---|---|---|
$remediationRows

## Capacity Forecast
- Storage: $($CapacityForecast.Storage.Note)
- Memory: $($CapacityForecast.Memory.Note)
- CPU: $($CapacityForecast.CPU.Note)
"@
    $md | Out-File -FilePath $mdPath -Encoding utf8

    # ── HTML ──────────────────────────────────────────────────────────────────
    $htmlFindingItems = if ($topFindings) {
        ($topFindings | ForEach-Object {
            $sev   = ConvertTo-MhaHtmlSafe $_.Severity
            $title = ConvertTo-MhaHtmlSafe $_.Title
            $desc  = ConvertTo-MhaHtmlSafe $_.Description
            "<li><span class='badge-high'>[$sev]</span> <strong>$title</strong>. $desc</li>"
        }) -join "`r`n"
    } else { '<li>No critical or high-severity findings identified.</li>' }

    $htmlRiskRows = ($RiskMatrix | ForEach-Object {
        $sev  = ConvertTo-MhaHtmlSafe $_.Severity
        $tech = ConvertTo-MhaHtmlSafe $_.TechnicalImpact
        $biz  = ConvertTo-MhaHtmlSafe $_.BusinessImpact
        $ops  = ConvertTo-MhaHtmlSafe $_.OperationalImpact
        "<tr><td>$sev</td><td>$($_.FindingCount)</td><td>$tech</td><td>$biz</td><td>$ops</td></tr>"
    }) -join "`r`n"

    $htmlRemRows = ($Findings | Sort-Object Priority | Select-Object -First 15 | ForEach-Object {
        $title  = ConvertTo-MhaHtmlSafe $_.Title
        $sev    = ConvertTo-MhaHtmlSafe $_.Severity
        $effort = ConvertTo-MhaHtmlSafe $_.EstimatedEffort
        $rem    = ConvertTo-MhaHtmlSafe $_.RecommendedRemediation
        $verify = ConvertTo-MhaHtmlSafe $_.VerificationMethod
        "<tr><td>$($_.Priority)</td><td>$title</td><td>$sev</td><td>$effort</td><td>Risk reduction</td><td>$rem</td><td>$verify</td><td>Apply normal change rollback procedures.</td></tr>"
    }) -join "`r`n"

    $hComputerName     = ConvertTo-MhaHtmlSafe $Environment.ComputerName
    $hOSName           = ConvertTo-MhaHtmlSafe $Environment.OSName
    $hOSVersion        = ConvertTo-MhaHtmlSafe $Environment.OSVersion
    $hPlatformFamily   = ConvertTo-MhaHtmlSafe $Environment.PlatformFamily
    $hSupportedPlatform = ConvertTo-MhaHtmlSafe "$($Environment.SupportedPlatform)"
    $hIsElevated       = ConvertTo-MhaHtmlSafe "$($Environment.IsElevated)"

    $htmlBody = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Machine Health Assessment - Executive Summary</title>
<style>
  body  { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #222; }
  h1,h2 { color: #0f172a; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th,td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
  th    { background: #e2e8f0; }
  .score        { font-size: 20px; font-weight: bold; }
  .badge-high   { color: #991b1b; font-weight: bold; }
  .badge-medium { color: #92400e; font-weight: bold; }
  .badge-low    { color: #1d4ed8; font-weight: bold; }
  code { background: #f1f5f9; padding: 2px 4px; }
</style>
</head>
<body>
<h1>Executive Summary</h1>

<h2>Environment Overview</h2>
<ul>
  <li><strong>Computer Name:</strong>     $hComputerName</li>
  <li><strong>OS Name:</strong>           $hOSName</li>
  <li><strong>OS Version:</strong>        $hOSVersion</li>
  <li><strong>Platform Family:</strong>   $hPlatformFamily</li>
  <li><strong>Supported Platform:</strong> $hSupportedPlatform</li>
  <li><strong>Elevated:</strong>          $hIsElevated</li>
</ul>

<h2>Final Health Scores</h2>
<ul>
  <li class="score">Overall Health Score: $($HealthScore.OverallHealthScore)</li>
  <li>Performance Score:    $($HealthScore.PerformanceScore)</li>
  <li>Security Score:       $($HealthScore.SecurityScore)</li>
  <li>Reliability Score:    $($HealthScore.ReliabilityScore)</li>
  <li>Scalability Score:    $($HealthScore.ScalabilityScore)</li>
  <li>Serviceability Score: $($HealthScore.ServiceabilityScore)</li>
  <li>Usability Score:      $($HealthScore.UsabilityScore)</li>
</ul>

<h2>Critical Findings</h2>
<ul>
$htmlFindingItems
</ul>

<h2>Risk Matrix</h2>
<table>
  <thead>
    <tr>
      <th>Severity</th><th>Finding Count</th><th>Technical Impact</th>
      <th>Business Impact</th><th>Operational Impact</th>
    </tr>
  </thead>
  <tbody>
$htmlRiskRows
  </tbody>
</table>

<h2>Prioritized Remediation Plan</h2>
<table>
  <thead>
    <tr>
      <th>Priority</th><th>Issue</th><th>Severity</th><th>Effort</th>
      <th>Expected Benefit</th><th>Recommended Action</th>
      <th>Verification Steps</th><th>Rollback Considerations</th>
    </tr>
  </thead>
  <tbody>
$htmlRemRows
  </tbody>
</table>

<h2>Capacity Forecast</h2>
<ul>
  <li>Storage: $($CapacityForecast.Storage.Note)</li>
  <li>Memory:  $($CapacityForecast.Memory.Note)</li>
  <li>CPU:     $($CapacityForecast.CPU.Note)</li>
</ul>

</body>
</html>
"@
    $htmlBody | Out-File -FilePath $htmlPath -Encoding utf8

    $reportMap.AssessmentJson           = $assessmentJson
    $reportMap.EnvironmentOverview      = $envJson
    $reportMap.FindingsJson             = $findJson
    $reportMap.FindingsCsv              = $findCsv
    $reportMap.RiskMatrix               = $riskJson
    $reportMap.HealthScore              = $healthJson
    $reportMap.CapacityForecast         = $capJson
    $reportMap.RawEvidence              = $rawJson
    $reportMap.ExecutiveSummaryMarkdown = $mdPath
    $reportMap.ExecutiveSummaryHtml     = $htmlPath

    Export-MhaToSqlite -Environment $Environment -Findings $Findings -HealthScore $HealthScore -CapacityForecast $CapacityForecast -OutputPath $OutputPath
    
    $dbJsonPath = Join-Path $OutputPath "SentinelHistory.json"
    $dbSqlitePath = Join-Path $OutputPath "SentinelHistory.db"
    
    if (Test-Path $dbSqlitePath) {
        $reportMap.SQLiteDatabase = $dbSqlitePath
    }
    if (Test-Path $dbJsonPath) {
        $reportMap.HistoryJson = $dbJsonPath
    }

    return $reportMap
}

function Export-MhaToSqlite {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $Environment,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [object[]]$Findings,
        [Parameter(Mandatory)] $HealthScore,
        [Parameter(Mandatory)] $CapacityForecast,
        [Parameter(Mandatory)] [string]$OutputPath
    )

    $scriptDir = $PSScriptRoot
    $libDir = Join-Path $scriptDir "lib"
    $dllPath = Join-Path $libDir "System.Data.SQLite.dll"

    if (-not (Test-Path $dllPath)) {
        $dllPath = Join-Path $PSScriptRoot "lib\System.Data.SQLite.dll"
        if (-not (Test-Path $dllPath)) {
            Write-MhaLog -Level Warn -Message "SQLite managed DLL not found at $dllPath. Skipping local database storage."
            return
        }
    }

    try {
        Write-MhaLog -Level Info -Message "Loading SQLite Engine from $dllPath"
        Add-Type -Path $dllPath

        $dbPath = Join-Path $OutputPath "SentinelHistory.db"
        Write-MhaLog -Level Info -Message "Initializing SQLite database connection at $dbPath"
        
        $conn = [System.Data.SQLite.SQLiteConnection]::new("Data Source=$dbPath;Version=3;")
        $conn.Open()

        $createTablesQuery = @"
        CREATE TABLE IF NOT EXISTS assessments (
            assessment_id TEXT PRIMARY KEY,
            timestamp TEXT,
            computer_name TEXT,
            os_name TEXT,
            overall_health REAL,
            performance REAL,
            security REAL,
            reliability REAL,
            scalability REAL,
            serviceability REAL,
            usability REAL
        );
        CREATE TABLE IF NOT EXISTS findings (
            assessment_id TEXT,
            finding_id TEXT,
            category TEXT,
            domain TEXT,
            severity TEXT,
            title TEXT,
            description TEXT,
            impact TEXT,
            business_risk TEXT,
            recommended_remediation TEXT,
            estimated_effort TEXT,
            verification_method TEXT,
            PRIMARY KEY (assessment_id, finding_id)
        );
        CREATE TABLE IF NOT EXISTS capacity_forecasts (
            assessment_id TEXT,
            resource TEXT,
            day30 REAL,
            day90 REAL,
            day180 REAL,
            day365 REAL,
            confidence TEXT,
            note TEXT,
            PRIMARY KEY (assessment_id, resource)
        );
"@
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $createTablesQuery
        $cmd.ExecuteNonQuery() | Out-Null

        $assessmentId = [guid]::NewGuid().Guid
        $timestamp = (Get-Date).ToString('o')

        $insertAssessment = $conn.CreateCommand()
        $insertAssessment.CommandText = @"
        INSERT INTO assessments (assessment_id, timestamp, computer_name, os_name, overall_health, performance, security, reliability, scalability, serviceability, usability)
        VALUES (@id, @ts, @comp, @os, @overall, @perf, @sec, @rel, @scale, @serv, @use);
"@
        $insertAssessment.Parameters.AddWithValue("@id", $assessmentId) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@ts", $timestamp) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@comp", $Environment.ComputerName) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@os", $Environment.OSName) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@overall", $HealthScore.OverallHealthScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@perf", $HealthScore.PerformanceScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@sec", $HealthScore.SecurityScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@rel", $HealthScore.ReliabilityScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@scale", $HealthScore.ScalabilityScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@serv", $HealthScore.ServiceabilityScore) | Out-Null
        $insertAssessment.Parameters.AddWithValue("@use", $HealthScore.UsabilityScore) | Out-Null
        $insertAssessment.ExecuteNonQuery() | Out-Null

        foreach ($finding in $Findings) {
            $insertFinding = $conn.CreateCommand()
            $insertFinding.CommandText = @"
            INSERT INTO findings (assessment_id, finding_id, category, domain, severity, title, description, impact, business_risk, recommended_remediation, estimated_effort, verification_method)
            VALUES (@aid, @fid, @cat, @dom, @sev, @title, @desc, @imp, @risk, @rem, @eff, @ver);
"@
            $insertFinding.Parameters.AddWithValue("@aid", $assessmentId) | Out-Null
            $insertFinding.Parameters.AddWithValue("@fid", $finding.FindingId) | Out-Null
            $insertFinding.Parameters.AddWithValue("@cat", $finding.Category) | Out-Null
            $insertFinding.Parameters.AddWithValue("@dom", $finding.Domain) | Out-Null
            $insertFinding.Parameters.AddWithValue("@sev", $finding.Severity) | Out-Null
            $insertFinding.Parameters.AddWithValue("@title", $finding.Title) | Out-Null
            $insertFinding.Parameters.AddWithValue("@desc", $finding.Description) | Out-Null
            $insertFinding.Parameters.AddWithValue("@imp", $finding.Impact) | Out-Null
            $insertFinding.Parameters.AddWithValue("@risk", $finding.BusinessRisk) | Out-Null
            $insertFinding.Parameters.AddWithValue("@rem", $finding.RecommendedRemediation) | Out-Null
            $insertFinding.Parameters.AddWithValue("@eff", $finding.EstimatedEffort) | Out-Null
            $insertFinding.Parameters.AddWithValue("@ver", $finding.VerificationMethod) | Out-Null
            $insertFinding.ExecuteNonQuery() | Out-Null
        }

        $resources = @('Storage', 'Memory', 'CPU')
        foreach ($res in $resources) {
            $metric = $CapacityForecast.$res
            if ($null -ne $metric) {
                $insertCap = $conn.CreateCommand()
                $insertCap.CommandText = @"
                INSERT INTO capacity_forecasts (assessment_id, resource, day30, day90, day180, day365, confidence, note)
                VALUES (@aid, @res, @d30, @d90, @d180, @d365, @conf, @note);
"@
                $insertCap.Parameters.AddWithValue("@aid", $assessmentId) | Out-Null
                $insertCap.Parameters.AddWithValue("@res", $res) | Out-Null
                $insertCap.Parameters.AddWithValue("@d30", $metric.Day30) | Out-Null
                $insertCap.Parameters.AddWithValue("@d90", $metric.Day90) | Out-Null
                $insertCap.Parameters.AddWithValue("@d180", $metric.Day180) | Out-Null
                $insertCap.Parameters.AddWithValue("@d365", $metric.Day365) | Out-Null
                $insertCap.Parameters.AddWithValue("@conf", $metric.Confidence) | Out-Null
                $insertCap.Parameters.AddWithValue("@note", $metric.Note) | Out-Null
                $insertCap.ExecuteNonQuery() | Out-Null
            }
        }

        Write-MhaLog -Level Info -Message "Querying historical assessments for trend reporting..."
        $historyList = [System.Collections.Generic.List[object]]::new()
        $selectHistory = $conn.CreateCommand()
        $selectHistory.CommandText = "SELECT * FROM assessments ORDER BY timestamp ASC;"
        $reader = $selectHistory.ExecuteReader()
        while ($reader.Read()) {
            $historyList.Add([pscustomobject]@{
                AssessmentId   = $reader["assessment_id"].ToString()
                Timestamp      = $reader["timestamp"].ToString()
                ComputerName   = $reader["computer_name"].ToString()
                OSName         = $reader["os_name"].ToString()
                OverallHealth  = [double]$reader["overall_health"]
                Performance    = [double]$reader["performance"]
                Security       = [double]$reader["security"]
                Reliability    = [double]$reader["reliability"]
                Scalability    = [double]$reader["scalability"]
                Serviceability = [double]$reader["serviceability"]
                Usability      = [double]$reader["usability"]
            })
        }
        $reader.Close()
        $conn.Close()

        $historyJsonPath = Join-Path $OutputPath "SentinelHistory.json"
        $historyList | ConvertTo-Json -AsArray -Depth 8 | Out-File -FilePath $historyJsonPath -Encoding utf8
        Write-MhaLog -Level Info -Message "SQLite history successfully written to JSON: $historyJsonPath"

    } catch {
        Write-MhaLog -Level Error -Message "SQLite logging failed: $($_.Exception.Message)"
    }
}

#endregion Reporting

#region ══════════════════════════════════════════════════════════════════════
#  MAIN ORCHESTRATION
#══════════════════════════════════════════════════════════════════════════════

if ($MyInvocation.InvocationName -ne '.') {

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$script:LogPath = Join-Path $OutputPath "MachineHealthAssessment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Initialize-MhaLogging -LogPath $script:LogPath -VerboseEnabled:$VerboseLogging

Write-MhaLog -Level Info -Message "Starting Machine Health Assessment Framework v$script:FrameworkVersion"
Write-MhaLog -Level Info -Message "ExecutionMode=$ExecutionMode  OutputFormat=$OutputFormat  OutputPath=$OutputPath"

$assessmentContext = [ordered]@{
    FrameworkVersion           = $script:FrameworkVersion
    AssessmentId               = [guid]::NewGuid().Guid
    StartTime                  = $script:AssessmentStart
    ExecutionMode              = $ExecutionMode
    OutputFormat               = $OutputFormat
    OutputPath                 = $OutputPath
    IncludeSecurityScan        = [bool]$IncludeSecurityScan
    IncludeNetworkAnalysis     = [bool]$IncludeNetworkAnalysis
    IncludeCapacityAnalysis    = [bool]$IncludeCapacityAnalysis
    IncludeRemediationGuidance = [bool]$IncludeRemediationGuidance
    HostName                   = $env:COMPUTERNAME
    UserName                   = [System.Environment]::UserName
    PowerShellVersion          = $PSVersionTable.PSVersion.ToString()
    Platform                   = $PSVersionTable.Platform
    OS                         = [System.Environment]::OSVersion.VersionString
}

$environment        = $null
$rawEvidence        = [System.Collections.Generic.List[object]]::new()
$findings           = [System.Collections.Generic.List[object]]::new()
$correlations       = [System.Collections.Generic.List[object]]::new()
$collectorFailures  = [System.Collections.Generic.List[object]]::new()
$validationMessages = [System.Collections.Generic.List[object]]::new()
$reports            = [ordered]@{}

try {
    Write-Progress -Activity 'Machine Health Assessment' -Status 'Detecting environment' -PercentComplete 5
    $environment = Get-MhaEnvironmentOverview -ExecutionMode $ExecutionMode
    $rawEvidence.Add($environment)

    if ($environment.PlatformFamily -ne 'Windows') {
        Write-MhaLog -Level Warn -Message "Unsupported platform collector path. Platform=$($environment.PlatformFamily)"
        $findings.Add(
            (New-MhaFinding `
                -FindingId   'PLATFORM-UNSUPPORTED-001' `
                -Category    'Platform' `
                -Severity    'Informational' `
                -Confidence  'High' `
                -Title       'Platform collector not yet implemented' `
                -Description 'No verified information. Platform collector not yet implemented.' `
                -Evidence    @((New-MhaEvidenceRecord -Source 'EnvironmentDetection' -Name 'PlatformFamily' -Value $environment.PlatformFamily -ValidationState 'Validated')) `
                -Impact                 'Assessment completed with graceful degradation and without platform-specific collectors.' `
                -BusinessRisk           'Unknown platform-specific risks remain unassessed.' `
                -RootCauseHypothesis    'Windows collectors are implemented. Non-Windows collectors are deferred.' `
                -RecommendedRemediation 'Implement Linux and macOS collection modules before using this framework for production non-Windows assessments.' `
                -EstimatedEffort        'High' `
                -VerificationMethod     'Re-run after platform-specific collector module is implemented.'
            )
        )
        $reports = Export-MhaReports `
            -AssessmentContext $assessmentContext `
            -Environment      $environment `
            -Findings         $findings `
            -Correlations     @() `
            -HealthScore      (New-MhaDefaultHealthScore) `
            -RiskMatrix       (Get-MhaRiskMatrix -Findings $findings) `
            -CapacityForecast (New-MhaEmptyCapacityForecast) `
            -RawEvidence      $rawEvidence `
            -OutputPath       $OutputPath `
            -OutputFormat     $OutputFormat
        Write-MhaLog -Level Info -Message 'Assessment completed with graceful degradation.'
        return
    }

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Collecting Windows evidence' -PercentComplete 20
    $collectionResult = Invoke-MhaWindowsEvidenceCollection `
        -Environment             $environment `
        -ExecutionMode           $ExecutionMode `
        -IncludeSecurityScan:$IncludeSecurityScan `
        -IncludeNetworkAnalysis:$IncludeNetworkAnalysis `
        -IncludeCapacityAnalysis:$IncludeCapacityAnalysis

    foreach ($item in $collectionResult.RawEvidence)      { $rawEvidence.Add($item) }
    foreach ($item in $collectionResult.CollectorFailures) { $collectorFailures.Add($item) }

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Validating evidence' -PercentComplete 35
    $evidenceValidation = Test-MhaEvidenceCollection -RawEvidence $rawEvidence -CollectorFailures $collectorFailures
    foreach ($item in $evidenceValidation.Messages)           { $validationMessages.Add($item) }
    foreach ($item in $evidenceValidation.ValidationFindings) { $findings.Add($item) }

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Running analysis engines' -PercentComplete 50
    $analysisResult = Invoke-MhaAnalysis `
        -Environment               $environment `
        -RawEvidence               $rawEvidence `
        -ExecutionMode             $ExecutionMode `
        -IncludeSecurityScan:$IncludeSecurityScan `
        -IncludeNetworkAnalysis:$IncludeNetworkAnalysis `
        -IncludeCapacityAnalysis:$IncludeCapacityAnalysis `
        -IncludeRemediationGuidance:$IncludeRemediationGuidance
    foreach ($item in $analysisResult.Findings) { $findings.Add($item) }

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Deduplicating findings' -PercentComplete 65
    # Get-MhaDeduplicatedFindings already returns a List[object]; no extra cast needed.
    $findings = Get-MhaDeduplicatedFindings -Findings $findings

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Correlating findings' -PercentComplete 75
    $correlationResult = Invoke-MhaCorrelationEngine `
        -Findings    $findings `
        -RawEvidence $rawEvidence `
        -Environment $environment
    foreach ($item in $correlationResult.Correlations)        { $correlations.Add($item) }
    foreach ($item in $correlationResult.CorrelationFindings) { $findings.Add($item) }

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Scoring risk and health' -PercentComplete 85
    $riskMatrix       = Get-MhaRiskMatrix      -Findings $findings
    $healthScore      = Get-MhaHealthScore     -Findings $findings -Environment $environment
    $capacityForecast = Get-MhaCapacityForecast -RawEvidence $rawEvidence -ExecutionMode $ExecutionMode

    Write-Progress -Activity 'Machine Health Assessment' -Status 'Generating reports' -PercentComplete 95
    $reports = Export-MhaReports `
        -AssessmentContext $assessmentContext `
        -Environment      $environment `
        -Findings         $findings `
        -Correlations     $correlations `
        -HealthScore      $healthScore `
        -RiskMatrix       $riskMatrix `
        -CapacityForecast $capacityForecast `
        -RawEvidence      $rawEvidence `
        -OutputPath       $OutputPath `
        -OutputFormat     $OutputFormat

    Write-Progress -Activity 'Machine Health Assessment' -Completed
    Write-MhaLog -Level Info -Message "Assessment completed successfully. Findings=$($findings.Count) Correlations=$($correlations.Count)"

    Write-Host "`nAssessment complete. Reports written to: $OutputPath" -ForegroundColor Green
    $reports.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)"
    }
}
catch {
    Write-Progress -Activity 'Machine Health Assessment' -Completed
    Write-MhaLog -Level Error -Message "Assessment failed: $($_.Exception.Message)"
    throw
}
finally {
    $endTime  = Get-Date
    $duration = New-TimeSpan -Start $script:AssessmentStart -End $endTime
    Write-MhaLog -Level Info -Message "Assessment finished. Duration=$($duration.ToString())"
}

}

#endregion
