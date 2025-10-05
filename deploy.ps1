# CVD Detection AWS EC2 Deployment Script for Windows PowerShell
# Usage: .\deploy.ps1 [environment]

param(
    [Parameter(Position=0)]
    [string]$Environment = "production"
)

# Configuration
$PROJECT_NAME = "CVD-Detection"
$AWS_REGION = "ap-south-1"
$KEY_NAME = "cvd_instance_key"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $emoji = switch ($Color) {
        "Green" { "✅" }
        "Yellow" { "⚠️" }
        "Red" { "❌" }
        "Blue" { "ℹ️" }
        default { "📝" }
    }
    
    Write-Host "$emoji $Message" -ForegroundColor $Color
}

function Log-Info($message) { Write-ColorOutput $message "Blue" }
function Log-Success($message) { Write-ColorOutput $message "Green" }
function Log-Warning($message) { Write-ColorOutput $message "Yellow" }
function Log-Error($message) { Write-ColorOutput $message "Red" }

# Function to check prerequisites
function Test-Prerequisites {
    Log-Info "Checking prerequisites..."
    
    # Check if terraform is installed
    try {
        $terraformVersion = terraform --version
        Log-Success "Terraform found: $($terraformVersion[0])"
    }
    catch {
        Log-Error "Terraform is not installed. Please install Terraform first."
        exit 1
    }
    
    # Check if AWS CLI is installed
    try {
        $awsVersion = aws --version
        Log-Success "AWS CLI found: $awsVersion"
    }
    catch {
        Log-Error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    }
    
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Log-Success "AWS credentials configured for: $($identity.Arn)"
    }
    catch {
        Log-Error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    }
    
    # Check if key pair exists
    try {
        aws ec2 describe-key-pairs --key-names $KEY_NAME --output json | Out-Null
        Log-Success "Key pair '$KEY_NAME' found"
    }
    catch {
        Log-Warning "Key pair '$KEY_NAME' not found. Please create it in AWS EC2 console."
        Log-Info "You can create it with: aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem"
        exit 1
    }
    
    Log-Success "All prerequisites met!"
}

# Function to validate code changes
function Test-CodeChanges {
    Log-Info "Validating recent code changes..."
    
    # Check if required files exist
    $requiredFiles = @(
        "backend\Dockerfile",
        "mobile-app\Dockerfile", 
        "docker-compose.production.yml",
        "nginx.conf",
        "ec2-deployment\user-data.sh"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Log-Error "Required file missing: $file"
            exit 1
        }
    }
    
    # Check for Python cache files (should be cleaned)
    if (Test-Path "backend\__pycache__") {
        Log-Warning "Python cache files found. Cleaning..."
        Remove-Item "backend\__pycache__" -Recurse -Force
    }
    
    Log-Success "Code validation passed!"
}

# Function to run terraform deployment
function Deploy-Infrastructure {
    Log-Info "Deploying infrastructure with Terraform..."
    
    # Initialize Terraform
    terraform init
    
    # Validate Terraform configuration
    terraform validate
    
    # Plan deployment
    Log-Info "Creating deployment plan..."
    terraform plan -out=tfplan
    
    # Confirm deployment
    Write-Host ""
    Log-Warning "This will deploy the CVD Detection application to AWS EC2."
    Log-Warning "Resources will be created in region: $AWS_REGION"
    $confirmation = Read-Host "Do you want to continue? (y/N)"
    
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Log-Info "Deployment cancelled."
        exit 0
    }
    
    # Apply deployment
    Log-Info "Applying deployment..."
    terraform apply tfplan
    
    # Clean up plan file
    Remove-Item tfplan -ErrorAction SilentlyContinue
    
    Log-Success "Infrastructure deployment completed!"
}

# Function to get deployment outputs
function Get-DeploymentInfo {
    Log-Info "Retrieving deployment information..."
    
    # Get outputs from Terraform
    $instanceDetails = terraform output -json instance_details | ConvertFrom-Json
    $applicationUrls = terraform output -json application_urls | ConvertFrom-Json
    $sshCommand = terraform output -raw ssh_command
    
    $script:INSTANCE_ID = $instanceDetails.instance_id
    $script:PUBLIC_IP = $instanceDetails.public_ip
    $script:PUBLIC_DNS = $instanceDetails.public_dns
    
    Write-Host ""
    Log-Success "Deployment Information:"
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host "Instance ID: $($script:INSTANCE_ID)"
    Write-Host "Public IP: $($script:PUBLIC_IP)"
    Write-Host "Public DNS: $($script:PUBLIC_DNS)"
    Write-Host ""
    Write-Host "Application URLs:" -ForegroundColor Cyan
    Write-Host "- Main App: $($applicationUrls.main_app)"
    Write-Host "- API Docs: $($applicationUrls.api_docs)"
    Write-Host "- Health Check: $($applicationUrls.health_check)"
    Write-Host ""
    Write-Host "SSH Access:" -ForegroundColor Cyan
    Write-Host $sshCommand
    Write-Host ""
}

