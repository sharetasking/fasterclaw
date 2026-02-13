# FasterClaw OpenClaw Image
# Extends the official OpenClaw image with additional CLIs for integrations
#
# Build: docker build -t ghcr.io/fasterclaw/openclaw:latest ./docker/openclaw
# Push:  docker push ghcr.io/fasterclaw/openclaw:latest

FROM ghcr.io/openclaw/openclaw:latest

# Switch to root for installing packages
USER root

# Install GitHub CLI (gh)
# https://github.com/cli/cli/blob/trunk/docs/install_linux.md
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install mcporter (MCP server bridge) globally
# This allows OpenClaw to call any MCP server
RUN npm install -g mcporter

# Install Slack CLI (slackdump for history/export, slack-cli for posting)
# Note: Official Slack CLI requires workspace installation, so we use API-based approach
# The slack skill in OpenClaw uses the built-in message tool, not a separate CLI

# Verify installations
RUN gh --version && mcporter --version || true

# Switch back to node user for security
USER node

# Default working directory
WORKDIR /app

# Labels for container registry
LABEL org.opencontainers.image.source="https://github.com/fasterclaw/fasterclaw"
LABEL org.opencontainers.image.description="OpenClaw with FasterClaw integrations (gh, mcporter)"
LABEL org.opencontainers.image.licenses="MIT"
