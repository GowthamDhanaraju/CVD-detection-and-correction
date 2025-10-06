# Color Vision Deficiency Detection - Docker Deployment Guide

This guide explains how to deploy the **Color Vision Deficiency (CVD)** Detection and Correction application using Docker containers.

## 🏗️ Architecture

The application consists of the following services:

### Main Branch (Full ML Pipeline)
- **Frontend**: React Native Web application (Expo) - Port 8081
- **Backend**: FastAPI with PyTorch GAN models - Port 8001
- **Redis**: Caching and session management - Port 6379
- **Additional Services**: Enhanced ML processing capabilities

### Micro Branch (Lightweight)
- **Frontend**: React Web application (Vite) - Port 8080
- **Backend**: FastAPI with traditional algorithms - Port 8001
- **Redis**: Caching and session management - Port 6379
- **Nginx**: Reverse proxy for production - Port 80/443

## 📋 Branch Selection Guide

| Feature | Main Branch | Micro Branch |
|---------|-------------|--------------|
| **ML Models** | PyTorch GAN models | Traditional algorithms |
| **Memory Usage** | ~2-4GB | ~512MB-1GB |
| **Performance** | Advanced processing | Fast, lightweight |
| **Best For** | Development, research | Production, demos |

## 🚀 Quick Start

### Main Branch (Full Features)
```bash
# Clone repository
git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git
cd CVD-detection-and-correction

# Start with Docker Compose
docker-compose up -d

# Access applications
# Frontend: http://localhost:8081
# Backend API: http://localhost:8001/docs
```

### Micro Branch (Lightweight)
```bash
# Clone micro branch
git clone -b micro-deployment https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git
cd CVD-detection-and-correction

# Start micro deployment
docker-compose -f docker-compose.micro.yml up -d

# Access applications  
# Frontend: http://localhost:8080
# Backend API: http://localhost:8001/docs
```

## 📋 Prerequisites

### Required Software
- [Docker](https://docs.docker.com/get-docker/) (v20.10 or later)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0 or later)
- Git (for cloning the repository)

### System Requirements
- **Development**: 4GB RAM, 10GB disk space
- **Production**: 8GB RAM, 20GB disk space

### Port Requirements
Make sure the following ports are available:
- `8001` - Backend API
- `8082` - Frontend Web
- `6379` - Redis
- `9092` - Kafka
- `2181` - Zookeeper
- `80/443` - Nginx (production only)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git
cd CVD-detection-and-correction
```

### 2. Choose Your Environment

#### Development Environment
```bash
# Linux/Mac
./docker-run.sh development up

# Windows PowerShell
.\docker-run.ps1 development up

# Manual Docker Compose
docker-compose up -d
```

#### Production Environment
```bash
# Linux/Mac
./docker-run.sh production up

# Windows PowerShell
.\docker-run.ps1 production up

# Manual Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Access the Application

Once started, the application will be available at:
- **Frontend**: http://localhost:8082
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in the root directory for custom configuration:

```env
# Backend Configuration
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
LOG_LEVEL=INFO

# Database (if using external database)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (if using external Redis)
REDIS_URL=redis://redis:6379

# Kafka (if using external Kafka)
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_FEEDBACK_TOPIC=cvd_feedback

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Volume Mounts

The following directories are mounted as volumes:
- `./backend/data` - Application data and test results
- `./backend/models` - AI models and weights
- `./backend/test_images` - Test image patterns

## 📊 Management Commands

### Using Helper Scripts

#### Linux/Mac (bash)
```bash
# Build images
./docker-run.sh development build

# Start services
./docker-run.sh development up

# Stop services
./docker-run.sh development down

# Restart services
./docker-run.sh development restart

# View logs
./docker-run.sh development logs

# Clean everything
./docker-run.sh development clean
```

#### Windows (PowerShell)
```powershell
# Build images
.\docker-run.ps1 development build

# Start services
.\docker-run.ps1 development up

# Stop services
.\docker-run.ps1 development down

# Restart services
.\docker-run.ps1 development restart

# View logs
.\docker-run.ps1 development logs

# Clean everything
.\docker-run.ps1 development clean
```

### Manual Docker Compose Commands

```bash
# Build all services
docker-compose build

# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Scale services (if needed)
docker-compose up -d --scale backend=2

# Remove everything including volumes
docker-compose down -v --rmi all
```

## 🔍 Monitoring and Debugging

### Health Checks

Check service health:
```bash
# Backend health
curl http://localhost:8001/health

# Frontend health
curl http://localhost:8082

# Redis health
docker exec cvd-redis redis-cli ping

# Kafka health
docker exec cvd-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Logs

View service logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
docker-compose logs -f kafka

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Status

Check running containers:
```bash
docker-compose ps
docker stats
```

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
If ports are in use:
```bash
# Check what's using the port
netstat -tulpn | grep :8001
# or on Windows
netstat -an | findstr :8001

# Kill the process or change ports in docker-compose.yml
```

#### Memory Issues
If containers are killed due to memory:
```bash
# Check memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Or reduce resource limits in docker-compose.prod.yml
```

#### Permission Issues
If you get permission errors:
```bash
# Fix ownership (Linux/Mac)
sudo chown -R $USER:$USER ./backend/data ./backend/models

# On Windows, ensure Docker has access to the drive
```

#### Build Failures
If builds fail:
```bash
# Clean build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check for dependency issues in requirements.txt or package.json
```

### Reset Everything

To completely reset the application:
```bash
# Stop all containers
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

## 🚀 Production Deployment

### SSL/HTTPS Setup

1. Obtain SSL certificates and place them in `./ssl/` directory:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Uncomment HTTPS server block in `nginx.conf`

3. Update environment variables for production

### Load Balancing

For high availability, you can scale services:
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Use external load balancer for multiple servers
```

### Monitoring

Consider adding monitoring services:
- Prometheus + Grafana for metrics
- ELK Stack for log aggregation
- Health check monitoring

## 📝 Notes

- Development environment includes hot reloading
- Production environment is optimized for performance
- All data is persisted in Docker volumes
- Kafka is configured for single-node deployment
- Redis is configured with persistence enabled

## 🆘 Support

If you encounter issues:
1. Check the logs first: `docker-compose logs -f`
2. Verify all services are healthy: `docker-compose ps`
3. Check the troubleshooting section above
4. Open an issue on GitHub with logs and error details

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.