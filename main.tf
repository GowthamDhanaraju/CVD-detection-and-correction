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
}

resource "aws_security_group" "docker_sg" {
  name_prefix = "docker-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "docker_host" {
  ami           = "ami-02d26659fd82cf299" # Ubuntu 22.04 in ap-south-1
  instance_type = "t2.micro"
  key_name      = "cvd_instance_key" # The key name of your PEM in AWS
  vpc_security_group_ids = [aws_security_group.docker_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io git awscli
              systemctl start docker
              systemctl enable docker
              
              # Clone the repository
              cd /opt
              git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git cvd-app
              cd cvd-app
              
              # Pull latest changes to get Node.js 20 update
              git pull origin main
              
              # Create models directory
              mkdir -p ./models/saved_models
              
              # Download model files from S3
              aws s3 cp s3://cvd-models-bucket-1619722215/saved_models/cvd_discriminator_20250930_095913.pth ./models/saved_models/
              aws s3 cp s3://cvd-models-bucket-1619722215/saved_models/cvd_generator_20250930_095913.pth ./models/saved_models/
              
              # Build Docker images directly on EC2
              docker build -t cvd-backend:latest ./backend
              docker build -t cvd-frontend:latest ./mobile-app
              
              # Run CVD Backend
              docker run -d --name cvd-backend -p 8001:8001 -v /opt/cvd-app/models:/app/models cvd-backend:latest
              
              # Run CVD Frontend  
              docker run -d --name cvd-frontend -p 80:8080 cvd-frontend:latest
              EOF

  tags = {
    Name = "color_vision_def"
  }
}

output "public_ip" {
  value = aws_instance.docker_host.public_ip
}
