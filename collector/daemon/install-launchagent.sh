#!/bin/bash
# macOS LaunchAgent Installation Script for Sentinel Collector Daemon

LABEL="dev.sentinel.collector"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
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

echo "Creating plist definition at $PLIST_PATH..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$BINARY_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/sentinel-collector.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/sentinel-collector.stderr.log</string>
</dict>
</plist>
EOF

# Load and start LaunchAgent
echo "Loading LaunchAgent service..."
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "Sentinel LaunchAgent registered successfully! Listening on http://localhost:1337"
EOF
