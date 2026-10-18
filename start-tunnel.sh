#!/usr/bin/env bash
# ==========================================================
# OwnDJ - Cloudflare Tunnel Starter for macOS
# ==========================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
CONFIG_FILE="$DIR/cloudflared/config.yml"

echo "=========================================================="
echo "          OwnDJ - Cloudflare Event Tunnel                "
echo "=========================================================="

# Check if Homebrew is available
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared is not installed on this Mac."
    echo "Attempting to install cloudflared via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install cloudflared
    elif [ -f "/opt/homebrew/bin/brew" ]; then
        /opt/homebrew/bin/brew install cloudflared
        export PATH="/opt/homebrew/bin:$PATH"
    else
        echo "Error: Homebrew not found. Please install cloudflared manually:"
        echo "  brew install cloudflared"
        exit 1
    fi
fi

echo ""
echo "Select tunnel mode for your personal event:"
echo "  1) Instant Quick Tunnel  (Free, NO Cloudflare account needed - generates a https://*.trycloudflare.com URL)"
echo "  2) Custom Named Tunnel   (Uses cloudflared/config.yml with your own Cloudflare domain/token)"
echo ""
read -p "Select [1 or 2, default: 1]: " MODE
MODE=${MODE:-1}

if [ "$MODE" = "1" ]; then
    echo ""
    echo "=========================================================="
    echo "Starting Instant Cloudflare Tunnel..."
    echo "Traffic destination: http://localhost:5173"
    echo ""
    echo ">>> Look for the HTTPS URL below (ends in .trycloudflare.com) <<<"
    echo "Guests can open this link on their phones to request songs & vote!"
    echo "Press Ctrl+C to stop the tunnel when the event ends."
    echo "=========================================================="
    echo ""
    cloudflared tunnel --url http://localhost:5173
else
    echo ""
    echo "Starting Named Tunnel with config: $CONFIG_FILE"
    cloudflared tunnel --config "$CONFIG_FILE" run
fi
