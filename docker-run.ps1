# CVD Application Docker Build and Run Script for Windows
param(
    [Parameter(Position=0)]
    [ValidateSet("development", "dev", "production", "prod")]
    [string]$Environment = "development",
    
    [Parameter(Position=1)]
    [ValidateSet("build", "up", "down", "restart", "logs", "clean")]
    [string]$Action = "up"
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

Write-Host "🚀 Building CVD Detection Application with Docker" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
}

# Set compose file based on environment
switch ($Environment) {
    { $_ -in "development", "dev" } {
        $ComposeFile = "docker-compose.yml"
        Write-Status "Using development environment"
    }
    { $_ -in "production", "prod" } {
        $ComposeFile = "docker-compose.prod.yml"
        Write-Status "Using production environment"
    }
}

# Execute action
switch ($Action) {
    "build" {
        Write-Status "Building Docker images..."
        docker-compose -f $ComposeFile build --no-cache
    }
    "up" {
        Write-Status "Starting CVD application..."
        docker-compose -f $ComposeFile up -d
        Write-Status "Application started successfully!"
        Write-Host "Frontend: http://localhost:8082" -ForegroundColor Cyan
        Write-Host "Backend API: http://localhost:8001" -ForegroundColor Cyan
        Write-Host "API Documentation: http://localhost:8001/docs" -ForegroundColor Cyan
    }
    "down" {
        Write-Status "Stopping CVD application..."
        docker-compose -f $ComposeFile down
    }
    "restart" {
        Write-Status "Restarting CVD application..."
        docker-compose -f $ComposeFile down
        docker-compose -f $ComposeFile up -d
    }
    "logs" {
        docker-compose -f $ComposeFile logs -f
    }
    "clean" {
        Write-Warning "This will remove all containers, images, and volumes!"
        $confirmation = Read-Host "Are you sure? (y/N)"
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            Write-Status "Cleaning up..."
            docker-compose -f $ComposeFile down -v --rmi all
            docker system prune -f
        }
    }
}

Write-Host "✅ Done!" -ForegroundColor Green