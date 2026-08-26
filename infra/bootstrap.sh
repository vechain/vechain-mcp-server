#!/usr/bin/env bash
#
# One-time bootstrap for the MCP server platform + service stacks in a
# target environment. Run once per environment (dev / prod) on the first
# rollout; for subsequent shape changes use `aws cloudformation deploy`
# directly.
#
# Usage:
#   AWS_PROFILE=<profile> infra/bootstrap.sh <env>
#     <env>   dev | prod
#
# Prereqs:
#   - aws CLI configured for the target account (AWS_PROFILE).
#   - The shared platform SSM keys (/vpc/*, /ecs/cluster-arn) already exist
#     in that account (created by the shared infrastructure stack).
#   - The ECR repository `mcp-server` exists in the target account with at
#     least one pushed image; the first deploy of the service stack pins
#     `mcp-server:latest`.
#
# What it does:
#   1. Generates an API key, stores it as SSM SecureString /mcp/server/api-key
#      (skips if the parameter already exists).
#   2. Deploys the platform stack (infra/platform.yaml) — Route 53 hosted
#      zone, ACM cert, ALB, target group, WAF, IAM roles, log group, SSM
#      String parameters consumed by the service stack.
#   3. Prints the NS records of the hosted zone. PAUSE: the operator must
#      add these NS records to the parent DNS zone (the one that owns the
#      apex domain) before the ACM cert can validate. The script waits
#      for the cert to reach ISSUED state before continuing.
#   4. Deploys the service stack (infra/mcp-service.yaml) with the current
#      :latest image from the local ECR repository.
#   5. Prints the public FQDN + a smoke-test curl.
#
# Idempotent: re-running on an already-deployed environment performs a
# no-op CFN update plus a no-op SSM check.

set -euo pipefail

if [ "$#" -ne 1 ] || { [ "$1" != "dev" ] && [ "$1" != "prod" ]; }; then
  echo "Usage: AWS_PROFILE=<profile> $0 dev|prod" >&2
  exit 2
fi
ENV_NAME="$1"
PLATFORM_STACK="mcp-platform-${ENV_NAME}"
SERVICE_STACK="mcp-service-${ENV_NAME}"
API_KEY_NAME="/mcp/server/api-key"
ECR_REPO="mcp-server"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1" >&2; exit 2; }
}
require aws
require jq

REGION="$(aws configure get region)"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "==> Account=${ACCOUNT}  Region=${REGION}  Env=${ENV_NAME}"

# ---------------------------------------------------------------------------
# Step 1: API key SecureString (CFN cannot create SecureString parameters)
# ---------------------------------------------------------------------------
if aws ssm get-parameter --name "$API_KEY_NAME" --with-decryption >/dev/null 2>&1; then
  echo "==> API key already present in SSM (${API_KEY_NAME}); skipping generation"
else
  echo "==> Generating API key + storing as SSM SecureString ${API_KEY_NAME}"
  NEW_KEY="$(openssl rand -hex 32)"
  aws ssm put-parameter \
    --name "$API_KEY_NAME" \
    --type SecureString \
    --value "$NEW_KEY" \
    --tier Standard \
    --description "Bearer API key enforced by the MCP server" \
    >/dev/null
fi

# ---------------------------------------------------------------------------
# Step 2: Platform stack
# ---------------------------------------------------------------------------
echo "==> Deploying platform stack ${PLATFORM_STACK}"
PARAMS_FILE="infra/platform-params.${ENV_NAME}.json"
# shellcheck disable=SC2046
aws cloudformation deploy \
  --stack-name "$PLATFORM_STACK" \
  --template-file infra/platform.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides $(jq -r '.[] | "\(.ParameterKey)=\(.ParameterValue)"' "$PARAMS_FILE")

# ---------------------------------------------------------------------------
# Step 3: NS records + wait for cert
# ---------------------------------------------------------------------------
NS_RECORDS=$(aws cloudformation describe-stacks --stack-name "$PLATFORM_STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`HostedZoneNameServers`].OutputValue' \
  --output text)
DOMAIN=$(jq -r '.[] | select(.ParameterKey=="DomainName") | .ParameterValue' "$PARAMS_FILE")
echo ""
echo "==> Subdomain hosted zone created."
echo "    Add an NS record set for '${DOMAIN}' to the parent zone with these name servers:"
echo "$NS_RECORDS" | tr ',' '\n' | sed 's/^/      /'
echo ""
echo "==> Waiting for ACM cert validation (depends on NS delegation being live)..."
CERT_ARN=$(aws cloudformation list-stack-resources --stack-name "$PLATFORM_STACK" \
  --query "StackResourceSummaries[?LogicalResourceId=='Certificate'].PhysicalResourceId" --output text)
aws acm wait certificate-validated --certificate-arn "$CERT_ARN"
echo "==> Certificate ISSUED."

# ---------------------------------------------------------------------------
# Step 4: Service stack — image pinned to ECR :latest in this account.
# After bootstrap, the release pipeline overrides ContainerImage per tag.
# ---------------------------------------------------------------------------
INITIAL_IMAGE="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"
DESIRED_COUNT=$(jq -r '.[] | select(.ParameterKey=="DesiredCount") | .ParameterValue' "infra/params.${ENV_NAME}.json")
echo "==> Deploying service stack ${SERVICE_STACK} with image ${INITIAL_IMAGE}"
aws cloudformation deploy \
  --stack-name "$SERVICE_STACK" \
  --template-file infra/mcp-service.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    EnvironmentName="$ENV_NAME" \
    ContainerImage="$INITIAL_IMAGE" \
    DesiredCount="$DESIRED_COUNT"

# ---------------------------------------------------------------------------
# Step 5: Smoke commands
# ---------------------------------------------------------------------------
FQDN_URL=$(aws cloudformation describe-stacks --stack-name "$PLATFORM_STACK" \
  --query 'Stacks[0].Outputs[?OutputKey==`Fqdn`].OutputValue' --output text)
echo ""
echo "==> Done."
echo "    Public FQDN: ${FQDN_URL}"
echo "    Smoke test:"
echo "      curl -fsS ${FQDN_URL}/health"
echo "      curl -fsS ${FQDN_URL}/ready"
echo "      KEY=\$(aws ssm get-parameter --name ${API_KEY_NAME} --with-decryption --query Parameter.Value --output text)"
echo "      curl -sS -X POST ${FQDN_URL}/mcp \\"
echo "        -H \"Authorization: Bearer \$KEY\" \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -H 'Accept: application/json, text/event-stream' \\"
echo "        -d '{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\"}'"
