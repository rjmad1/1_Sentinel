#!/usr/bin/env bash
# Sentinel EIIP cross-platform Linux & macOS Telemetry Collector
# Gathers hardware, OS, service, and package metadata and exports to standard JSON.

set -e

OUTPUT_FILE=${1:-"Assessment.json"}
TENANT_ID=${2:-"default-tenant"}
SITE_ID=${3:-"default-site"}

# Helper to escape JSON strings
escape_json() {
    echo -n "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip())[1:-1])' 2>/dev/null || \
    echo -n "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\t/\\t/g'
}

# Determine OS Platform
PLATFORM="Linux"
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
fi

# Gather OS Information
COMPUTER_NAME=$(hostname)
OS_INSTALL_DATE=$(date -Iseconds 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$PLATFORM" == "macOS" ]; then
    OS_NAME="macOS $(sw_vers -productVersion)"
    OS_VERSION=$(sw_vers -productVersion)
    LAST_BOOT_SEC=$(sysctl -n kern.boottime | awk -F'[=, ]' '{print $6}')
    LAST_BOOT_TIME=$(date -r "$LAST_BOOT_SEC" -Iseconds 2>/dev/null || date -r "$LAST_BOOT_SEC" -u +"%Y-%m-%dT%H:%M:%SZ")
    LOGICAL_CORES=$(sysctl -n hw.ncpu)
    TOTAL_MEM_BYTES=$(sysctl -n hw.memsize)
    TOTAL_MEM_GB=$(echo "scale=2; $TOTAL_MEM_BYTES / 1024 / 1024 / 1024" | bc)
    
    # Estimate Free RAM from vm_stat
    PAGE_SIZE=$(vm_stat | grep "page size of" | awk '{print $8}')
    FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
    INACTIVE_PAGES=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
    FREE_MEM_BYTES=$(( (FREE_PAGES + INACTIVE_PAGES) * PAGE_SIZE ))
    FREE_MEM_GB=$(echo "scale=2; $FREE_MEM_BYTES / 1024 / 1024 / 1024" | bc)
else
    # Linux
    if [ -f /etc/os-release ]; then
        OS_NAME=$(grep "^PRETTY_NAME=" /etc/os-release | cut -d= -f2 | tr -d '"')
        OS_VERSION=$(grep "^VERSION_ID=" /etc/os-release | cut -d= -f2 | tr -d '"')
    else
        OS_NAME="Linux $(uname -r)"
        OS_VERSION=$(uname -r)
    fi
    UPTIME_SEC=$(awk '{print $1}' /proc/uptime | cut -d. -f1)
    LAST_BOOT_TIME=$(date -d "@$(($(date +%s) - UPTIME_SEC))" -Iseconds 2>/dev/null || date -d "@$(($(date +%s) - UPTIME_SEC))" -u +"%Y-%m-%dT%H:%M:%SZ")
    LOGICAL_CORES=$(nproc)
    TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEM_GB=$(echo "scale=2; $TOTAL_MEM_KB / 1024 / 1024" | bc)
    FREE_MEM_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}' || grep MemFree /proc/meminfo | awk '{print $2}')
    FREE_MEM_GB=$(echo "scale=2; $FREE_MEM_KB / 1024 / 1024" | bc)
fi

# Disks List
DISKS_JSON=""
if [ "$PLATFORM" == "macOS" ]; then
    # Parse df for macOS
    while read -r line; do
        dev=$(echo "$line" | awk '{print $1}')
        size_kb=$(echo "$line" | awk '{print $2}')
        free_kb=$(echo "$line" | awk '{print $4}')
        mount=$(echo "$line" | awk '{print $9}')
        if [[ "$mount" == "/" || "$mount" == "/System/Volumes/Data" ]]; then
            size_b=$(( size_kb * 512 )) # macOS df yields 512-byte blocks
            free_b=$(( free_kb * 512 ))
            DISKS_JSON+='{"DeviceID":"'$(escape_json "$mount")'","Size":"'$size_b'","FreeSpace":"'$free_b'"},'
        fi
    done < <(df | tail -n +2)
else
    # Parse df for Linux
    while read -r line; do
        dev=$(echo "$line" | awk '{print $1}')
        size_kb=$(echo "$line" | awk '{print $2}')
        free_kb=$(echo "$line" | awk '{print $4}')
        mount=$(echo "$line" | awk '{print $6}')
        if [[ "$mount" == "/" || "$mount" == "/mnt"* || "$mount" == "/home" ]]; then
            size_b=$(( size_kb * 1024 ))
            free_b=$(( free_kb * 1024 ))
            DISKS_JSON+='{"DeviceID":"'$(escape_json "$mount")'","Size":"'$size_b'","FreeSpace":"'$free_b'"},'
        fi
    done < <(df -k | grep "^/dev" || df -k | grep -E '^tmpfs|/$')
fi
DISKS_JSON=$(echo "$DISKS_JSON" | sed 's/,$//')

# Network Adapters List
NET_JSON=""
if [ "$PLATFORM" == "macOS" ]; then
    for iface in $(networksetup -listallhardwareports | grep "Device:" | awk '{print $2}'); do
        ip=$(ipconfig getifaddr "$iface" || true)
        if [ ! -z "$ip" ]; then
            NET_JSON+='{"Name":"'$(escape_json "$iface")'","IPAddress":"'$(escape_json "$ip")'"},'
        fi
    done
