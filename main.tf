provider "aws" {
  region = "ap-south-1"  # change to your region
}

# IAM role for EC2 to access S3
resource "aws_iam_role" "ec2_s3_role" {
  name = "ec2-s3-access-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "CVD-EC2-S3-Role"
    Project = "CVD-Detection"
  }
}

# IAM policy for S3 access
resource "aws_iam_policy" "s3_access_policy" {
  name = "s3-cvd-models-access"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::cvd-models-bucket-1619722215",
          "arn:aws:s3:::cvd-models-bucket-1619722215/*"
        ]
      }
    ]
  })

  tags = {
    Name = "CVD-S3-Access-Policy"
    Project = "CVD-Detection"
  }
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "s3_access_attachment" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

# Instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-s3-profile"
  role = aws_iam_role.ec2_s3_role.name

  tags = {
    Name = "CVD-EC2-Profile"
    Project = "CVD-Detection"
  }
}

# Security group with proper rules
resource "aws_security_group" "cvd_sg" {
  name_prefix = "cvd-security-group"
  description = "Security group for CVD Detection application"

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API (for debugging/direct access)
  ingress {
    description = "Backend API"
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "CVD-Security-Group"
    Project = "CVD-Detection"
  }
}

# EC2 Instance
resource "aws_instance" "cvd_host" {
  ami           = "ami-02d26659fd82cf299" # Ubuntu 22.04 in ap-south-1
  instance_type = "t2.micro"             # FREE TIER ELIGIBLE
  key_name      = "cvd_instance_key"      # The key name of your PEM in AWS
  vpc_security_group_ids = [aws_security_group.cvd_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = 20               # FREE TIER: Up to 30GB, using 20GB to be safe
    volume_type = "gp2"           # FREE TIER: gp2 is included in free tier
    delete_on_termination = true
    encrypted = false             # FREE TIER: Encryption not included in free tier
  }

  user_data = base64encode(file("${path.module}/ec2-deployment/user-data.sh"))

  tags = {
    Name = "CVD-Detection-Server"
    Project = "CVD-Detection"
    Environment = "Production"
  }
}

# Output the connection details
output "instance_details" {
  value = {
    public_ip = aws_instance.cvd_host.public_ip
    public_dns = aws_instance.cvd_host.public_dns
    instance_id = aws_instance.cvd_host.id
    security_group_id = aws_security_group.cvd_sg.id
  }
  description = "EC2 instance connection details"
}

output "application_urls" {
  value = {
    main_app = "http://${aws_instance.cvd_host.public_ip}"
    api_docs = "http://${aws_instance.cvd_host.public_ip}/api/docs"
    health_check = "http://${aws_instance.cvd_host.public_ip}/health"
  }
  description = "Application access URLs"
}

output "ssh_command" {
  value = "ssh -i cvd_instance_key.pem ubuntu@${aws_instance.cvd_host.public_ip}"
  description = "SSH command to connect to the instance"
}
