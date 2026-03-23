#!/bin/bash
# ==============================================================================
# Nilayam Healthcheck Script
# Usage: ./healthcheck.sh
# ==============================================================================

echo "Running health checks..."

# Check Frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/)
if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 301 ]; then
    echo "❌ Frontend healthcheck failed! Status: $HTTP_CODE"
    exit 1
fi
echo "✅ Frontend is healthy (Status: $HTTP_CODE)"

# Check Backend API
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health)
if [ "$API_CODE" -ne 200 ]; then
    echo "❌ Backend API healthcheck failed! Status: $API_CODE"
    exit 1
fi
echo "✅ Backend API is healthy"

echo "All services operational."
exit 0
