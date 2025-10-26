#!/bin/bash
# macOS curl test script for Cloudflare Workers Nano Banana API

set -e

WORKER_URL="https://replicate-nanobanana.skume-bioinfo.workers.dev"

echo "========================================="
echo "Cloudflare Workers API Test (curl)"
echo "========================================="
echo ""

# Test 1: Health check
echo "📋 Test 1: Health Endpoint"
echo "---"
curl -s "${WORKER_URL}/health" | python3 -m json.tool
echo ""
echo ""

# Test 2: Image generation
echo "📸 Test 2: Image Generation via /proxy"
echo "---"
echo "Request:"
cat << 'JSON'
{
  "path": "/v1/models/google/nano-banana/predictions",
  "input": {
    "prompt": "make the sky more dramatic and colorful",
    "image_input": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4"],
    "aspect_ratio": "1:1",
    "output_format": "png"
  }
}
JSON
echo ""
echo "Response:"

# Create temporary file for JSON payload
TEMP_JSON=$(mktemp)
cat > "$TEMP_JSON" << 'EOF'
{
  "path": "/v1/models/google/nano-banana/predictions",
  "input": {
    "prompt": "make the sky more dramatic and colorful",
    "image_input": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4"],
    "aspect_ratio": "1:1",
    "output_format": "png"
  }
}
EOF

# Execute curl with proper escaping
RESPONSE=$(curl -s -X POST "${WORKER_URL}/proxy" \
  -H "Content-Type: application/json" \
  --data @"$TEMP_JSON")

# Clean up temp file
rm -f "$TEMP_JSON"

# Parse and display response
echo "$RESPONSE" | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)

    print('Status: OK' if data.get('ok') else 'Status: ERROR')

    prediction = data.get('prediction', {})
    print(f'Prediction ID: {prediction.get(\"id\", \"N/A\")}')
    print(f'Status: {prediction.get(\"status\", \"N/A\")}')
    print(f'Model: {prediction.get(\"model\", \"N/A\")}')

    if prediction.get('error'):
        print(f'Error: {prediction[\"error\"]}')

    if prediction.get('output'):
        print(f'Output URL: {prediction[\"output\"]}')

    if prediction.get('r2Output'):
        print(f'R2 URLs: {len(prediction[\"r2Output\"])} files')
        for i, url in enumerate(prediction['r2Output']):
            print(f'  [{i}] {url}')

    saved = data.get('saved', [])
    print(f'R2 Saved: {len(saved)} files')
    if saved:
        for item in saved[:3]:
            if 'r2Key' in item:
                print(f'  - {item[\"r2Key\"]}')

    print('')
    print('Full Response:')
    print(json.dumps(data, indent=2))

except Exception as e:
    print(f'Error parsing response: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"

echo ""
echo "========================================="
echo "Test completed"
echo "========================================="
