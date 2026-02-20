#!/bin/bash
# Stop the local MCP Server Chart + GPT-Vis-SSR rendering service
docker compose -f docker-compose.local.yaml down
echo "Services stopped."
