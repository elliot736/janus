# ------------------------------------------------------------------------------
# Route53 Hosted Zone
# ------------------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${local.name_prefix}-zone"
  }
}

# ------------------------------------------------------------------------------
# A Record — Root domain → ALB
# ------------------------------------------------------------------------------

resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ------------------------------------------------------------------------------
# A Record — api subdomain → ALB
# ------------------------------------------------------------------------------

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ------------------------------------------------------------------------------
# A Record — SDK subdomain → CloudFront
# ------------------------------------------------------------------------------

resource "aws_route53_record" "sdk" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "sdk.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.sdk.domain_name
    zone_id                = aws_cloudfront_distribution.sdk.hosted_zone_id
    evaluate_target_health = false
  }
}
