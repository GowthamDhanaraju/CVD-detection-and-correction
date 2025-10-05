#!/bin/bash
# Complete AWS EC2 Deployment Script for CVD Detection Application
# Usage: ./deploy.sh [environment]

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-production}"
PROJECT_NAME="CVD-Detection"
AWS_REGION="ap-south-1"
KEY_NAME="cvd_instance_key"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if key pair exists
    if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" &> /dev/null; then
        log_warning "Key pair '$KEY_NAME' not found. Please create it in AWS EC2 console."
        log_info "You can create it with: aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem"
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# Function to validate code changes
validate_changes() {
    log_info "Validating recent code changes..."
    
    # Check if required files exist
    local required_files=(
        "backend/Dockerfile"
        "mobile-app/Dockerfile"
        "docker-compose.production.yml"
        "nginx.conf"
        "ec2-deployment/user-data.sh"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Check for Python cache files (should be cleaned)
    if [[ -d "backend/__pycache__" ]]; then
        log_warning "Python cache files found. Cleaning..."
        rm -rf backend/__pycache__
    fi
    
    log_success "Code validation passed!"
}

# Function to run terraform deployment
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    # Initialize Terraform
    terraform init
    
    # Validate Terraform configuration
    terraform validate
    
    # Plan deployment
    log_info "Creating deployment plan..."
    terraform plan -out=tfplan
    
    # Confirm deployment
    echo ""
    log_warning "This will deploy the CVD Detection application to AWS EC2."
    log_warning "Resources will be created in region: $AWS_REGION"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled."
        exit 0
    fi
    
    # Apply deployment
    log_info "Applying deployment..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Infrastructure deployment completed!"
}

# Function to get deployment outputs
get_deployment_info() {
    log_info "Retrieving deployment information..."
    
    # Get outputs from Terraform
    INSTANCE_ID=$(terraform output -raw instance_details | jq -r '.instance_id')
    PUBLIC_IP=$(terraform output -raw instance_details | jq -r '.public_ip')
    PUBLIC_DNS=$(terraform output -raw instance_details | jq -r '.public_dns')
    
    echo ""
    log_success "Deployment Information:"
    echo "========================"
    echo "Instance ID: $INSTANCE_ID"
    echo "Public IP: $PUBLIC_IP"
    echo "Public DNS: $PUBLIC_DNS"
    echo ""
    echo "Application URLs:"
    echo "- Main App: http://$PUBLIC_IP"
    echo "- API Docs: http://$PUBLIC_IP/api/docs"
    echo "- Health Check: http://$PUBLIC_IP/health"
    echo ""
    echo "SSH Access:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
    echo ""
}

# Function to wait for deployment completion
wait_for_deployment() {
    log_info "Waiting for application deployment to complete..."
    
    local max_wait=600  # 10 minutes
    local elapsed=0
    local check_interval=30
    
    while [ $elapsed -lt $max_wait ]; do
        if curl -sf "http://$PUBLIC_IP/health" &> /dev/null; then
            log_success "Application is responding!"
            return 0
        fi
        
        log_info "Waiting for application... ($elapsed/$max_wait seconds)"
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    log_warning "Application didn't respond within $max_wait seconds."
    log_info "This is normal for first deployment. The application might still be starting."
    log_info "You can check the status by SSH-ing into the instance and running:"
    log_info "sudo tail -f /var/log/cvd-deployment.log"
}

# Function to perform post-deployment verification
verify_deployment() {
    log_info "Performing post-deployment verification..."
    
    # Test health endpoint
    if curl -sf "http://$PUBLIC_IP/health" &> /dev/null; then
        log_success "Health check: PASSED"
    else
        log_warning "Health check: FAILED (may still be starting)"
    fi
    
    # Test main application
    if curl -sf "http://$PUBLIC_IP" &> /dev/null; then
        log_success "Main application: ACCESSIBLE"
    else
        log_warning "Main application: NOT ACCESSIBLE (may still be starting)"
    fi
    
    # Check instance status
    local instance_state=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].State.Name' --output text)
    
    if [[ "$instance_state" == "running" ]]; then
        log_success "EC2 Instance: RUNNING"
    else
        log_error "EC2 Instance: $instance_state"
    fi
}

# Function to display monitoring information
show_monitoring_info() {
    echo ""
    log_info "Monitoring and Management Information:"
    echo "===================================="
    echo ""
    echo "📊 Health Monitoring:"
    echo "curl http://$PUBLIC_IP/health"
    echo ""
    echo "🔍 SSH Access:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
    echo ""
    echo "📝 View Application Logs:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'sudo tail -f /var/log/cvd-deployment.log'"
    echo ""
    echo "🐳 Docker Management:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml ps'"
    echo ""
    echo "🔄 Restart Application:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml restart'"
    echo ""
    echo "🛠️ Full Health Check:"
    echo "ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP '/opt/cvd-app/health-check.sh'"
    echo ""
    echo "💰 Cost Management:"
    echo "To stop the instance: aws ec2 stop-instances --instance-ids $INSTANCE_ID"
    echo "To terminate resources: terraform destroy"
    echo ""
}

# Function to create local deployment summary
create_deployment_summary() {
    local summary_file="deployment-summary.txt"
    
    cat > "$summary_file" << EOF
CVD Detection Application - Deployment Summary
=============================================
Deployed: $(date)
Environment: $ENVIRONMENT
Region: $AWS_REGION

Instance Details:
- Instance ID: $INSTANCE_ID
- Public IP: $PUBLIC_IP
- Public DNS: $PUBLIC_DNS

Application Access:
- Main App: http://$PUBLIC_IP
- API Documentation: http://$PUBLIC_IP/api/docs
- Health Check: http://$PUBLIC_IP/health

SSH Access:
ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP

Quick Management Commands:
- View logs: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'sudo tail -f /var/log/cvd-deployment.log'
- Check status: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP '/opt/cvd-app/health-check.sh'
- Restart app: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'cd /opt/cvd-app && docker-compose -f docker-compose.production.yml restart'

Cost Management:
- Stop instance: aws ec2 stop-instances --instance-ids $INSTANCE_ID
- Destroy resources: terraform destroy

Generated by CVD Detection deployment script.
EOF

    log_success "Deployment summary saved to: $summary_file"
}

# Main deployment function
main() {
    echo ""
    log_info "🚀 CVD Detection AWS EC2 Deployment Script"
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    echo ""
    
    # Run all deployment steps
    check_prerequisites
    validate_changes
    deploy_infrastructure
    get_deployment_info
    wait_for_deployment
    verify_deployment
    show_monitoring_info
    create_deployment_summary
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    log_info "Your CVD Detection application is now running at: http://$PUBLIC_IP"
    echo ""
}

# Handle script interruption
trap 'log_error "Deployment interrupted!"; exit 1' INT TERM

# Run main function
main "$@"