#!/bin/bash
# TaskFlow Deployment Script for Ubuntu 22.04 VPS

set -e

echo "=== TaskFlow Deployment ==="
echo ""

# Update system
echo "1. Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "2. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "2. Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "3. Installing Docker Compose..."
    apt install -y docker-compose
else
    echo "3. Docker Compose already installed"
fi

# Create app directory
echo "4. Setting up application directory..."
mkdir -p /opt/taskflow
cd /opt/taskflow

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "ERROR: .env file not found!"
    echo "Please copy your .env file to /opt/taskflow/.env first"
    echo ""
    exit 1
fi

echo "5. Building and starting containers..."
docker-compose up -d --build

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "TaskFlow is now running at: http://$(curl -s ifconfig.me)"
echo ""
echo "Useful commands:"
echo "  View logs:     cd /opt/taskflow && docker-compose logs -f"
echo "  Restart:       cd /opt/taskflow && docker-compose restart"
echo "  Stop:          cd /opt/taskflow && docker-compose down"
echo "  Update:        cd /opt/taskflow && git pull && docker-compose up -d --build"
echo ""