else
    # Linux ip addr
    while read -r line; do
        name=$(echo "$line" | awk '{print $2}' | tr -d ':')
        ip=$(echo "$line" | awk '{print $4}' | cut -d/ -f1)
        NET_JSON+='{"Name":"'$(escape_json "$name")'","IPAddress":"'$(escape_json "$ip")'"},'
    done < <(ip -o -4 addr show scope global || true)
fi
NET_JSON=$(echo "$NET_JSON" | sed 's/,$//')

# Services (systemctl / launchctl)
SVCS_JSON=""
if [ "$PLATFORM" == "macOS" ]; then
    # Map launchctl services
    while read -r line; do
        label=$(echo "$line" | awk '{print $3}')
        pid=$(echo "$line" | awk '{print $1}')
        status="Stopped"
        if [ "$pid" != "-" ]; then
            status="Running"
        fi
        SVCS_JSON+='{"Name":"'$(escape_json "$label")'","DisplayName":"'$(escape_json "$label")'","Status":"'$status'","StartMode":"Manual"},'
    done < <(launchctl list | head -n 30)
else
    # Map systemd services
    if command -v systemctl >/dev/null 2>&1; then
        while read -r line; do
            name=$(echo "$line" | awk '{print $1}' | sed 's/\.service$//')
            sub=$(echo "$line" | awk '{print $4}')
            status="Stopped"
            if [ "$sub" == "running" ]; then
                status="Running"
            fi
            SVCS_JSON+='{"Name":"'$(escape_json "$name")'","DisplayName":"'$(escape_json "$name")'","Status":"'$status'","StartMode":"Auto"},'
        done < <(systemctl list-units --type=service --all | head -n 30)
    fi
fi
SVCS_JSON=$(echo "$SVCS_JSON" | sed 's/,$//')

# Local Administrators (sudo / wheel group members)
ADMINS_JSON=""
if [ "$PLATFORM" == "macOS" ]; then
    for u in $(dscl . -read /Groups/admin GroupMembership | cut -d: -f2); do
        ADMINS_JSON+='"'$(escape_json "$u")'",'
    done
else
    # Linux sudo / wheel group
    members=$(grep -E '^sudo|^wheel' /etc/group | cut -d: -f4 | tr ',' ' ')
    for m in $members; do
        ADMINS_JSON+='"'$(escape_json "$m")'",'
    done
fi
ADMINS_JSON=$(echo "$ADMINS_JSON" | sed 's/,$//')
if [ -z "$ADMINS_JSON" ]; then
    ADMINS_JSON='"root"'
fi

# Software Catalog (dpkg, rpm, or brew)
SW_JSON=""
if command -v brew >/dev/null 2>&1; then
    while read -r line; do
        name=$(echo "$line" | awk '{print $1}')
        ver=$(echo "$line" | awk '{print $2}')
        SW_JSON+='{"Name":"'$(escape_json "$name")'","Version":"'$(escape_json "$ver")'","Vendor":"Homebrew"},'
    done < <(brew list --versions || true)
fi

if [ "$PLATFORM" == "Linux" ]; then
    if command -v dpkg-query >/dev/null 2>&1; then
        while read -r line; do
            name=$(echo "$line" | awk '{print $1}')
            ver=$(echo "$line" | awk '{print $2}')
            SW_JSON+='{"Name":"'$(escape_json "$name")'","Version":"'$(escape_json "$ver")'","Vendor":"dpkg"},'
        done < <(dpkg-query -W -f='${Package} ${Version}\n' | head -n 50 || true)
    elif command -v rpm >/dev/null 2>&1; then
        while read -r line; do
            name=$(echo "$line" | awk '{print $1}')
            ver=$(echo "$line" | awk '{print $2}')
            SW_JSON+='{"Name":"'$(escape_json "$name")'","Version":"'$(escape_json "$ver")'","Vendor":"rpm"},'
        done < <(rpm -qa --qf "%{NAME} %{VERSION}\n" | head -n 50 || true)
    fi
fi
SW_JSON=$(echo "$SW_JSON" | sed 's/,$//')

# Build the final payload JSON
cat <<EOF > "$OUTPUT_FILE"
{
  "TenantId": "$TENANT_ID",
  "SiteId": "$SITE_ID",
  "Machine": {
    "ComputerName": "$(escape_json "$COMPUTER_NAME")",
    "Platform": "$PLATFORM",
    "Architecture": "$(uname -m)"
  },
  "OS": {
    "Caption": "$(escape_json "$OS_NAME")",
    "Version": "$(escape_json "$OS_VERSION")",
    "InstallDate": "$OS_INSTALL_DATE",
    "LastBootTime": "$LAST_BOOT_TIME"
  },
  "Hardware": {
    "LogicalCores": $LOGICAL_CORES,
    "PhysicalProcessors": 1,
    "TotalMemoryGB": $TOTAL_MEM_GB,
    "FreeMemoryGB": $FREE_MEM_GB,
    "Disks": [ $DISKS_JSON ],
    "NetworkAdapters": [ $NET_JSON ]
  },
  "Services": [ $SVCS_JSON ],
  "LocalAdmins": [ $ADMINS_JSON ],
  "Software": [ $SW_JSON ]
}
EOF

echo "Telemetry collected successfully and saved to $OUTPUT_FILE"
