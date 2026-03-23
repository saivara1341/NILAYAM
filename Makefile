# =====================================================================
# Nilayam Developer Experience (DX) Makefile
# =====================================================================

.PHONY: dev build test lint format up down clean deploy-staging logs db-migrate

# Default target
all: dev

# --- Local Development ---
dev: ## Start dev environment with hot-reloading
	docker-compose up -d
	@echo "Opening Nilayam on localhost:5173..."
	@powershell -Command "Start-Process http://localhost:5173"
	@echo "Nginx Proxy running at: http://localhost:80"

down: ## Stop all dev environment containers
	docker-compose down

logs: ## Tail all container logs
	docker-compose logs -f

clean: ## Remove containers, networks, volumes, and images
	docker-compose down -v --rmi all
	rm -rf dist/ backend-java/target/ .run/ node_modules/

# --- CI/CD Emulation ---
build: ## Build production Docker images
	docker build --target builder -t nilayam/frontend:local .
	docker build -f Dockerfile.backend --target production -t nilayam/backend:local .

test: ## Run Playwright E2E tests locally
	npx playwright test

lint: ## Run ESLint and Prettier
	npx eslint src --ext .ts,.tsx
	npx prettier --check "src/**/*.{ts,tsx,css,md}"

# --- Database & Scripts ---
db-migrate: ## Run local db migrations
	./scripts/db-migrate.sh up

help: ## Show this help menu
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
