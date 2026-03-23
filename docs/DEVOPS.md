# Nilayam Property Management - DevOps Runbook

This runbook serves as the source of truth for the platform's infrastructure, CI/CD, and operational procedures.

## Architecture 🏛️

- **Frontend**: React + Vite (Served via Nginx Alpine in Production)
- **Backend**: Spring Boot + Java 22 (Eclipse Temurin JRE)
- **Database**: Supabase (PostgreSQL) + Auth
- **Proxy**: Nginx (Handles TLS termination, routing, rate limiting, gzip)
- **Monitoring**: Prometheus + Grafana + Loki (Log aggregation)

## Daily Developer Operations 👨‍💻

The entire dev workflow is wrapped in a `Makefile`. Run `make help` to see all commands.

### Local Development
1. Copy `.env.example` to `.env.local` and add missing mock keys
2. Run `make dev`. This starts:
   - Frontend Vite Server (with hot reloading via volumes) at `http://localhost:5173`
   - Spring Boot Backend at `http://localhost:8080`
   - Nginx routing proxy at `http://localhost:80`

### Testing CI Locally
- `make build` - Verifies multi-stage Dockerfiles compile successfully
- `make test` - Runs Playwright E2E tests
- `make lint` - Runs ESLint and Prettier

## Secrets Management 🔑

We do **not** commit `.env` files. Secrets are managed securely:
- **Local**: Use `.env.local`
- **CI/CD**: GitHub Actions Secrets `Settings -> Secrets -> Actions`
- **Production**: Cloud Secret Manager / Docker Swarm Secrets ingested at runtime

Never commit Razorpay or Supabase **Service Role** keys. Use Anon keys for frontend variables.

## Database Migrations 🗄️

SQL Migrations are stored in `supabase/migrations/`. 

- **To run migrations manually locally:** `./scripts/db-migrate.sh up`
- **To seed data:** `./scripts/db-seed.sh`
- **To rollback a bad migration:** `./scripts/db-rollback.sh <version_name>`

*Note: In Staging/Prod, GitHub Actions handles migrations automatically.*

## Monitoring & Alerting 🚨

Grafana runs under the monitoring stack.
- **Access**: `http://localhost:3000` (Locally)
- **Dashboards**: Pre-configured dashboard available at `monitoring/grafana/dashboards/nilayam.json`
- **Alerts**: Prometheus evaluates rules in `monitoring/rules/alerts.yml` and routes via Alertmanager to Slack `#ops-alerts`.

## Incident Response 🚒

**Scenario: API is down (502 Bad Gateway)**
1. Check logs: `docker logs nilayam-backend`
2. If the container is stuck, restart: `docker restart nilayam-backend`
3. If bad deployment: Run `./scripts/rollback.sh` immediately to revert to previous image tag.

**Scenario: Out of memory on host**
1. Check metrics in Grafana based on Node Exporter.
2. Verify Java respects container limits (Ensure `JAVA_OPTS` contains `-XX:+UseContainerSupport`).
