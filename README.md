# Clown Computing — AWS Architecture

## Live Application
https://member5.d3uhumqw1kiwth.amplifyapp.com/

## Architecture Diagram
[Insert exported diagram image or Lucidchart link here]

## High Availability Setup
- Multi-AZ deployment across eu-north-1a and eu-north-1b
- Auto Scaling Group (min 2, max 4) across two private subnets
- Application Load Balancer distributing traffic across both AZs
- NAT Gateway for outbound internet access from private subnets
- CloudFront CDN in front of ALB for global distribution