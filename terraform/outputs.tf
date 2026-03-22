# ------------------------------------------------------------------------------
# Networking
# ------------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# ------------------------------------------------------------------------------
# Load Balancer
# ------------------------------------------------------------------------------

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "app_url" {
  description = "Application URL (dashboard)"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

# ------------------------------------------------------------------------------
# CloudFront / SDK
# ------------------------------------------------------------------------------

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for SDK"
  value       = aws_cloudfront_distribution.sdk.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name for SDK"
  value       = aws_cloudfront_distribution.sdk.domain_name
}

output "sdk_url" {
  description = "SDK CDN URL"
  value       = "https://sdk.${var.domain_name}/sdk.js"
}

output "sdk_bucket_name" {
  description = "S3 bucket name for SDK assets"
  value       = aws_s3_bucket.sdk.id
}

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.identifier
}

# ------------------------------------------------------------------------------
# ElastiCache
# ------------------------------------------------------------------------------

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

# ------------------------------------------------------------------------------
# ECS
# ------------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_api_service_name" {
  description = "ECS API service name"
  value       = aws_ecs_service.api.name
}

output "ecs_dashboard_service_name" {
  description = "ECS Dashboard service name"
  value       = aws_ecs_service.dashboard.name
}

# ------------------------------------------------------------------------------
# ECR
# ------------------------------------------------------------------------------

output "ecr_api_repository_url" {
  description = "ECR repository URL for API image"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_dashboard_repository_url" {
  description = "ECR repository URL for Dashboard image"
  value       = aws_ecr_repository.dashboard.repository_url
}

# ------------------------------------------------------------------------------
# IAM
# ------------------------------------------------------------------------------

output "cicd_role_arn" {
  description = "IAM role ARN for CI/CD pipelines"
  value       = aws_iam_role.cicd.arn
}

# ------------------------------------------------------------------------------
# DNS
# ------------------------------------------------------------------------------

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  description = "Route53 nameservers (set these at your domain registrar)"
  value       = aws_route53_zone.main.name_servers
}
