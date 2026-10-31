/**
 * =============================================================================
 * TERRAFORM MODULE: MULTI-AZ HIGH-AVAILABILITY VPC
 * Architecture: 2 Availability Zones (ap-southeast-1a, ap-southeast-1b)
 * Tiers: Public (ALB/NAT), Private (ECS Tasks), Isolated (DB/Redis)
 * =============================================================================
 */

variable "environment" { type = string }
variable "cidr_block" { type = string; default = "10.0.0.0/16" }
variable "azs" { type = list(string); default = ["ap-southeast-1a", "ap-southeast-1b"] }

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "fb-shop-${var.environment}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway for Public Traffic
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "fb-shop-${var.environment}-igw" }
}

# Public Subnets (For ALB & NAT Gateways)
resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "fb-shop-${var.environment}-public-${var.azs[count.index]}"
    Tier = "Public"
  }
}

# Private App Subnets (For ECS Fargate Tasks - No Public IP)
resource "aws_subnet" "private_app" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 10)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "fb-shop-${var.environment}-private-app-${var.azs[count.index]}"
    Tier = "PrivateApp"
  }
}

# Isolated Database Subnets (For ElastiCache Redis & Private Database Links)
resource "aws_subnet" "isolated_db" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 20)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "fb-shop-${var.environment}-isolated-db-${var.azs[count.index]}"
    Tier = "IsolatedDB"
  }
}

# Elastic IPs & Multi-AZ NAT Gateways (High-Availability Outbound Access)
resource "aws_eip" "nat" {
  count  = length(var.azs)
  domain = "vpc"
  tags   = { Name = "fb-shop-${var.environment}-eip-${count.index + 1}" }
}

resource "aws_nat_gateway" "nat" {
  count         = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "fb-shop-${var.environment}-nat-${var.azs[count.index]}" }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "fb-shop-${var.environment}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(var.azs)
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }
  tags = { Name = "fb-shop-${var.environment}-private-rt-${var.azs[count.index]}" }
}

resource "aws_route_table_association" "private" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_app_subnet_ids" { value = aws_subnet.private_app[*].id }
output "isolated_db_subnet_ids" { value = aws_subnet.isolated_db[*].id }
