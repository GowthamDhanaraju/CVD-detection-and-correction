# 🚀 AWS EC2 Deployment Guide - CVD Detection Application

This guide will help you deploy the Color Vision Deficiency (CVD) Detection and Correction application to AWS EC2 using Terraform.

## 📋 Prerequisites

### Required Software
- **Terraform** (>= 1.0): [Install Terraform](https://terraform.io/downloads)
- **AWS CLI** (>= 2.0): [Install AWS CLI](https://aws.amazon.com/cli/)
- **Git**: For cloning and managing code
- **jq**: For JSON processing (optional but recommended)

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with access keys
- EC2 Key Pair created in your target region

## 🔧 Pre-Deployment Setup

### 1. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Key, Region (ap-south-1), and output format (json)
```

### 2. Create EC2 Key Pair
```bash
# Create key pair (replace 'cvd_instance_key' with your preferred name)
aws ec2 create-key-pair --key-name cvd_instance_key --query 'KeyMaterial' --output text > cvd_instance_key.pem

# Set proper permissions
chmod 400 cvd_instance_key.pem
```

### 3. Verify Prerequisites
```bash
# Check Terraform
terraform --version

# Check AWS access
aws sts get-caller-identity

# Check key pair exists
aws ec2 describe-key-pairs --key-names cvd_instance_key
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

The simplest way to deploy using our automated script:

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

This script will:
- ✅ Check all prerequisites
- ✅ Validate code changes
- ✅ Deploy infrastructure with Terraform
- ✅ Wait for application to start
- ✅ Verify deployment
- ✅ Provide monitoring information

### Method 2: Manual Deployment

If you prefer step-by-step control:

```bash
# 1. Initialize Terraform
terraform init

# 2. Review deployment plan
terraform plan

# 3. Apply deployment
terraform apply

# 4. Get outputs
terraform output
```

## 🏗️ Architecture Overview

### Infrastructure Components
- **EC2 Instance**: t3.medium with Ubuntu 22.04
- **Security Group**: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 8001 (API)
- **IAM Role**: For S3 access to download ML models
- **EBS Storage**: 30GB encrypted storage

### Application Stack
- **Reverse Proxy**: Nginx with load balancing and SSL termination
- **Backend API**: FastAPI with enhanced GAN filters
- **Frontend**: React/Expo web application  
- **Cache**: Redis for session management
- **Message Queue**: Kafka for analytics and feedback
- **ML Models**: Pre-trained GAN models for CVD correction

### Docker Services
```
nginx (Port 80) → Frontend (8080) + Backend (8001)
                ↓
            Redis (6379) + Kafka (9092)
                ↓
            ML Models + Data Storage
```

## 🔧 Configuration Files

### Updated for Production
- **`backend/Dockerfile`**: Optimized Python container with health checks
- **`mobile-app/Dockerfile`**: Production-ready React/Expo build
- **`docker-compose.production.yml`**: Full production stack with Nginx
- **`nginx.conf`**: Advanced reverse proxy with security headers
- **`main.tf`**: Terraform infrastructure with proper security
- **`ec2-deployment/user-data.sh`**: Automated EC2 setup script

### Key Improvements Made
- 🔒 **Enhanced Security**: Firewall, fail2ban, encrypted storage
- 🚀 **Better Performance**: t3.medium instance, optimized containers
- 📊 **Monitoring**: Health checks, logging, automated restart
- 🔄 **Reverse Proxy**: Nginx with proper API routing
- 🛡️ **Production Ready**: Environment variables, secrets management

## 🌐 Accessing Your Application

After successful deployment:

### Main Application
```
http://YOUR_PUBLIC_IP
```

### API Documentation
```
http://YOUR_PUBLIC_IP/api/docs
```

### Health Check
```
http://YOUR_PUBLIC_IP/health
```

## 🔍 Monitoring and Management

### SSH Access
```bash
ssh -i cvd_instance_key.pem ubuntu@YOUR_PUBLIC_IP
```

### Application Logs
```bash
# Deployment logs
sudo tail -f /var/log/cvd-deployment.log

# Application logs
cd /opt/cvd-app
docker-compose -f docker-compose.production.yml logs -f
```

### Health Monitoring
```bash
# Run health check script
/opt/cvd-app/health-check.sh

# Check container status
docker-compose -f docker-compose.production.yml ps

# Monitor resources
docker stats
```

### Service Management
```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend

# Update application (pull latest code)
git pull origin main
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

## 🐛 Troubleshooting

### Common Issues

#### Application Not Responding
```bash
# Check if containers are running
docker ps

# Check logs for errors
docker-compose -f docker-compose.production.yml logs

# Restart services
docker-compose -f docker-compose.production.yml restart
```

#### Port Access Issues
```bash
# Check security group
aws ec2 describe-security-groups --filters "Name=group-name,Values=cvd-security-group*"

# Test connectivity
curl -v http://YOUR_PUBLIC_IP/health
```

#### Out of Memory/Disk Space
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Clean up Docker
docker system prune -a
```

#### Model Loading Issues
```bash
# Check if models were downloaded
ls -la /opt/cvd-app/models/saved_models/

# Re-download models
cd /opt/cvd-app
aws s3 sync s3://cvd-models-bucket-1619722215/saved_models/ ./models/saved_models/
```

### Performance Optimization

#### Scale Up Instance
```bash
# Stop instance
aws ec2 stop-instances --instance-ids YOUR_INSTANCE_ID

# Change instance type
aws ec2 modify-instance-attribute --instance-id YOUR_INSTANCE_ID --instance-type Value=t3.large

# Start instance
aws ec2 start-instances --instance-ids YOUR_INSTANCE_ID
```

#### Optimize Docker Resources
```yaml
# In docker-compose.production.yml, adjust resource limits:
deploy:
  resources:
    limits:
      cpus: '4.0'
      memory: 8G
    reservations:
      cpus: '2.0'
      memory: 4G
```

## 💰 Cost Management

### Stop Instance (Save Costs)
```bash
# Stop instance (keeps data, stops billing for compute)
aws ec2 stop-instances --instance-ids YOUR_INSTANCE_ID

# Start when needed
aws ec2 start-instances --instance-ids YOUR_INSTANCE_ID
```

### Complete Cleanup
```bash
# Destroy all resources (WARNING: This deletes everything!)
terraform destroy
```

### Monthly Cost Estimate
- **t3.medium**: ~$30-40/month
- **EBS Storage (30GB)**: ~$3/month
- **Data Transfer**: Variable
- **Total**: ~$35-45/month

## 🔐 Security Considerations

### Implemented Security Measures
- ✅ Encrypted EBS storage
- ✅ Security groups with minimal required ports
- ✅ UFW firewall enabled
- ✅ Fail2ban for SSH protection
- ✅ Non-root container execution
- ✅ Nginx security headers
- ✅ Rate limiting on API endpoints

### Additional Security (Recommended)
- 🔧 Set up SSL/TLS certificates
- 🔧 Configure CloudFlare or AWS CloudFront
- 🔧 Enable AWS Config and CloudTrail
- 🔧 Set up automated backups

## 📚 Additional Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React/Expo Documentation](https://docs.expo.dev/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

### AWS Resources
- [EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-learning/)
- [AWS Cost Optimization](https://aws.amazon.com/aws-cost-management/)

## 🆘 Support

If you encounter issues:

1. **Check logs**: Always start with application and system logs
2. **Verify prerequisites**: Ensure all requirements are met
3. **Test connectivity**: Check network and security group settings
4. **Resource monitoring**: Verify sufficient CPU, memory, and disk space
5. **Update code**: Pull latest changes and rebuild if needed

### Log Locations
- **Deployment**: `/var/log/cvd-deployment.log`
- **Application**: `docker-compose logs`
- **Nginx**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **System**: `journalctl -u cvd-app.service`

---

## 🎉 Success!

Once deployed successfully, your CVD Detection application will be:
- 🌐 **Accessible** via web browser at your public IP
- 🔄 **Auto-restarting** on failures
- 📊 **Monitored** with health checks
- 🔒 **Secured** with proper firewall and security measures
- 📈 **Scalable** for increased traffic

Enjoy your production CVD Detection application! 🎯