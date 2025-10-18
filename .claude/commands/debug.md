# Debugging Guidelines

## Common Issues

### High Token Usage
- Check which MCP servers are loaded: `/mcp`
- Verify correct config file used
- Look for large Memory files: `/memory`

### Script Execution Errors
- Check file permissions: `ls -la scripts/`
- Verify shebang: `head -1 scripts/[script].sh`
- Source environment: `source .env` before running

### Missing Files
- Container vs host filesystem issue
- Check absolute paths
- Verify with: `ls -la [path]`

## Diagnostic Commands
- `/context` - Check token usage breakdown
- `/mcp` - List loaded MCP servers
- `/memory` - Check memory file sizes
- `/agents` - List available sub-agents
