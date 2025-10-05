#!/bin/bash
# CVD Detection EC2 User Data Script - Optimized Production Deployment
set -euo pipefail

# Configuration
REPO_URL="https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git"
APP_DIR="/opt/cvd-app"
LOG_FILE="/var/log/cvd-deployment.log"
S3_BUCKET="cvd-models-bucket-1619722215"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to handle errors
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "🚀 Starting CVD Detection deployment on EC2..."

# Update system
log "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install essential packages
log "🛠️ Installing dependencies..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    unzip \
    git \
    htop \
    tree \
    vim \
    ufw \
    fail2ban \
    logrotate

# Install Docker using official repository
log "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Docker Compose standalone
log "🔧 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install AWS CLI v2
log "☁️ Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws/

# Wait for Docker to be ready
log "⏳ Waiting for Docker to initialize..."
until docker info >/dev/null 2>&1; do
    sleep 2
done

# Configure basic security
log "🔒 Configuring security..."

# Configure UFW firewall
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Clone repository
log "📥 Cloning CVD Detection repository..."
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# Set proper ownership
chown -R ubuntu:ubuntu "$APP_DIR"

# Create models directory and download models
log "📊 Setting up models..."
mkdir -p "$APP_DIR/models/saved_models"

# Download model files from S3 with retries
download_model() {
    local model_file="$1"
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        log "📥 Downloading $model_file (attempt $((retry + 1))/$max_retries)..."
        if aws s3 cp "s3://$S3_BUCKET/saved_models/$model_file" "$APP_DIR/models/saved_models/$model_file"; then
            log "✅ Successfully downloaded $model_file"
            return 0
        else
            log "❌ Failed to download $model_file"
            retry=$((retry + 1))
            sleep 10
        fi
    done
    
    error_exit "Failed to download $model_file after $max_retries attempts"
}

# Download required model files
download_model "cvd_discriminator_20250930_095913.pth"
download_model "cvd_generator_20250930_095913.pth"

# Set proper permissions
chown -R ubuntu:ubuntu "$APP_DIR/models"

# Create environment file
log "🔧 Creating environment configuration..."
cat > "$APP_DIR/.env" << EOF
# Production Environment Configuration
NODE_ENV=production
LOG_LEVEL=INFO
SECRET_KEY=cvd-production-secret-key-$(date +%s)
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Redis Configuration
REDIS_URL=redis://redis:6379

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# API Configuration
REACT_APP_API_URL=/api

# Security
PYTHONUNBUFFERED=1
EOF

# Build and start services using production compose
log "🏗️ Building Docker images..."
cd "$APP_DIR"
docker-compose -f docker-compose.production.yml build --no-cache

log "🚀 Starting CVD Detection services..."
docker-compose -f docker-compose.production.yml up -d

# Create systemd service for auto-restart on boot
log "⚙️ Creating systemd service..."
cat > /etc/systemd/system/cvd-app.service << EOF
[Unit]
Description=CVD Detection Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cvd-app.service

# Create health check script
log "🏥 Setting up health monitoring..."
cat > "$APP_DIR/health-check.sh" << 'EOF'
#!/bin/bash
echo "=== CVD Detection Health Check ==="
echo "Timestamp: $(date)"
echo ""

echo "Docker Services Status:"
docker-compose -f docker-compose.production.yml ps
echo ""

echo "Container Health:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

echo "Application Health:"
curl -s http://localhost/health || echo "❌ Health check failed"
echo ""

echo "Disk Usage:"
df -h /
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "Recent Logs (last 10 lines):"
docker-compose -f docker-compose.production.yml logs --tail=10
EOF

chmod +x "$APP_DIR/health-check.sh"

# Setup log rotation
log "📝 Configuring log rotation..."
cat > /etc/logrotate.d/cvd-app << EOF
/var/log/cvd-deployment.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Setup monitoring script
cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash
# Simple monitoring script for CVD Detection app

ALERT_EMAIL=""  # Set this to receive alerts
LOG_FILE="/var/log/cvd-monitor.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if containers are running
check_containers() {
    local failed_containers=$(docker-compose -f docker-compose.production.yml ps --services --filter "status=exited")
    
    if [ -n "$failed_containers" ]; then
        log_message "WARNING: Failed containers detected: $failed_containers"
        docker-compose -f docker-compose.production.yml up -d
        log_message "Attempted to restart failed containers"
    fi
}

# Check application health
check_health() {
    if ! curl -sf http://localhost/health > /dev/null; then
        log_message "ERROR: Health check failed"
        return 1
    fi
    return 0
}

# Check disk space
check_disk() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_message "WARNING: Disk usage is at ${disk_usage}%"
    fi
}

# Main monitoring loop
main() {
    log_message "Starting health check"
    check_containers
    check_health
    check_disk
    log_message "Health check completed"
}

main
EOF

chmod +x "$APP_DIR/monitor.sh"

# Add monitoring to crontab
echo "*/5 * * * * ubuntu cd $APP_DIR && ./monitor.sh" >> /etc/crontab

# Wait for services to be ready
log "⏳ Waiting for services to start..."
sleep 30

# Verify deployment
log "🔍 Verifying deployment..."
max_wait=60
elapsed=0

while [ $elapsed -lt $max_wait ]; do
    if curl -sf http://localhost/health > /dev/null; then
        log "✅ Application is responding to health checks"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $max_wait ]; then
    log "⚠️ Application health check timeout, but continuing..."
fi

# Get instance metadata
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unknown")
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "unknown")

# Final status report
log "🎉 CVD Detection deployment completed successfully!"
log ""
log "📍 Instance Details:"
log "   Instance ID: $INSTANCE_ID"
log "   Public IP: $PUBLIC_IP"
log "   Region: $REGION"
log ""
log "🌐 Application URLs:"
log "   Main App: http://$PUBLIC_IP"
log "   API Docs: http://$PUBLIC_IP/api/docs"
log "   Health Check: http://$PUBLIC_IP/health"
log ""
log "🔧 Management Commands:"
log "   Status: cd $APP_DIR && docker-compose -f docker-compose.production.yml ps"
log "   Logs: cd $APP_DIR && docker-compose -f docker-compose.production.yml logs -f"
log "   Restart: cd $APP_DIR && docker-compose -f docker-compose.production.yml restart"
log "   Health: $APP_DIR/health-check.sh"
log ""
log "📊 Monitoring:"
log "   Monitor script: $APP_DIR/monitor.sh"
log "   Deployment log: $LOG_FILE"

# Set final permissions
chown -R ubuntu:ubuntu "$APP_DIR"

log "🚀 Deployment process completed!"