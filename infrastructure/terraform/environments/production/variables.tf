variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS Primary Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "availability_zones" {
  description = "Availability Zones for Multi-AZ redundancy"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "vpc_cidr" {
  description = "VPC CIDR Block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "app_image" {
  description = "ECR Docker image URI for backend container"
  type        = string
  default     = "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/fb-shop-backend:latest"
}

variable "min_instances" {
  description = "Minimum active ECS Fargate tasks"
  type        = number
  default     = 2
}

variable "max_instances" {
  description = "Maximum active ECS Fargate tasks under load surges"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache Redis node instance class"
  type        = string
  default     = "cache.t4g.medium"
}
