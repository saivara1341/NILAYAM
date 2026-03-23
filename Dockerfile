# ============================================================
# Nilayam Frontend — Multi-Stage Production Dockerfile
# Stage 1: Build React app with Vite
# Stage 2: Serve with Nginx (minimal Alpine image)
# ============================================================

# ── Stage 1: Dependency Install ─────────────────────────────
FROM node:20-alpine AS deps
LABEL maintainer="devops@nilayam.in"

WORKDIR /app

# Copy manifest files first (layer-cache optimized)
COPY package.json package-lock.json ./

# Install ALL deps (including dev for build step)
RUN npm ci --frozen-lockfile

# ── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Carry over node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Build arguments injected at build time (CI will supply these)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_RAZORPAY_KEY_ID
ARG GEMINI_API_KEY

# Expose as env vars for Vite build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV GEMINI_API_KEY=$GEMINI_API_KEY

RUN npm run build

# ── Stage 3: Serve (production image) ───────────────────────
FROM nginx:1.27-alpine AS production

# Security: run as non-root
RUN addgroup -S nilayam && adduser -S nilayam -G nilayam

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Fix permissions for non-root
RUN chown -R nilayam:nilayam /usr/share/nginx/html \
    && chown -R nilayam:nilayam /var/cache/nginx \
    && chown -R nilayam:nilayam /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nilayam:nilayam /var/run/nginx.pid

# Expose HTTP port (TLS is terminated at the load balancer/proxy level)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

USER nilayam

CMD ["nginx", "-g", "daemon off;"]
