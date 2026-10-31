---
name: aws-cloud-terraform
description: Production-grade Infrastructure as Code (IaC) using Terraform for deploying scalable, secure, HIPAA-compliant healthcare applications on AWS. Covers VPC, ECS Fargate, Aurora PostgreSQL Serverless v2, ElastiCache Redis, S3 KMS, and CloudFront WAF.
origin: AWS Solution Architecture & Cloud DevOps Engineering
---

# AWS Cloud Infrastructure as Code (Terraform Protocol)

A production-grade infrastructure protocol for AI agents to provision, configure, and maintain HIPAA-compliant, highly scalable AWS cloud environments.

---

## When to Activate

Activate this skill whenever:
- Provisioning or modifying AWS cloud infrastructure using Terraform.
- Configuring secure VPC networks with Public and Private subnets.
- Setting up AWS ECS Fargate serverless container tasks and auto-scaling policies.
- Configuring Amazon Aurora PostgreSQL Serverless v2 with Read Replicas and Multi-AZ.
- Setting up Amazon ElastiCache Redis clusters for high-speed distributed locking.
- Configuring Amazon S3 with AWS KMS encryption for medical imaging (DICOM) and ECG waveforms.
- Writing AWS WAF rules and CloudFront distributions for DDoS mitigation and edge caching.

---

## 1. Directory Structure for Terraform (Modular Architecture)

Never dump all AWS resources into a single monolithic `main.tf`. Organize into reusable modules:

```
infra/terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf              # Module instantiation for Prod
│   │   ├── variables.tf
│   │   ├── terraform.tfvars     # Production configuration values
│   │   └── backend.tf           # S3 remote state + DynamoDB lock
│   └── staging/
│       ├── main.tf
│       └── terraform.tfvars
└── modules/
    ├── vpc/                     # Multi-AZ VPC, NAT Gateways, Subnets
    ├── security_groups/         # Ingress/Egress rules
    ├── ecs_fargate/             # ALB, Task definitions, Auto-scaling
    ├── aurora_postgres/         # Serverless v2, KMS encryption
    ├── elasticache_redis/       # Redis Cluster, Auth token
    ├── s3_medical_vault/        # S3 Bucket, KMS key, lifecycle rules
    └── waf_cloudfront/          # CloudFront CDN, WAF WebACL, Route 53
```

---

## 2. Remote State & Locking (`backend.tf`)

Always store Terraform state in a remote encrypted S3 bucket with state locking via DynamoDB to prevent concurrent modifications:

```hcl
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
  backend "s3" {
    bucket         = "cardio-hospital-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

---

## 3. Core AWS Infrastructure Modules

### 3.1. Network Security (VPC Module)
- **Public Subnets:** Only the Application Load Balancer (ALB) and NAT Gateways sit here.
- **Private Subnets (App Layer):** ECS Fargate tasks reside here with no public IP addresses. Outbound traffic goes through NAT Gateways.
- **Isolated Database Subnets (Data Layer):** Aurora PostgreSQL and ElastiCache Redis reside here with zero route to the internet.

```hcl
# modules/vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "cardio-production-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["ap-southeast-1a", "ap-southeast-1b"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false # High availability across 2 AZs
  enable_dns_hostnames = true
}
```

### 3.2. Database Module (Amazon Aurora PostgreSQL Serverless v2)
Aurora Serverless v2 dynamically scales compute units (ACUs) between 0.5 and 8.0 based on real-time load, drastically cutting costs during off-peak hours while scaling instantaneously during morning rush (7:00 AM - 9:00 AM).

```hcl
# modules/aurora_postgres/main.tf
resource "aws_rds_cluster" "cardio_db" {
  cluster_identifier      = "cardio-aurora-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "16.1"
  database_name           = "cardiology_prod"
  master_username         = "cardio_admin"
  manage_master_user_password = true # Stores password in AWS Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.db_kms.arn

  serverlessv2_scaling_configuration {
    max_capacity = 8.0 # Up to 16GB RAM for surge traffic
    min_capacity = 0.5 # Scales down to 1GB RAM at midnight
  }

  backup_retention_period = 30
  preferred_backup_window = "19:00-20:00" # 2:00 AM VN time
  deletion_protection     = true
}

# Primary Writer Instance
resource "aws_rds_cluster_instance" "writer" {
  cluster_identifier = aws_rds_cluster.cardio_db.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.cardio_db.engine
  engine_version     = aws_rds_cluster.cardio_db.engine_version
}

# Secondary Reader Instance (Read Replica for Analytics/Audit)
resource "aws_rds_cluster_instance" "reader" {
  cluster_identifier = aws_rds_cluster.cardio_db.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.cardio_db.engine
  engine_version     = aws_rds_cluster.cardio_db.engine_version
}
```

### 3.3. Compute Module (AWS ECS Fargate & Auto-Scaling)
```hcl
# modules/ecs_fargate/main.tf
resource "aws_ecs_service" "app_service" {
  name            = "cardio-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app_tg.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_controller {
    type = "ECS" # Rolling updates with zero downtime
  }
}

# Auto-Scaling Target (2 to 10 tasks)
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale on High CPU
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "cardio-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### 3.4. Edge Protection (AWS WAF & CloudFront)
Protect appointment slots from aggressive scrapers and bot attacks:
- **Rate Limit Rule:** Limit requests to `/api/v1/slots/*` to **20 requests per IP per 5 minutes**.
- **AWS Managed Rules:** Enable `AWSManagedRulesCommonRuleSet` (SQL Injection, Cross-Site Scripting, HTTP protocol violations).
