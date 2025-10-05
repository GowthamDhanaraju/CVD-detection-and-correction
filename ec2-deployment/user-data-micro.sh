#!/bin/bash

# CVD Micro Deployment Script for t2.micro
# Optimized for minimal resource usage

# Set up logging
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting CVD micro deployment at $(date)"

# Update system (minimal)
apt-get update
apt-get install -y docker.io docker-compose git curl htop

# Start Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Set memory limits for the system
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.dirty_ratio=15' >> /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' >> /etc/sysctl.conf
sysctl -p

# Clone repository
cd /opt
git clone --depth 1 -b ${branch} ${github_repo} cvd-micro-app
cd cvd-micro-app

# Set up environment
echo "MICRO_MODE=true" > .env
echo "LOG_LEVEL=WARNING" >> .env

# Set Docker daemon options for low memory
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "1m",
    "max-file": "1"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.size=2G"
  ]
}
EOF

# Restart Docker with new settings
systemctl restart docker

# Wait for Docker
sleep 10

# Build and start services with ultra-low resources
echo "Building micro services..."
docker-compose -f docker-compose.micro.yml build --no-cache

echo "Starting micro services..."
docker-compose -f docker-compose.micro.yml up -d

# Set up log rotation
cat > /etc/logrotate.d/cvd-micro << EOF
/opt/cvd-micro-app/logs/*.log {
    daily
    missingok
    rotate 2
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Clean up to save space
apt-get autoremove -y
apt-get autoclean
docker system prune -f

echo "CVD micro deployment completed at $(date)"
echo "Services should be available at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"