# Function to wait for deployment completion
function Wait-ForDeployment {
    Log-Info "Waiting for application deployment to complete..."
    
    $maxWait = 600  # 10 minutes
    $elapsed = 0
    $checkInterval = 30
    
    while ($elapsed -lt $maxWait) {
        try {
            $response = Invoke-WebRequest -Uri "http://$($script:PUBLIC_IP)/health" -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Log-Success "Application is responding!"
                return
            }
        }
        catch {
            # Continue waiting
        }
        
        Log-Info "Waiting for application... ($elapsed/$maxWait seconds)"
        Start-Sleep $checkInterval
        $elapsed += $checkInterval
    }
    
    Log-Warning "Application didn't respond within $maxWait seconds."
    Log-Info "This is normal for first deployment. The application might still be starting."
    Log-Info "You can check the status by SSH-ing into the instance and running:"
    Log-Info "sudo tail -f /var/log/cvd-deployment.log"
}

# Function to perform post-deployment verification
function Test-Deployment {
    Log-Info "Performing post-deployment verification..."
    
    # Test health endpoint
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://$($script:PUBLIC_IP)/health" -TimeoutSec 10
        if ($healthResponse.StatusCode -eq 200) {
            Log-Success "Health check: PASSED"
        }
    }
    catch {
        Log-Warning "Health check: FAILED (may still be starting)"
    }
    
    # Test main application
    try {
        $appResponse = Invoke-WebRequest -Uri "http://$($script:PUBLIC_IP)" -TimeoutSec 10
        if ($appResponse.StatusCode -eq 200) {
            Log-Success "Main application: ACCESSIBLE"
        }
    }
    catch {
        Log-Warning "Main application: NOT ACCESSIBLE (may still be starting)"
    }
    
    # Check instance status
    $instanceState = aws ec2 describe-instances --instance-ids $script:INSTANCE_ID --query 'Reservations[0].Instances[0].State.Name' --output text
    
    if ($instanceState -eq "running") {
        Log-Success "EC2 Instance: RUNNING"
    }
    else {
        Log-Error "EC2 Instance: $instanceState"
    }
}

# Function to display monitoring information
function Show-MonitoringInfo {
    Write-Host ""
    Log-Info "Monitoring and Management Information:"
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Health Monitoring:" -ForegroundColor Yellow
    Write-Host "Invoke-WebRequest -Uri http://$($script:PUBLIC_IP)/health"
    Write-Host ""
    Write-Host "🔍 SSH Access:" -ForegroundColor Yellow
    Write-Host "ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP)"
    Write-Host ""
    Write-Host "📝 View Application Logs:" -ForegroundColor Yellow
    Write-Host "ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) 'sudo tail -f /var/log/cvd-deployment.log'"
    Write-Host ""
    Write-Host "🐳 Docker Management:" -ForegroundColor Yellow
    Write-Host "ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml ps'"
    Write-Host ""
    Write-Host "🔄 Restart Application:" -ForegroundColor Yellow
    Write-Host "ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml restart'"
    Write-Host ""
    Write-Host "🛠️ Full Health Check:" -ForegroundColor Yellow
    Write-Host "ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) '/opt/cvd-app/health-check.sh'"
    Write-Host ""
    Write-Host "💰 Cost Management:" -ForegroundColor Yellow
    Write-Host "To stop the instance: aws ec2 stop-instances --instance-ids $($script:INSTANCE_ID)"
    Write-Host "To terminate resources: terraform destroy"
    Write-Host ""
}

# Function to create local deployment summary
function New-DeploymentSummary {
    $summaryFile = "deployment-summary.txt"
    
    $summaryContent = @"
CVD Detection Application - Deployment Summary
=============================================
Deployed: $(Get-Date)
Environment: $Environment
Region: $AWS_REGION

Instance Details:
- Instance ID: $($script:INSTANCE_ID)
- Public IP: $($script:PUBLIC_IP)
- Public DNS: $($script:PUBLIC_DNS)

Application Access:
- Main App: http://$($script:PUBLIC_IP)
- API Documentation: http://$($script:PUBLIC_IP)/api/docs
- Health Check: http://$($script:PUBLIC_IP)/health

SSH Access:
ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP)

Quick Management Commands:
- View logs: ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) 'sudo tail -f /var/log/cvd-deployment.log'
- Check status: ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) '/opt/cvd-app/health-check.sh'
- Restart app: ssh -i ${KEY_NAME}.pem ubuntu@$($script:PUBLIC_IP) 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml restart'

Cost Management:
- Stop instance: aws ec2 stop-instances --instance-ids $($script:INSTANCE_ID)
- Destroy resources: terraform destroy

Generated by CVD Detection deployment script.
"@

    $summaryContent | Out-File -FilePath $summaryFile -Encoding UTF8
    Log-Success "Deployment summary saved to: $summaryFile"
}

# Main deployment function
function Main {
    Write-Host ""
    Log-Info "🚀 CVD Detection AWS EC2 Deployment Script"
    Log-Info "Environment: $Environment"
    Log-Info "Region: $AWS_REGION"
    Write-Host ""
    
    try {
        # Run all deployment steps
        Test-Prerequisites
        Test-CodeChanges
        Deploy-Infrastructure
        Get-DeploymentInfo
        Wait-ForDeployment
        Test-Deployment
        Show-MonitoringInfo
        New-DeploymentSummary
        
        Write-Host ""
        Log-Success "🎉 Deployment completed successfully!"
        Log-Info "Your CVD Detection application is now running at: http://$($script:PUBLIC_IP)"
        Write-Host ""
    }
    catch {
        Log-Error "Deployment failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run main function
Main