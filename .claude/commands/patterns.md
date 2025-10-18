# Coding Patterns & Standards

## R&D Framework (Reduce, Delegate, Modularize)
1. **Reduce**: Eliminate unnecessary token usage
2. **Delegate**: Split complex tasks to sub-agents
3. **Modularize**: Break monolithic context into loadable chunks

## File Organization
- Configs in dedicated directories
- Scripts prefixed with purpose (launch-, validate-, check-)
- Documentation co-located with implementation

## Token Optimization Principles
- Reference files, don't include full content
- Use diff-based updates, not full rewrites
- Load context on-demand via slash commands
- Validate savings with /context command

## Naming Conventions
- MCP configs: mcp.[purpose].json
- Launch scripts: launch-[config].sh
- Documentation: [MODULE]-[topic].md
