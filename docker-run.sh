#!/bin/bash

# CVD Application Docker Build and Run Script

set -e

echo "🚀 Building CVD Detection Application with Docker"

# Function to print colored output
print_status() {
    echo -e "\033[1;32m[INFO]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Parse command line arguments
ENVIRONMENT=${1:-development}
ACTION=${2:-up}

case $ENVIRONMENT in
    "development"|"dev")
        COMPOSE_FILE="docker-compose.yml"
        print_status "Using development environment"
        ;;
    "production"|"prod")
        COMPOSE_FILE="docker-compose.prod.yml"
        print_status "Using production environment"
        ;;
    *)
        print_error "Invalid environment. Use 'development' or 'production'"
        exit 1
        ;;
esac

case $ACTION in
    "build")
        print_status "Building Docker images..."
        docker-compose -f $COMPOSE_FILE build --no-cache
        ;;
    "up")
        print_status "Starting CVD application..."
        docker-compose -f $COMPOSE_FILE up -d
        print_status "Application started successfully!"
        print_status "Frontend: http://localhost:8082"
        print_status "Backend API: http://localhost:8001"
        print_status "API Documentation: http://localhost:8001/docs"
        ;;
    "down")
        print_status "Stopping CVD application..."
        docker-compose -f $COMPOSE_FILE down
        ;;
    "restart")
        print_status "Restarting CVD application..."
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    "clean")
        print_warning "This will remove all containers, images, and volumes!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Cleaning up..."
            docker-compose -f $COMPOSE_FILE down -v --rmi all
            docker system prune -f
        fi
        ;;
    *)
        print_error "Invalid action. Use: build, up, down, restart, logs, clean"
        exit 1
        ;;
esac

echo "✅ Done!"