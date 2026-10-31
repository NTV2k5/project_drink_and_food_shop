/**
 * =============================================================================
 * TERRAFORM MODULE: AWS WAF & CLOUDFRONT CDN
 * Mitigates DDoS attacks, enforces rate limits, and edge-caches catalog assets.
 * =============================================================================
 */

variable "environment" { type = string }
variable "alb_dns_name" { type = string }

# AWS WAF v2 WebACL
resource "aws_wafv2_web_acl" "main" {
  name        = "fb-shop-${var.environment}-waf"
  description = "WAF protection rules for F&B Shop"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "fbShopWAFMetrics"
    sampled_requests_enabled   = true
  }

  # Rate limiting rule: Max 2000 requests per 5 minutes per IP
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Common Rule Set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  web_acl_id      = aws_wafv2_web_acl.main.arn
  price_class     = "PriceClass_All"

  # Default Cache Behavior (Pass-Through)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Optimized Caching Behavior for Static Assets & Images
  ordered_cache_behavior {
    path_pattern     = "/uploads/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 2592000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "fb-shop-${var.environment}-cdn"
    Environment = var.environment
  }
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
