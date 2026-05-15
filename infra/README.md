# `infra/` — CloudFormation for the MCP ECS service

This directory contains the CloudFormation template that defines the ECS
Fargate service for the MCP server, plus per-environment parameter
files.

## What's defined here

`mcp-service.yaml` creates **only** the resources that belong to the MCP
service itself:

- `AWS::ECS::TaskDefinition` (App container)
- `AWS::ECS::Service`

Everything the service depends on — VPC, subnets, security groups, IAM
roles, the ECS cluster, the ALB and its target group, and the log group
— is owned by a separate platform stack and supplied to this stack as
parameters. The release pipeline does not see any account-specific
identifier; values come from SSM Parameter Store on the target account
(see the `{{resolve:ssm:...}}` references in `params.<env>.json`).

## How it is deployed

The stack is intentionally **not** redeployed on every release. The
release pipeline (`.github/workflows/deploy.yml`) only updates the
running image — either by pushing a new image to a mutable tag the task
definition references (Path A, current default) or by registering a new
task definition revision (Path B, optional swap).

For shape changes (new env var, port, CPU/memory, etc.) deploy the
stack manually:

```bash
aws cloudformation deploy \
  --stack-name mcp-server-<env> \
  --template-file infra/mcp-service.yaml \
  --parameter-overrides file://infra/params.<env>.json \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset
```

Replace `ContainerImage` in the parameter file with the actual image
URI before the first deploy.

## SSM keys consumed

The following SSM keys must exist in each target account before the
stack is deployed for the first time:

```
/mcp/server/port
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

These are populated by whoever owns the platform stack.
