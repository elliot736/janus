# ==============================================================================
# Janus — Production Environment
# ==============================================================================
# Usage: terraform plan -var-file=environments/production.tfvars
# ==============================================================================

project_name = "janus"
environment  = "production"
region       = "us-east-1"
domain_name  = "janus.example.com"

# VPC
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# RDS — larger instance, Multi-AZ enabled
db_instance_class          = "db.t4g.small"
db_name                    = "janus"
db_username                = "janus_admin"
enable_multi_az            = true
db_backup_retention_period = 14

# ElastiCache — single node (scale up node type for production)
redis_node_type       = "cache.t4g.small"
redis_num_cache_nodes = 1

# ECS — production resources with higher scaling limits
api_desired_count = 2
api_min_count     = 2
api_max_count     = 4
api_cpu           = 512
api_memory        = 1024

dashboard_desired_count = 2
dashboard_min_count     = 2
dashboard_max_count     = 4
dashboard_cpu           = 256
dashboard_memory        = 512

tags = {
  Team       = "platform"
  CostCenter = "production"
}
