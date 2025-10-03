# EC2 Instance Launch Guide

## 🚀 Step-by-Step EC2 Setup

### 1. Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance

2. **Configure Instance:**
   ```
   Name: cvd-detection-server
   OS: Ubuntu Server 22.04 LTS (64-bit)
   Instance Type: t3.medium (2 vCPU, 4GB RAM)
   Key Pair: Create new or use existing
   ```

3. **Network Settings:**
   ```
   VPC: Default VPC
   Subnet: Default subnet
   Auto-assign Public IP: Enable
   ```

4. **Security Group Rules:**
   ```
   SSH (22)     - Your IP only
   HTTP (80)    - 0.0.0.0/0
   HTTPS (443)  - 0.0.0.0/0  
   Custom (8001) - 0.0.0.0/0
   ```

5. **Storage:**
   ```
   Root Volume: 30 GB gp3
   ```

6. **Launch Instance!**

### 2. Connect to Instance

```bash
# Replace with your actual key file and IP
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

### 3. Run Setup Script

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/GowthamDhanaraju/CVD-detection-and-correction/main/ec2-deployment/setup-ec2.sh | bash
```

### 4. Access Your Application

```bash
# Your CVD Detection system will be available at:
http://your-ec2-public-ip

# API directly accessible at:
http://your-ec2-public-ip/api/
```

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install python3 python3-pip python3-venv nginx git -y

# 3. Clone repository
git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git
cd CVD-detection-and-correction

# 4. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Start backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

## 🎯 What You'll Get

- **Public URL**: Accessible from anywhere
- **Professional Setup**: Nginx + FastAPI + SSL ready
- **Persistent**: Survives reboots
- **Monitored**: Health checks and logging
- **Scalable**: Easy to upgrade instance

## 💡 Next Steps After Deployment

1. **Custom Domain** (Optional):
   - Register domain
   - Point DNS to EC2 IP
   - Setup SSL certificate

2. **Database Upgrade** (Optional):
   - Replace SQLite with PostgreSQL/MySQL
   - Setup RDS instance

3. **Load Balancing** (Optional):
   - Add Application Load Balancer
   - Multiple EC2 instances

4. **Monitoring** (Optional):
   - CloudWatch integration
   - Custom dashboards

## 🚨 Important Notes

- **Keep your key file safe** - it's your only way to access the server
- **Update Security Group** - Only allow your IP for SSH
- **Regular backups** - Snapshot your instance periodically
- **Monitor costs** - Set up billing alerts

Ready to launch your EC2 instance? This will give you a professional, publicly accessible CVD detection system!