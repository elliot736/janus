# ==============================================================================
# Janus — Staging Environment
# ==============================================================================
# Usage: terraform plan -var-file=environments/staging.tfvars
# ==============================================================================

project_name = "janus"
environment  = "staging"
region       = "us-east-1"
domain_name  = "staging.janus.example.com"

# VPC
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# RDS — small instance, no Multi-AZ
db_instance_class          = "db.t4g.micro"
db_name                    = "janus"
db_username                = "janus_admin"
enable_multi_az            = false
db_backup_retention_period = 3

# ElastiCache — single node
redis_node_type       = "cache.t4g.micro"
redis_num_cache_nodes = 1

# ECS — minimal resources
api_desired_count = 1
api_min_count     = 1
api_max_count     = 2
api_cpu           = 256
api_memory        = 512

dashboard_desired_count = 1
dashboard_min_count     = 1
dashboard_max_count     = 2
dashboard_cpu           = 256
dashboard_memory        = 512

tags = {
  Team       = "platform"
  CostCenter = "staging"
}
