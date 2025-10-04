provider "aws" {
  region = "ap-south-1"  # change to your region
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

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io git
              systemctl start docker
              systemctl enable docker
              
              # Clone the repository
              cd /opt
              git clone https://github.com/GowthamDhanaraju/CVD-detection-and-correction.git cvd-app
              cd cvd-app
              
              # Build Docker images directly on EC2
              docker build -t cvd-backend:latest ./backend
              docker build -t cvd-frontend:latest ./mobile-app
              
              # Run CVD Backend
              docker run -d --name cvd-backend -p 8001:8001 cvd-backend:latest
              
              # Run CVD Frontend  
              docker run -d --name cvd-frontend -p 80:3000 cvd-frontend:latest
              EOF

  tags = {
    Name = "docker-ec2"
  }
}

output "public_ip" {
  value = aws_instance.docker_host.public_ip
}
