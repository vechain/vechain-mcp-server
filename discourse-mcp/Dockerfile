FROM node:18-alpine

# Install the Discourse MCP package globally
RUN npm install -g @discourse/mcp@latest

# Expose the default port
EXPOSE 3000

# Set environment variables (can be overridden at runtime)
ENV DISCOURSE_SITE=https://vechain.discourse.group
ENV PORT=3000

# Run the Discourse MCP server in HTTP transport mode
CMD ["sh", "-c", "discourse-mcp --transport http --site $DISCOURSE_SITE --port $PORT"]

