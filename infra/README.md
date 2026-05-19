# `infra/` — CloudFormation for the MCP server

Two-stack split:

- `platform.yaml` — one-time per-environment bootstrap. Creates the
  Route 53 public hosted zone for the subdomain, the ACM certificate
  (DNS-validated), the internet-facing ALB + HTTPS listener, the WAFv2
  web ACL, the IAM task + execution roles, the CloudWatch log group,
  the security groups, and the SSM `String` parameters consumed by the
  service stack.
- `mcp-service.yaml` — the ECS service + task definition. Reads every
  account-specific value from SSM at deploy time (see the
  `{{resolve:ssm:...}}` references in `params.<env>.json`), so the
  template carries no account identifiers.

The split keeps shape changes (CPU/memory, env var, listener rules)
out of the release path: only `mcp-service.yaml` ever needs to be
touched on a release, and only its `ContainerImage` parameter is
overridden per deploy.

## One-time bootstrap

```bash
AWS_PROFILE=<profile> infra/bootstrap.sh <dev|prod>
```

What it does, in order:

1. Generates a 32-byte API key and stores it as
   `SSM SecureString /mcp/server/api-key` (skips if already present —
   CloudFormation cannot create SecureString parameters).
2. Deploys `platform.yaml` for the target environment.
3. Prints the NS records of the freshly-created subdomain hosted zone.
   **Operator action**: add an NS record set in the parent zone with
   these values so the subdomain delegation is live; the script blocks
   on `aws acm wait certificate-validated` until that happens.
4. Deploys `mcp-service.yaml` with the current `:latest` image from
   the local ECR repository.
5. Prints the public FQDN and the smoke-test curl commands.

After this bootstrap, normal releases run via the GitHub Actions
workflow (`.github/workflows/publish-release.yml`) on tag push.

## Shape changes after bootstrap

```bash
# Platform changes (rare — listener, WAF rules, etc.)
aws cloudformation deploy \
  --stack-name mcp-platform-<env> \
  --template-file infra/platform.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides file://infra/platform-params.<env>.json

# Service shape changes (env var, CPU/memory) — note: this is NOT how
# new images get rolled out; that is handled by the release pipeline.
aws cloudformation deploy \
  --stack-name mcp-service-<env> \
  --template-file infra/mcp-service.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides file://infra/params.<env>.json \
    ContainerImage=<registry>/mcp-server:<tag>
```

## Prerequisites (per account)

Both stacks expect the shared platform stack (VPC + subnets + ECS
cluster) to publish the following SSM keys:

```
/vpc/id                  # String, VPC ID
/vpc/cidr                # String, VPC CIDR
/vpc/private-subnet-ids  # StringList, private subnets for Fargate tasks
/vpc/public-subnet-ids   # StringList, public subnets for the ALB
/ecs/cluster-arn         # String, ECS cluster ARN
/mcp/server/port         # String, container listening port (default 4000)
```

The platform stack then creates and owns the remaining `/mcp/server/*`
keys consumed by the service stack:

```
/mcp/server/cpu
/mcp/server/memory
/mcp/server/task-role-arn
/mcp/server/execution-role-arn
/mcp/server/cluster-arn
/mcp/server/subnet-ids
/mcp/server/security-group-ids
/mcp/server/target-group-arn
/mcp/server/log-group-name
/mcp/server/desired-count
```

`/mcp/server/api-key` is a SecureString created by `bootstrap.sh`.

## `MCP_API_KEY` (bearer auth)

The MCP server refuses every request to `/mcp`, `/tools` and
`/tools/call` unless the client sends `Authorization: Bearer <key>`
matching `MCP_API_KEY` (constant-time comparison). The container reads
the key from the env var at startup; the value is injected by ECS from
the SSM SecureString at `ApiKeySsmName` (default `/mcp/server/api-key`).

The platform stack grants the execution role:

- `ssm:GetParameters` on
  `arn:aws:ssm:<region>:<account>:parameter/mcp/server/api-key`
- `kms:Decrypt` on `alias/aws/ssm`

`/health` and `/ready` remain public so the ALB target group health
check works without a credential.

Rotation:

```bash
aws ssm put-parameter --name /mcp/server/api-key \
  --type SecureString --overwrite \
  --value "$(openssl rand -hex 32)"
aws ecs update-service --cluster <cluster> \
  --service mcp-server-<env> --force-new-deployment
```

Clients that have the old key keep working until the rolling deploy
replaces all running tasks; update their copy of the key in the same
window.
