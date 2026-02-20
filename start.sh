#!/bin/bash
# Start the local MCP Server Chart + GPT-Vis-SSR rendering service
docker compose -f docker-compose.local.yaml up --build -d
echo ""
echo "Services started:"
echo "  MCP Server Chart : http://localhost:1122"
echo "  GPT-Vis-SSR      : http://localhost:3200"
