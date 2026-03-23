# Nilayam Deployment Guide

This document outlines how code moves from a developer's machine to Production.

## Overview of the Pipeline

We utilize GitHub Actions for Continuous Integration (CI) and Continuous Deployment (CD). 
The flow relies on GitOps principles: commits to specific branches trigger actions.

### 1. The Pull Request (CI)
When a developer opens a Pull Request against `main`, the `.github/workflows/ci.yml` pipeline runs:
- **Linting** (`eslint`, `tsc --noEmit`)
- **E2E Testing** (`playwright test`)
- **Docker Validation** (Ensures images can build successfully)

*A PR cannot be merged unless this pipeline passes.*

### 2. Merging to Main (Staging CD)
When a PR is merged to `main`, `.github/workflows/deploy-staging.yml` triggers:
- Builds Docker images for `frontend` and `backend`.
- Tags them with `staging-<git-sha>`.
- Pushes to the GitHub Container Registry (`ghcr.io`).
- SSHs into the Staging server.
- Pulls new images, applies DB migrations, and restarts containers via `docker-compose`.

### 3. Promoting to Production 🚀
Production deployments are manually triggered for safety.

1. Go to **Actions** in GitHub.
2. Select the **Deploy to Production** workflow.
3. Click **Run workflow**.
4. Input the `version` (e.g. `v1.2.0`) and the `staging-sha` you want to promote.
5. GitHub will require an administrative approval (Environment Protection Rule).
6. Once approved, it:
   - Tags the staging images as production-ready.
   - Pushes to registry.
   - Triggers the `./scripts/deploy.sh` script on the target Production box.

## Manual Playbooks

### Running a Zero-Downtime Deployment Manually
If GitHub Actions is down, you can deploy manually from the target server:
```bash
cd /opt/nilayam/prod
export IMAGE_TAG=v1.2.0
./scripts/deploy.sh $IMAGE_TAG
```

### Instant Rollback
Wait, the new version broke everything?!
```bash
cd /opt/nilayam/prod
./scripts/rollback.sh v1.1.9
```
*(This instantly points compose back to the previous stable image tag and restarts).*
