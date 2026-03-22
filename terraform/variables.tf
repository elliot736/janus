variable "project_name" {
  description = "Name of the project, used as prefix for all resources"
  type        = string
  default     = "janus"
}

variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Root domain name (e.g. janus.example.com)"
  type        = string
}

# ------------------------------------------------------------------------------
# VPC
# ------------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use (must be at least 2)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ------------------------------------------------------------------------------
# RDS
# ------------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "janus"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "janus_admin"
  sensitive   = true
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ for RDS (recommended for production)"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7
}

# ------------------------------------------------------------------------------
# ElastiCache
# ------------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes (1 for staging, more for production)"
  type        = number
  default     = 1
}

# ------------------------------------------------------------------------------
# ECS
# ------------------------------------------------------------------------------

variable "api_desired_count" {
  description = "Desired number of API ECS tasks"
  type        = number
  default     = 1
}

variable "dashboard_desired_count" {
  description = "Desired number of Dashboard ECS tasks"
  type        = number
  default     = 1
}

variable "api_cpu" {
  description = "CPU units for the API task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory (MiB) for the API task"
  type        = number
  default     = 1024
}

variable "dashboard_cpu" {
  description = "CPU units for the Dashboard task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "dashboard_memory" {
  description = "Memory (MiB) for the Dashboard task"
  type        = number
  default     = 512
}

variable "api_max_count" {
  description = "Maximum number of API ECS tasks for auto-scaling"
  type        = number
  default     = 4
}

variable "dashboard_max_count" {
  description = "Maximum number of Dashboard ECS tasks for auto-scaling"
  type        = number
  default     = 4
}

variable "api_min_count" {
  description = "Minimum number of API ECS tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "dashboard_min_count" {
  description = "Minimum number of Dashboard ECS tasks for auto-scaling"
  type        = number
  default     = 1
}

# ------------------------------------------------------------------------------
# Tags
# ------------------------------------------------------------------------------

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
