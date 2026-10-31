/**
 * =============================================================================
 * PRODUCTION ENVIRONMENT ROOT TERRAFORM CONFIGURATION
 * Deploys full scalable architecture: VPC, ECS Fargate, Redis Multi-AZ, WAF & CloudFront.
 * =============================================================================
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Network Layer (Multi-AZ VPC)
module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
  cidr_block  = var.vpc_cidr
  azs         = var.availability_zones
}

# 2. Redis Caching & Queue Layer
module "redis" {
  source              = "../../modules/elasticache_redis"
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  isolated_subnet_ids = module.vpc.isolated_db_subnet_ids
  node_type           = var.redis_node_type
}

# 3. Application ECS Fargate Layer
module "ecs" {
  source             = "../../modules/ecs_fargate"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_app_subnet_ids
  app_image          = var.app_image
  min_capacity       = var.min_instances
  max_capacity       = var.max_instances
}

# 4. Edge CDN & WAF DDoS Protection Layer
module "edge" {
  source       = "../../modules/waf_cloudfront"
  environment  = var.environment
  alb_dns_name = module.ecs.alb_dns_name
}

output "application_load_balancer_dns" {
  value = module.ecs.alb_dns_name
}

output "cloudfront_cdn_url" {
  value = "https://${module.edge.cloudfront_domain_name}"
}

output "redis_endpoint" {
  value = module.redis.redis_primary_endpoint
}
