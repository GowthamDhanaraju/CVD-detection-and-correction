#!/bin/bash
# CVD Detection EC2 Setup Script
# Run this on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "🚀 Setting up CVD Detection System on EC2..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🛠️ Installing dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    git \
    curl \
    htop \
    unzip \
    sqlite3

# Install Node.js for web interface
echo "📱 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/cvd-detection
sudo chown ubuntu:ubuntu /opt/cvd-detection
cd /opt/cvd-detection

# Clone the repository (you'll need to update this URL)
echo "📥 Cloning CVD Detection repository..."
git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git .

# Setup Python virtual environment
echo "🐍 Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python packages..."
cd backend
pip install -r requirements.txt
cd ..

# Create systemd service for backend
echo "⚙️ Creating backend service..."
sudo tee /etc/systemd/system/cvd-backend.service > /dev/null <<EOF
[Unit]
Description=CVD Detection Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/cvd-detection/backend
Environment=PATH=/opt/cvd-detection/venv/bin
ExecStart=/opt/cvd-detection/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Build web interface
echo "🌐 Building web interface..."
cd mobile-app
npm install
npm run build
cd ..

# Configure Nginx
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/cvd-detection > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Serve React app
    location / {
        root /opt/cvd-detection/mobile-app/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Handle large file uploads
    client_max_body_size 50M;
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/cvd-detection /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Create data directories
echo "📊 Setting up data directories..."
mkdir -p /opt/cvd-detection/backend/data/{models,results,users,backups}

# Set proper permissions
sudo chown -R ubuntu:ubuntu /opt/cvd-detection

# Start and enable services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cvd-backend
sudo systemctl start cvd-backend
sudo systemctl enable nginx
sudo systemctl restart nginx

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 8001
sudo ufw --force enable

# Create health check script
echo "📋 Creating health check..."
tee /opt/cvd-detection/health-check.sh > /dev/null <<EOF
#!/bin/bash
echo "=== CVD Detection Health Check ==="
echo "Backend Status:"
curl -s http://localhost:8001/health || echo "Backend not responding"
echo -e "\nNginx Status:"
sudo systemctl is-active nginx
echo -e "\nDisk Space:"
df -h /
echo -e "\nMemory Usage:"
free -h
EOF
chmod +x /opt/cvd-detection/health-check.sh

# Get public IP
PUBLIC_IP=\$(curl -s http://checkip.amazonaws.com)

echo ""
echo "🎉 CVD Detection System Setup Complete!"
echo "========================================="
echo ""
echo "🌐 Access your application at:"
echo "   http://\$PUBLIC_IP"
echo ""
echo "🔧 Backend API available at:"
echo "   http://\$PUBLIC_IP/api/"
echo ""
echo "📊 Service Management:"
echo "   sudo systemctl status cvd-backend"
echo "   sudo systemctl status nginx"
echo ""
echo "🔍 Health Check:"
echo "   ./health-check.sh"
echo ""
echo "📝 Logs:"
echo "   sudo journalctl -u cvd-backend -f"
echo "   sudo tail -f /var/log/nginx/access.log"
echo ""
echo "🔐 Security Groups:"
echo "   Make sure ports 80 and 8001 are open in AWS Security Group"
echo ""