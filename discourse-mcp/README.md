# Discourse MCP Docker Image

Docker image for running the Discourse MCP server for VeChain forum integration.

## Quick Start

### Build and Run Locally

```bash
# Build the image
docker build -t discourse-mcp .

# Run the container
docker run -d -p 3000:3000 --name discourse-mcp discourse-mcp
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Verify it's running

```bash
curl http://localhost:3000/health
```

## Deploy to AWS

### Option 1: ECR + ECS/Fargate

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name discourse-mcp

# Tag and push
docker tag discourse-mcp:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/discourse-mcp:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/discourse-mcp:latest
```

Then create an ECS service or Fargate task using the pushed image.

### Option 2: EC2 with Docker

```bash
# On your EC2 instance
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Copy Dockerfile to EC2 and build
docker build -t discourse-mcp .
docker run -d -p 3000:3000 --restart unless-stopped --name discourse-mcp discourse-mcp
```

### Option 3: AWS App Runner

1. Push image to ECR (see above)
2. Create App Runner service pointing to your ECR image
3. Set port to 3000

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCOURSE_SITE` | `https://vechain.discourse.group` | The Discourse forum URL |
| `PORT` | `3000` | Port to run the server on |

## Connect VeChain MCP Server

Set the `DISCOURSE_MCP_URL` environment variable when running the VeChain MCP server:

```bash
DISCOURSE_MCP_URL=http://your-aws-host:3000/mcp npm run dev
```

Or for production, update the URL in your deployment configuration.

