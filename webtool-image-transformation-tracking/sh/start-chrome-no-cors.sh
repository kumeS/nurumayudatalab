#!/bin/bash

# Script to start Chrome with CORS disabled for development
# WARNING: Only use this for local development, never for production!

echo "🚀 Starting Chrome with CORS disabled for development..."
echo "⚠️  WARNING: This is insecure and should only be used for local testing"
echo ""

# Kill any existing Chrome instances
killall "Google Chrome" 2>/dev/null

# Wait a moment
sleep 1

# Start Chrome with CORS disabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --disable-web-security \
    --user-data-dir="/tmp/chrome-dev-session" \
    --disable-features=IsolateOrigins,site-per-process \
    http://localhost:8088 &

echo ""
echo "✅ Chrome started with CORS disabled"
echo "📂 Using temporary profile: /tmp/chrome-dev-session"
echo "🌐 Opening: http://localhost:8088"
echo ""
echo "Press Ctrl+C to stop"
