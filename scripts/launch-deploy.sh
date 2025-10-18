#!/bin/bash
cd "$HOME/projects/claude-code-enhancements"
source .env
claude --mcp-config configs/mcp.deploy.json
