# ------------------------------------------------------------------------------
# Database Password (auto-generated)
# ------------------------------------------------------------------------------

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name_prefix}-db-password"
  description             = "RDS PostgreSQL master password"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# ------------------------------------------------------------------------------
# DATABASE_URL (constructed from RDS endpoint)
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}-database-url"
  description             = "PostgreSQL connection string for the API"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-database-url"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"
}

# ------------------------------------------------------------------------------
# REDIS_URL (constructed from ElastiCache endpoint)
# ------------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${local.name_prefix}-redis-url"
  description             = "Redis connection string for the API"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-redis-url"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}"
}

# ------------------------------------------------------------------------------
# Application Secrets (auto-generated)
# ------------------------------------------------------------------------------

resource "random_password" "hmac_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "hmac_secret" {
  name                    = "${local.name_prefix}-hmac-secret"
  description             = "HMAC signing secret"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-hmac-secret"
  }
}

resource "aws_secretsmanager_secret_version" "hmac_secret" {
  secret_id     = aws_secretsmanager_secret.hmac_secret.id
  secret_string = random_password.hmac_secret.result
}

resource "random_password" "token_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "token_secret" {
  name                    = "${local.name_prefix}-token-secret"
  description             = "JWT token signing secret"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-token-secret"
  }
}

resource "aws_secretsmanager_secret_version" "token_secret" {
  secret_id     = aws_secretsmanager_secret.token_secret.id
  secret_string = random_password.token_secret.result
}

resource "random_password" "cookie_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "cookie_secret" {
  name                    = "${local.name_prefix}-cookie-secret"
  description             = "Cookie encryption secret"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-cookie-secret"
  }
}

resource "aws_secretsmanager_secret_version" "cookie_secret" {
  secret_id     = aws_secretsmanager_secret.cookie_secret.id
  secret_string = random_password.cookie_secret.result
}

resource "random_password" "better_auth_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "better_auth_secret" {
  name                    = "${local.name_prefix}-better-auth-secret"
  description             = "BetterAuth framework secret"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-better-auth-secret"
  }
}

resource "aws_secretsmanager_secret_version" "better_auth_secret" {
  secret_id     = aws_secretsmanager_secret.better_auth_secret.id
  secret_string = random_password.better_auth_secret.result
}
