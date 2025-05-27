#!/bin/bash

# MCP Server Service Installation Script
# This script installs the MCP server as a systemd service

set -e

echo "Installing MCP Server as a systemd service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root (use sudo)"
    exit 1
fi

# Copy service file
echo "Copying service file to /etc/systemd/system/..."
cp etc/mcp-server.service /etc/systemd/system/

# Set proper permissions
chmod 644 /etc/systemd/system/mcp-server.service

# Create log directory if it doesn't exist
mkdir -p /var/log
touch /var/log/mcp-server.log
touch /var/log/mcp-server-error.log
chown ubuntu:ubuntu /var/log/mcp-server.log
chown ubuntu:ubuntu /var/log/mcp-server-error.log

# Reload systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service
echo "Enabling MCP server service..."
systemctl enable mcp-server.service

echo "MCP Server service installed successfully!"
echo ""
echo "To start the service: sudo systemctl start mcp-server"
echo "To check status: sudo systemctl status mcp-server"
echo "To view logs: sudo journalctl -u mcp-server -f"
echo "To stop the service: sudo systemctl stop mcp-server"
echo "To disable the service: sudo systemctl disable mcp-server"