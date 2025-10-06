# AWS EC2 Deployment for Color Vision Deficiency Detection System

## 🚀 Current Production Deployment

### 🌐 Live System  
**URL**: [https://13.232.255.114](https://13.232.255.114)  
**Status**: ✅ Active and Accessible  
**Deployment**: AWS EC2 t2.micro (Mumbai region)  

### 📊 Current Metrics (Last Updated: Oct 2025)
- **Instance Type**: t2.micro (1 vCPU, 1GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Uptime**: 24/7 availability
- **SSL**: HTTPS enabled
- **Performance**: Optimized for lightweight operations

## 🏗️ Current Architecture

```
┌─────────────────────────────────────┐
│       AWS EC2 t2.micro Instance     │
├─────────────────────────────────────┤
│  Nginx Reverse Proxy (Port 80/443) │
│  └─ SSL Termination & Compression  │
├─────────────────────────────────────┤
│  React Web App (Micro Branch)      │
│  ├─ Responsive Mobile UI           │
│  ├─ Color Vision Testing           │
│  └─ Traditional Filter Algorithms  │
├─────────────────────────────────────┤
│  FastAPI Backend (Port 8001)       │
│  ├─ Lightweight CVD Detection      │
│  ├─ Ishihara Test Generation       │
│  └─ Basic Filter Processing        │
├─────────────────────────────────────┤
│  File Storage                      │
│  ├─ User Test Results              │
│  ├─ Color Pattern Images           │
│  └─ System Configuration           │
└─────────────────────────────────────┘
```

## 🎯 Production Deployment (Micro Branch)

The live system runs the **micro branch** which is optimized for:
- ✅ Lightweight resource usage (fits in 1GB RAM)
- ✅ Fast response times
- ✅ Reliable color vision testing
- ✅ Traditional filter algorithms
- ✅ Cost-effective hosting ($8-12/month)

## 💰 Current Costs

### Monthly Operating Costs (Mumbai Region)
- **t2.micro**: Free tier eligible / ~$8-12/month
- **EBS Storage (20GB)**: ~$2/month  
- **Data Transfer**: ~$1-3/month
- **Total Monthly**: ~$3-17/month (depending on free tier)

### Resource Optimization
- ✅ **Ultra-conservative CPU limits**: 0.3 CPU cores
- ✅ **Memory optimization**: 512MB containers
- ✅ **Efficient caching**: Redis for session management
- ✅ **Compressed assets**: Nginx gzip compression

## 🔧 Main Branch Deployment (Advanced)

For full ML capabilities, upgrade to larger instance:

### Recommended for Main Branch
- **t3.medium** (2 vCPU, 4GB) - $30/month
- **t3.large** (2 vCPU, 8GB) - $60/month
- **Supports**: Full GAN models, PyTorch processing

### Main Branch Features
- 🧠 PyTorch GAN filter generation
- 🎯 Advanced CVD detection algorithms  
- 📊 Comprehensive analytics
- 🔄 Real-time image processing

## 🚀 Deployment Comparison

| Feature | Micro Branch (Live) | Main Branch |
|---------|-------------------|-------------|
| **Instance Size** | t2.micro (1GB) | t3.medium+ (4GB+) |
| **Cost/Month** | $3-17 | $30-60+ |
| **ML Models** | Traditional algorithms | PyTorch GAN models |
| **Performance** | Fast, lightweight | Advanced processing |
| **Best For** | Demo, testing | Production, research |

## 🛠️ Manual Deployment Steps

### For Micro Branch (Current Live)
```bash
# 1. Launch t2.micro instance
# 2. SSH to instance
ssh -i your-key.pem ubuntu@13.232.255.114

# 3. Clone micro branch
git clone -b micro-deployment https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git

# 4. Run deployment script
cd CVD-detection-and-correction
chmod +x setup-micro.sh
./setup-micro.sh
```

### For Main Branch (Full Features)
```bash
# 1. Launch t3.medium+ instance  
# 2. SSH to instance
ssh -i your-key.pem ubuntu@your-new-ip

# 3. Clone main branch
git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git

# 4. Run full deployment
cd CVD-detection-and-correction/ec2-deployment
chmod +x setup-ec2.sh
./setup-ec2.sh
```

## 🚀 Advantages of EC2

### vs Cloud Services (ECS/Lambda)
- **Full Control**: Install anything you need
- **Persistent Storage**: Keep data between sessions
- **Cost Predictable**: Fixed monthly cost
- **Easy Debugging**: Direct SSH access

### vs Local Development
- **Public Access**: Share with anyone via URL
- **24/7 Uptime**: Always available
- **Production Environment**: Real deployment
- **Scalable**: Upgrade instance when needed

## 🎯 Use Cases

### 1. **Demo/Portfolio**
- Public URL to showcase your project
- Professional deployment
- Share with employers/clients
- Always accessible

### 2. **Testing/Development**
- Production-like environment
- Test with real users
- Performance benchmarking
- Load testing

### 3. **Medical Applications**
- HIPAA-compliant setup possible
- Secure data handling
- Remote access for clinics
- Audit logging

## 🔒 Security Best Practices

### Instance Security
- **SSH Key Only**: No password authentication
- **Security Groups**: Minimal port exposure
- **SSL Certificate**: HTTPS encryption
- **Firewall**: UFW configuration
- **Updates**: Automated security patches

### Application Security
- **Environment Variables**: Secure API keys
- **Input Validation**: Prevent injection attacks
- **Rate Limiting**: Prevent abuse
- **Logging**: Monitor access patterns

Ready to deploy to EC2? This will give you a professional, scalable deployment!