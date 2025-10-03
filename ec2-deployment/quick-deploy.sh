#!/bin/bash
# Quick deployment commands for EC2

echo "🚀 CVD Detection EC2 Quick Deploy"
echo "=================================="

# Check if running on EC2
if ! curl -s http://169.254.169.254/latest/meta-data/ > /dev/null; then
    echo "❌ This script should be run on an EC2 instance"
    exit 1
fi

# Get instance metadata
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

echo "📍 Instance: $INSTANCE_ID"
echo "🌐 Public IP: $PUBLIC_IP"
echo "🗺️ Region: $REGION"
echo ""

# Run main setup
./setup-ec2.sh

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🔗 Access your CVD Detection system:"
echo "   http://$PUBLIC_IP"
echo ""
echo "📱 Share this URL with others to test your system!"
echo ""