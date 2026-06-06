#!/bin/bash
# Linux systemd Service Installation Script for Sentinel Collector Daemon
# Must be run as root or with sudo

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script with sudo or as root."
  exit 1
fi

SERVICE_NAME="sentinel-collector"
UNIT_PATH="/etc/systemd/system/$SERVICE_NAME.service"
BINARY_NAME="sentinel-collector"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BINARY_PATH="$SCRIPT_DIR/target/release/$BINARY_NAME"

if [ ! -f "$BINARY_PATH" ]; then
    BINARY_PATH="$SCRIPT_DIR/$BINARY_NAME"
fi

if [ ! -f "$BINARY_PATH" ]; then
    echo "Error: Precompiled daemon binary not found. Please compile using 'cargo build --release' first."
    exit 1
fi

chmod +x "$BINARY_PATH"

echo "Creating systemd unit definition at $UNIT_PATH..."

cat <<EOF > "$UNIT_PATH"
[Unit]
Description=Sentinel Infrastructure Telemetry Collector Daemon
After=network.target

[Service]
ExecStart=$BINARY_PATH
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload and start service
echo "Reloading systemd and starting service..."
systemctl daemon-reload
systemctl stop "$SERVICE_NAME" 2>/dev/null
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

# Check status
STATUS=$(systemctl is-active "$SERVICE_NAME")
if [ "$STATUS" = "active" ]; then
  echo "Sentinel Linux Service successfully installed and started! Listening on http://localhost:1337"
else
  echo "Warning: Service was registered but is not active. Current status: $STATUS"
fi
EOF
