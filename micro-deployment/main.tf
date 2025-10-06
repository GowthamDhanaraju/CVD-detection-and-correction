terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

# Security Group
resource "aws_security_group" "cvd_micro_sg" {
  name_prefix = "cvd-micro-sg"
  description = "Security group for CVD micro instance"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "cvd-micro-security-group"
  }
}

# Use existing key pair
data "aws_key_pair" "existing_key" {
  key_name = "cvd_instance_key"
}

# EC2 Instance
resource "aws_instance" "cvd_micro_instance" {
  ami                     = "ami-0dee22c13ea7a9a67"  # Ubuntu 24.04 LTS
  instance_type          = "t2.micro"
  key_name               = data.aws_key_pair.existing_key.key_name
  vpc_security_group_ids = [aws_security_group.cvd_micro_sg.id]
  
  root_block_device {
    volume_type = "gp2"
    volume_size = 8  # Minimal storage
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/../ec2-deployment/user-data-micro.sh", {
    github_repo = "https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git"
    branch      = "micro-deployment"
  }))

  tags = {
    Name = "cvd-micro-instance"
    Environment = "production-micro"
  }
}

# Output
output "micro_instance_public_ip" {
  value = aws_instance.cvd_micro_instance.public_ip
  description = "Public IP address of the CVD micro instance"
}