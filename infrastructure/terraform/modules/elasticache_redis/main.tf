/**
 * =============================================================================
 * TERRAFORM MODULE: MULTI-AZ AMAZON ELASTICACHE REDIS
 * Architecture: Primary + Replica with automatic failover across 2 AZs.
 * Used for Distributed Locking, Session Stores, and Cache-Aside.
 * =============================================================================
 */

variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "isolated_subnet_ids" { type = list(string) }
variable "node_type" { type = string; default = "cache.t4g.medium" }

resource "aws_security_group" "redis" {
  name        = "fb-shop-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "fb-shop-${var.environment}-redis-subnet-group"
  subnet_ids = var.isolated_subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "fb-shop-${var.environment}-redis"
  description                = "High-Availability Redis Cluster for F&B Shop"
  node_type                  = var.node_type
  num_cache_clusters         = 2
  parameter_group_name       = "default.redis7"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name        = "fb-shop-${var.environment}-redis"
    Environment = var.environment
  }
}

output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
