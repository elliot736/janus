# ------------------------------------------------------------------------------
# CloudFront Origin Access Control
# ------------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "sdk" {
  name                              = "${local.name_prefix}-sdk-oac"
  description                       = "OAC for SDK S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ------------------------------------------------------------------------------
# CloudFront Distribution — SDK
# ------------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "sdk" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} SDK CDN"
  default_root_object = "sdk.js"
  price_class         = "PriceClass_100"
  aliases             = ["sdk.${var.domain_name}"]

  origin {
    domain_name              = aws_s3_bucket.sdk.bucket_regional_domain_name
    origin_id                = "s3-sdk"
    origin_access_control_id = aws_cloudfront_origin_access_control.sdk.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-sdk"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000

    response_headers_policy_id = aws_cloudfront_response_headers_policy.sdk.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${local.name_prefix}-sdk-cdn"
  }
}

# ------------------------------------------------------------------------------
# CloudFront Response Headers Policy — CORS for SDK
# ------------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "sdk" {
  name    = "${local.name_prefix}-sdk-cors"
  comment = "CORS headers for SDK static assets"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["*"]
    }

    access_control_max_age_sec = 86400
    origin_override            = true
  }

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=86400, s-maxage=604800"
      override = false
    }
  }
}
