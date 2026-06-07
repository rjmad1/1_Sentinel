import datetime
import uuid

def get_evidence_value(raw_evidence, source, name):
    if not raw_evidence:
        return None
    for record in raw_evidence:
        if record.get("Source") == source and record.get("Name") == name:
            return record.get("Value")
    return None

def get_safe_property(obj, prop_name, default_value=None):
    if not obj:
        return default_value
    return obj.get(prop_name, default_value)

def create_evidence_record(source, name, value, validation_state='Validated', collector='', notes=''):
    return {
        "Source": source,
        "Name": name,
        "Value": value,
        "ValidationState": validation_state,
        "Collector": collector,
        "Notes": notes,
        "Timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

def create_finding(finding_id, category, domain, severity, confidence, title, description, evidence=None, impact="", business_risk="", root_cause_hypothesis="", recommended_remediation="", estimated_effort="Medium", verification_method="", priority=-1):
    if priority < 0:
        priority = {
            'Critical': 10,
            'High': 20,
            'Medium': 50,
            'Low': 80,
            'Informational': 90
        }.get(severity, 100)
    return {
        "FindingId": finding_id,
        "Category": category,
        "Domain": domain,
        "Severity": severity,
        "Confidence": confidence,
        "Priority": priority,
        "Title": title,
        "Description": description,
        "Evidence": evidence or [],
        "Impact": impact,
        "BusinessRisk": business_risk,
        "RootCauseHypothesis": root_cause_hypothesis,
        "RecommendedRemediation": recommended_remediation,
        "EstimatedEffort": estimated_effort,
        "VerificationMethod": verification_method,
        "CreatedOn": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

def run_performance_assessment(raw_evidence):
    findings = []
    
    # 1. Disk Space check
    logical_disks = get_evidence_value(raw_evidence, 'Disk', 'LogicalDisks')
    if isinstance(logical_disks, list):
        for disk in logical_disks:
            size = float(disk.get("Size") or 0)
            free = float(disk.get("FreeSpace") or 0)
            device_id = disk.get("DeviceID") or ""
            
            free_pct = None
            if size > 0 and free is not None:
                free_pct = round((free / size) * 100, 2)
            
            if free_pct is not None and free_pct < 15.0:
                id_letter = device_id.replace(":", "")
                findings.append(create_finding(
                    finding_id=f"PERF-DISKFREE-{id_letter}",
                    category="DiskCapacity",
                    domain="Performance",
                    severity="High",
                    confidence="High",
                    title=f"Low free space on {device_id}",
                    description="The volume has less than 15 percent free space available.",
                    evidence=[
                        create_evidence_record('Disk', 'DeviceID', device_id),
                        create_evidence_record('Disk', 'FreePercent', free_pct)
                    ],
                    impact="Low free space can degrade performance, increase fragmentation pressure, and reduce update reliability.",
                    business_risk="Build failures, patching failures, and production instability.",
                    root_cause_hypothesis="Capacity growth exceeded available storage management controls.",
                    recommended_remediation="Free disk space, archive stale artifacts, move large datasets, or expand the volume.",
                    estimated_effort="Medium",
                    verification_method="Re-run assessment and confirm free space is above threshold."
                ))

    # 2. CPU Saturation checks
    cpu_counters = get_evidence_value(raw_evidence, 'CPUCounter', 'Samples')
    if isinstance(cpu_counters, list):
        usage_samples = [float(s.get("Value") or 0) for s in cpu_counters if s.get("Path") and "% processor time" in s.get("Path").lower()]
        queue_samples = [float(s.get("Value") or 0) for s in cpu_counters if s.get("Path") and "processor queue length" in s.get("Path").lower()]
        
        if usage_samples:
            avg_cpu = round(sum(usage_samples) / len(usage_samples), 2)
            if avg_cpu >= 85.0:
                findings.append(create_finding(
                    finding_id="PERF-CPU-001",
                    category="CpuSaturation",
                    domain="Performance",
                    severity="High",
                    confidence="Medium",
                    title="Sustained CPU utilization is elevated",
                    description=f"Average sampled CPU utilization is {avg_cpu} percent.",
                    evidence=[create_evidence_record('CPUCounter', 'AverageCpuPercent', avg_cpu)],
                    impact="Sustained CPU pressure can increase latency and reduce workload responsiveness.",
                    business_risk="User slowdown, queue backlogs, and service quality degradation.",
                    root_cause_hypothesis="Insufficient compute headroom or workload contention.",
                    recommended_remediation="Review top CPU consumers, tune workloads, and consider scaling or process isolation.",
                    estimated_effort="Medium",
                    verification_method="Re-sample CPU counters after remediation."
                ))
        
        if queue_samples:
            avg_queue = round(sum(queue_samples) / len(queue_samples), 2)
            if avg_queue >= 4.0:
                findings.append(create_finding(
                    finding_id="PERF-CPUQUEUE-001",
                    category="CpuQueue",
                    domain="Performance",
                    severity="Medium",
                    confidence="Medium",
                    title="Processor queue length is elevated",
                    description=f"Average sampled processor queue length is {avg_queue}.",
                    evidence=[create_evidence_record('CPUCounter', 'AverageProcessorQueueLength', avg_queue)],
                    impact="Runnable work is waiting for CPU time.",
                    business_risk="Burst workloads may push the machine into visible contention.",
                    root_cause_hypothesis="Thread contention or sustained compute oversubscription.",
                    recommended_remediation="Review high-thread processes and right-size workload concurrency.",
                    estimated_effort="Medium",
                    verification_method="Confirm processor queue length normalizes after tuning."
                ))
                
    return findings

def run_security_assessment(raw_evidence):
    findings = []
    
    # 1. Firewall check
    fw = get_evidence_value(raw_evidence, 'Security', 'FirewallProfiles')
    if isinstance(fw, list):
        disabled_profiles = [p for p in fw if str(p.get("Enabled")).lower() in ('false', '0')]
        if disabled_profiles:
            findings.append(create_finding(
                finding_id="SEC-FW-001",
                category="Firewall",
                domain="Security",
                severity="High",
                confidence="High",
                title="One or more firewall profiles are disabled",
                description="The local firewall is not enabled across all discovered profiles.",
                evidence=[create_evidence_record('Security', 'DisabledFirewallProfiles', [{"Name": p.get("Name"), "Enabled": p.get("Enabled")} for p in disabled_profiles])],
                impact="Host-based traffic filtering is weakened.",
                business_risk="Increased exposure to lateral movement and unwanted inbound access.",
                root_cause_hypothesis="Firewall baseline drift or intentional weakening for application compatibility.",
                recommended_remediation="Re-enable disabled firewall profiles and validate required allow rules.",
                estimated_effort="Medium",
                verification_method="Confirm all firewall profiles report Enabled=True."
            ))

    # 2. Defender Check
    defender = get_evidence_value(raw_evidence, 'Security', 'DefenderStatus')
    if defender:
        rt_enabled = defender.get("RealTimeProtectionEnabled")
        if str(rt_enabled).lower() not in ('true', '1'):
            findings.append(create_finding(
                finding_id="SEC-DEF-001",
                category="Defender",
                domain="Security",
                severity="High",
                confidence="High",
                title="Real-time antimalware protection is not enabled",
                description="Microsoft Defender real-time protection is not enabled.",
                evidence=[create_evidence_record('Security', 'RealTimeProtectionEnabled', rt_enabled)],
                impact="Malicious file and process activity may evade real-time interception.",
                business_risk="Increased malware execution risk on the endpoint or server.",
                root_cause_hypothesis="Protection disabled, passive mode, or third-party control overlap.",
                recommended_remediation="Validate security platform ownership and ensure real-time protection is enabled or an equivalent control is active.",
                estimated_effort="Medium",
                verification_method="Re-run defender status collection and confirm real-time protection is enabled."
            ))

    # 3. BitLocker check
    bitlocker = get_evidence_value(raw_evidence, 'Security', 'BitLockerVolumes')
    if isinstance(bitlocker, list):
        unprotected = [v for v in bitlocker if str(v.get("ProtectionStatus")).lower() not in ('on', '1') and (v.get("VolumeType") == 'OperatingSystem' or not v.get("VolumeType"))]
        if unprotected:
            findings.append(create_finding(
                finding_id="SEC-BDE-001",
                category="BitLocker",
                domain="Security",
                severity="High",
                confidence="Medium",
                title="Operating system volume is not protected by BitLocker",
                description="An operating system volume does not show active BitLocker protection.",
                evidence=[create_evidence_record('Security', 'UnprotectedBitLockerVolumes', [{
                    "MountPoint": u.get("MountPoint") or u.get("DeviceID"),
                    "ProtectionStatus": u.get("ProtectionStatus"),
                    "VolumeType": u.get("VolumeType")
                } for u in unprotected])],
                impact="At-rest protection for local data may be insufficient.",
                business_risk="Data exposure risk after theft, loss, or offline disk access.",
                root_cause_hypothesis="Drive encryption was never enabled or protection is suspended.",
                recommended_remediation="Enable and escrow BitLocker protection on operating system volumes where policy requires it.",
                estimated_effort="Medium",
                verification_method="Verify ProtectionStatus is On for operating system volumes."
            ))

    # 4. TPM check
    tpm = get_evidence_value(raw_evidence, 'Security', 'TPM')
    if tpm:
        tpm_present = tpm.get("TpmPresent")
        tpm_ready = tpm.get("TpmReady")
        if str(tpm_present).lower() != 'true' or str(tpm_ready).lower() != 'true':
            findings.append(create_finding(
                finding_id="SEC-TPM-001",
                category="TPM",
                domain="Security",
                severity="Medium",
                confidence="High",
                title="TPM is absent or not ready",
                description="The TPM does not report as present and ready.",
                evidence=[create_evidence_record('Security', 'TPMStatus', tpm)],
                impact="Hardware-backed trust features may be unavailable or degraded.",
                business_risk="Reduced support for secure boot chains, credential protection, and device encryption scenarios.",
                root_cause_hypothesis="Hardware TPM absent, disabled in firmware, or not provisioned.",
                recommended_remediation="Review firmware settings and TPM provisioning state. Enable and initialize TPM where supported.",
                estimated_effort="Medium",
                verification_method="Confirm TpmPresent=True and TpmReady=True."
            ))

    # 5. Local Administrators membership check
    local_admins = get_evidence_value(raw_evidence, 'Security', 'LocalAdministrators')
    if isinstance(local_admins, list):
        count = len(local_admins)
        if count > 3:
            findings.append(create_finding(
                finding_id="SEC-LADM-001",
                category="LocalAdministrators",
                domain="Security",
                severity="Medium",
                confidence="Medium",
                title="Local Administrators group membership is broader than expected",
                description=f"The local Administrators group contains {count} members.",
                evidence=[create_evidence_record('Security', 'LocalAdministratorsCount', count)],
                impact="Privilege sprawl increases accidental and malicious change risk.",
                business_risk="Elevated blast radius for credential misuse and unauthorized changes.",
                root_cause_hypothesis="Access hygiene drift or exception accumulation.",
                recommended_remediation="Review local admin membership and remove non-essential accounts and groups.",
                estimated_effort="Low",
                verification_method="Re-run and validate expected privileged group membership."
            ))
            
    return findings

def run_reliability_assessment(raw_evidence):
    findings = []
    
    # 1. Critical System Events check
    system_events = get_evidence_value(raw_evidence, 'EventLog', 'SystemCriticalErrorEvents')
    if isinstance(system_events, list):
        count = len(system_events)
        if count >= 20:
            findings.append(create_finding(
                finding_id="REL-SYSLOG-001",
                category="SystemEvents",
                domain="Reliability",
                severity="High",
                confidence="Medium",
                title="High volume of recent critical or error system events",
                description=f"Recent system log collection contains {count} critical or error events in the assessed window.",
                evidence=[create_evidence_record('EventLog', 'SystemCriticalErrorEventCount', count)],
                impact="Recurring low-level failures may indicate driver, storage, update, or service instability.",
                business_risk="Unplanned outages and degraded machine trustworthiness.",
                root_cause_hypothesis="Underlying platform instability or unresolved recurring faults.",
                recommended_remediation="Cluster events by provider and event ID, then address the highest-frequency root cause first.",
                estimated_effort="High",
                verification_method="Re-run after corrective action and verify event rate decreases."
            ))

    # 2. Stopped Automatic Services check
    failed_auto = get_evidence_value(raw_evidence, 'Service', 'AutomaticServicesNotRunning')
    if isinstance(failed_auto, list):
        count = len(failed_auto)
        if count > 0:
            findings.append(create_finding(
                finding_id="REL-SVC-001",
                category="ServiceAvailability",
                domain="Reliability",
                severity="Medium",
                confidence="High",
                title="Automatic services are not running",
                description=f"{count} automatic services are not currently running.",
                evidence=[create_evidence_record('Service', 'AutomaticServicesNotRunning', [{
                    "Name": s.get("Name"),
                    "DisplayName": s.get("DisplayName"),
                    "Status": s.get("Status"),
                    "StartType": s.get("StartType") or s.get("StartMode")
                } for s in failed_auto])],
                impact="Expected service behavior may be degraded or absent.",
                business_risk="Operational interruptions, missing dependencies, or degraded workstation/server function.",
                root_cause_hypothesis="Service crash, dependency failure, disabled dependency, or startup issue.",
                recommended_remediation="Review service dependencies and recent service-related events, then restore expected service state through standard change control.",
                estimated_effort="Medium",
                verification_method="Confirm required automatic services remain running after restart or repair."
            ))
            
    return findings

def run_scalability_assessment(raw_evidence):
    findings = []
    
    # 1. Memory Headroom Check
    mem_total = get_evidence_value(raw_evidence, 'Memory', 'TotalVisibleMemoryKB') or get_evidence_value(raw_evidence, 'OS', 'TotalVisibleMemoryKB')
    mem_free = get_evidence_value(raw_evidence, 'Memory', 'FreePhysicalMemoryKB') or get_evidence_value(raw_evidence, 'OS', 'FreePhysicalMemoryKB')
    
    if mem_total is not None and mem_free is not None and float(mem_total) > 0:
        used_pct = round((1 - float(mem_free) / float(mem_total)) * 100, 2)
        if used_pct >= 90.0:
            findings.append(create_finding(
                finding_id="SCALE-MEM-001",
                category="MemoryExhaustionRisk",
                domain="Scalability",
                severity="High",
                confidence="High",
                title="Memory headroom is critically low",
                description=f"Estimated current memory utilization is {used_pct} percent.",
                evidence=[create_evidence_record('Memory', 'MemoryUtilizationPercent', used_pct)],
                impact="Additional workload growth may trigger paging and severe responsiveness loss.",
                business_risk="System instability under bursts and constrained future scaling.",
                root_cause_hypothesis="RAM capacity is misaligned with workload demand.",
                recommended_remediation="Reduce memory-heavy workloads, tune application limits, or increase RAM capacity.",
                estimated_effort="Medium",
                verification_method="Re-check memory utilization after changes."
            ))

    # 2. Logical Processor Core Check
    cpu_logical = get_evidence_value(raw_evidence, 'CPU', 'NumberOfLogicalProcessors')
    if cpu_logical is not None and 0 < int(cpu_logical) <= 4:
        findings.append(create_finding(
            finding_id="SCALE-CPU-ARCH-001",
            category="CpuHeadroom",
            domain="Scalability",
            severity="Low",
            confidence="Medium",
            title="Logical processor count limits growth headroom for multi-threaded workloads",
            description=f"The machine reports {cpu_logical} logical processors.",
            evidence=[create_evidence_record('CPU', 'NumberOfLogicalProcessors', cpu_logical)],
            impact="Parallel build, AI, CI, and development workloads may saturate sooner.",
            business_risk="Reduced suitability for future concurrency-heavy workloads.",
            root_cause_hypothesis="Hardware profile is closer to general-purpose endpoint sizing than engineering-node sizing.",
            recommended_remediation="Evaluate workload class and consider higher-core configuration for AI, build, or shared engineering use.",
            estimated_effort="High",
            verification_method="Compare against target workload concurrency requirements."
        ))
        
    return findings

def run_serviceability_assessment(raw_evidence):
    findings = []
    
    event_logs = next((r for r in raw_evidence if r.get("Source") == 'EventLog'), None) if raw_evidence else None
    if event_logs and event_logs.get("ValidationState") in ('Failed', 'Missing'):
        findings.append(create_finding(
            finding_id="SERV-OBS-001",
            category="MonitoringReadiness",
            domain="Serviceability",
            severity="Medium",
            confidence="High",
            title="Event log telemetry collection is incomplete",
            description="Required event log evidence could not be collected reliably.",
            evidence=[event_logs],
            impact="Troubleshooting and historical correlation quality are reduced.",
            business_risk="Longer incident resolution times and lower confidence in failure analysis.",
            root_cause_hypothesis="Permissions, retention gaps, log corruption, or collector limitations.",
            recommended_remediation="Validate log service health, retention settings, and collector permissions.",
            estimated_effort="Medium",
            verification_method="Confirm event log evidence is collected successfully on the next run."
        ))
        
    return findings

def run_usability_assessment(raw_evidence):
    findings = []
    
    startup_commands = get_evidence_value(raw_evidence, 'Startup', 'StartupCommands')
    startup_count = get_evidence_value(raw_evidence, 'Startup', 'StartupCommandCount')
    
    count = 0
    has_startup = False
    
    if isinstance(startup_commands, list):
        count = len(startup_commands)
        has_startup = True
    elif startup_count is not None:
        count = int(startup_count)
        has_startup = True
        
    if has_startup and count >= 15:
        findings.append(create_finding(
            finding_id="USE-STARTUP-001",
            category="StartupImpact",
            domain="Usability",
            severity="Medium",
            confidence="Medium",
            title="High startup item count may increase boot and sign-in friction",
            description=f"The machine has {count} startup command entries.",
            evidence=[create_evidence_record('Startup', 'StartupCommandCount', count)],
            impact="Longer sign-in readiness and increased user friction.",
            business_risk="Reduced productivity and slower recovery after reboot.",
            root_cause_hypothesis="Software accumulation and weak startup hygiene.",
            recommended_remediation="Review startup entries and remove or delay non-essential launch items.",
            estimated_effort="Low",
            verification_method="Measure reduced startup inventory and improved post-login readiness."
        ))
        
    return findings

def run_correlation_engine(findings, raw_evidence):
    correlations = []
    correlation_findings = []
    
    has_cpu = any(f.get("Domain") == 'Performance' and f.get("Category") in ('CpuSaturation', 'CpuQueue') for f in findings)
    has_reliability = any(f.get("Domain") == 'Reliability' for f in findings)
    
    if has_cpu and has_reliability:
        correlations.append({
            "CorrelationId": "CORR-PR-001",
            "Pattern": "Performance -> Reliability",
            "Description": "Performance pressure and reliability issues coexist.",
            "Confidence": "Medium"
        })
        correlation_findings.append(create_finding(
            finding_id="CORR-PR-001",
            category="Correlation",
            domain="Correlation",
            severity="High",
            confidence="Medium",
            title="Performance pressure is likely contributing to reliability risk",
            description="CPU contention findings and reliability findings were both detected in the same assessment window.",
            evidence=[
                create_evidence_record('Correlation', 'PerformanceFindingCount', len([f for f in findings if f.get("Domain") == 'Performance'])),
                create_evidence_record('Correlation', 'ReliabilityFindingCount', len([f for f in findings if f.get("Domain") == 'Reliability']))
            ],
            impact="Transient performance issues may be amplifying service and application instability.",
            business_risk="Small degradations can escalate into recurring operational incidents.",
            root_cause_hypothesis="Shared resource contention is affecting workload stability.",
            recommended_remediation="Address top compute pressure and unstable services together instead of treating them as isolated defects.",
            estimated_effort="Medium",
            verification_method="Re-assess after reducing CPU contention and compare event and service stability trends."
        ))
        
    low_disk = [f for f in findings if f.get("Category") == 'DiskCapacity']
    if low_disk:
        correlations.append({
            "CorrelationId": "CORR-STOR-001",
            "Pattern": "Storage Growth -> Outage Risk",
            "Description": "Low disk headroom creates direct outage and maintenance risk.",
            "Confidence": "High"
        })
        
        low_disk_evidence = []
        for f in low_disk:
            if isinstance(f.get("Evidence"), list):
                low_disk_evidence.extend(f.get("Evidence"))
                
        if not low_disk_evidence:
            low_disk_evidence = [create_evidence_record('Correlation', 'DiskCapacityFindingCount', len(low_disk))]
            
        correlation_findings.append(create_finding(
            finding_id="CORR-STOR-001",
            category="Correlation",
            domain="Correlation",
            severity="High",
            confidence="High",
            title="Storage capacity pressure creates outage risk",
            description="Low storage headroom is correlated with update failure, logging failure, and workload interruption risk.",
            evidence=low_disk_evidence,
            impact="Core machine functions may fail when storage exhaustion thresholds are crossed.",
            business_risk="Unexpected downtime, failed builds, broken updates, and data handling errors.",
            root_cause_hypothesis="Capacity planning and cleanup controls are insufficient for growth rate.",
            recommended_remediation="Treat storage cleanup or expansion as a near-term remediation priority.",
            estimated_effort="Medium",
            verification_method="Verify sustained free-space headroom after corrective action."
        ))
        
    return correlations, correlation_findings

def get_deduplicated_findings(findings):
    if not findings:
        return []
    
    seen = {}
    # Sort findings by priority, then by FindingId
    sorted_findings = sorted(findings, key=lambda f: (f.get("Priority", 100), f.get("FindingId", "")))
    
    for f in sorted_findings:
        if not f:
            continue
        key = f"{f.get('Category')}|{f.get('Title')}|{f.get('Description')}"
        if key not in seen:
            seen[key] = f
            
    return list(seen.values())

def get_domain_score(findings, domain):
    weights = {
        'Critical': 25,
        'High': 15,
        'Medium': 8,
        'Low': 3,
        'Informational': 0
    }
    domain_findings = [f for f in findings if f.get("Domain") == domain]
    penalty = sum(weights.get(f.get("Severity"), 0) for f in domain_findings)
    return max(0, 100 - penalty)

def calculate_health_score(findings):
    performance = get_domain_score(findings, 'Performance')
    security = get_domain_score(findings, 'Security')
    reliability = get_domain_score(findings, 'Reliability')
    scalability = get_domain_score(findings, 'Scalability')
    serviceability = get_domain_score(findings, 'Serviceability')
    usability = get_domain_score(findings, 'Usability')
    
    overall = (performance * 0.20) + (security * 0.25) + (reliability * 0.20) + \
              (scalability * 0.15) + (serviceability * 0.10) + (usability * 0.10)
              
    return {
        "Formula": "Overall = Performance*0.20 + Security*0.25 + Reliability*0.20 + Scalability*0.15 + Serviceability*0.10 + Usability*0.10",
        "OverallHealthScore": round(overall, 2),
        "PerformanceScore": performance,
        "SecurityScore": security,
        "ReliabilityScore": reliability,
        "ScalabilityScore": scalability,
        "ServiceabilityScore": serviceability,
        "UsabilityScore": usability
    }

def calculate_risk_matrix(findings):
    severities = ['Critical', 'High', 'Medium', 'Low', 'Informational']
    matrix = []
    for sev in severities:
        items = [f for f in findings if f.get("Severity") == sev]
        matrix.append({
            "Severity": sev,
            "FindingCount": len(items),
            "TechnicalImpact": " | ".join(f.get("Impact") for f in items[:3] if f.get("Impact")) if items else "",
            "BusinessImpact": " | ".join(f.get("BusinessRisk") for f in items[:3] if f.get("BusinessRisk")) if items else "",
            "OperationalImpact": "Operational review required" if items else "None observed"
        })
    return matrix

def calculate_capacity_forecast(raw_evidence, execution_mode):
    confidence = 'Low' if execution_mode == 'DeepAudit' else 'Unknown'
    return {
        "Storage": { "Day30": None, "Day90": None, "Day180": None, "Day365": None, "Confidence": confidence, "Note": "No verified forecast generated. Historical trend data insufficient." },
        "Memory": { "Day30": None, "Day90": None, "Day180": None, "Day365": None, "Confidence": confidence, "Note": "No verified forecast generated. Historical trend data insufficient." },
        "Cpu": { "Day30": None, "Day90": None, "Day180": None, "Day365": None, "Confidence": confidence, "Note": "No verified forecast generated. Historical trend data insufficient." }
    }

def generate_graph_nodes(findings, raw_evidence):
    nodes = [
        { "id": "machine", "type": "machine", "status": "normal" }
    ]
    
    has_os = any(r.get("Source") in ('OS', 'EnvironmentOverview') for r in raw_evidence) if raw_evidence else False
    if has_os:
        nodes.append({ "id": "os", "type": "os", "status": "normal" })
        
    has_security = any(r.get("Source") == 'Security' for r in raw_evidence) if raw_evidence else False
    if has_security:
        def_status = 'error' if any(f.get("FindingId") == 'SEC-DEF-001' for f in findings) else 'normal'
        nodes.append({ "id": "defender", "type": "security", "status": def_status })
        
        fw_status = 'error' if any(f.get("FindingId") == 'SEC-FW-001' for f in findings) else 'normal'
        nodes.append({ "id": "firewall", "type": "security", "status": fw_status })
        
        if any(f.get("FindingId") == 'SEC-LADM-001' for f in findings):
            nodes.append({ "id": "local_admins", "type": "user", "status": "warn" })
            
    nodes.append({ "id": "software_catalog", "type": "software", "status": "normal" })
    
    if any(f.get("FindingId") == 'PERF-DISKFREE-C' for f in findings):
        nodes.append({ "id": "disk_c", "type": "storage", "status": "error" })
        
    has_cpu = any(r.get("Source") == 'CPU' for r in raw_evidence) if raw_evidence else False
    if has_cpu:
        cpu_status = 'normal'
        if any(f.get("FindingId") in ('PERF-CPU-001', 'PERF-CPUQUEUE-001') for f in findings):
            cpu_status = 'error'
        elif any(f.get("FindingId") == 'SCALE-CPU-ARCH-001' for f in findings):
            cpu_status = 'warn'
        nodes.append({ "id": "cpu", "type": "hardware", "status": cpu_status })
        
    if any(f.get("FindingId") == 'REL-SVC-001' for f in findings):
        nodes.append({ "id": "svc_spooler", "type": "service", "status": "error" })
        
    return nodes

def run_assessment(payload_dict: dict) -> dict:
    """
    Main entry point for calculating system findings, health scores, and risk matrices from a telemetry payload.
    """
    machine = payload_dict.get("Machine", {})
    execution_mode = machine.get("ExecutionMode") or "Audit"
    
    # Reconstruct raw evidence if it's not explicitly present
    raw_evidence = payload_dict.get("RawEvidence")
    if not raw_evidence:
        raw_evidence = []
        
        # Populate OS evidence
        os_info = payload_dict.get("OS", {})
        if os_info:
            raw_evidence.append({
                "Source": "OS",
                "Name": "OSInfo",
                "Value": os_info
            })
            # Also mock memory from OS if present
            if os_info.get("TotalVisibleMemoryKB"):
                raw_evidence.append({
                    "Source": "OS",
                    "Name": "TotalVisibleMemoryKB",
                    "Value": os_info.get("TotalVisibleMemoryKB")
                })
            if os_info.get("FreePhysicalMemoryKB"):
                raw_evidence.append({
                    "Source": "OS",
                    "Name": "FreePhysicalMemoryKB",
                    "Value": os_info.get("FreePhysicalMemoryKB")
                })

        # Populate Hardware / Disk / CPU evidence
        hw = payload_dict.get("Hardware", {})
        if hw:
            if hw.get("Disks"):
                raw_evidence.append({
                    "Source": "Disk",
                    "Name": "LogicalDisks",
                    "Value": hw.get("Disks")
                })
            # Mock CPU logical processors count
            if hw.get("LogicalCores"):
                raw_evidence.append({
                    "Source": "CPU",
                    "Name": "NumberOfLogicalProcessors",
                    "Value": hw.get("LogicalCores")
                })
                
        # Populate security
        admins = payload_dict.get("LocalAdmins")
        if admins:
            raw_evidence.append({
                "Source": "Security",
                "Name": "LocalAdministrators",
                "Value": admins
            })
            
        # Services
        svcs = payload_dict.get("Services", [])
        if svcs:
            stopped_auto = [s for s in svcs if s.get("Status") != 'Running' and s.get("StartMode") == 'Auto']
            raw_evidence.append({
                "Source": "Service",
                "Name": "AutomaticServicesNotRunning",
                "Value": stopped_auto
            })

    # Gather individual domains findings
    findings = []
    findings.extend(run_performance_assessment(raw_evidence))
    findings.extend(run_security_assessment(raw_evidence))
    findings.extend(run_reliability_assessment(raw_evidence))
    findings.extend(run_scalability_assessment(raw_evidence))
    findings.extend(run_serviceability_assessment(raw_evidence))
    findings.extend(run_usability_assessment(raw_evidence))
    
    # Deduplicate
    findings = get_deduplicated_findings(findings)
    
    # Correlations
    correlations, correlation_findings = run_correlation_engine(findings, raw_evidence)
    findings.extend(correlation_findings)
    
    # Re-deduplicate
    findings = get_deduplicated_findings(findings)
    
    # Scores
    health_score = calculate_health_score(findings)
    risk_matrix = calculate_risk_matrix(findings)
    capacity_forecast = calculate_capacity_forecast(raw_evidence, execution_mode)
    
    # Graph nodes
    graph_nodes = generate_graph_nodes(findings, raw_evidence)
    
    recommendations = [f.get("RecommendedRemediation") for f in findings if f.get("RecommendedRemediation")]
    
    assessment_id = payload_dict.get("AssessmentId") or str(uuid.uuid4())
    
    return {
        "AssessmentId": assessment_id,
        "Machine": machine,
        "RawEvidence": raw_evidence,
        "Software": payload_dict.get("Software", []),
        "Findings": findings,
        "HealthScore": health_score,
        "RiskMatrix": risk_matrix,
        "CapacityForecast": capacity_forecast,
        "Graph": {
            "nodes": graph_nodes,
            "links": []
        },
        "Recommendations": recommendations
    }
