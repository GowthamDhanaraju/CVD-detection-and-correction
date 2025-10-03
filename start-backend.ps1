# CVD Detection Backend Startup Script for PowerShell
Write-Host "Starting CVD Detection Backend..." -ForegroundColor Green

# Change to backend directory
Set-Location -Path (Join-Path $PSScriptRoot "backend")

# Activate virtual environment
& .\cvd_backend_env\Scripts\Activate.ps1

Write-Host "Backend environment activated" -ForegroundColor Yellow
Write-Host "Starting FastAPI server on http://localhost:8001" -ForegroundColor Cyan

# Start the FastAPI server
python main.py