#!/usr/bin/env bash
set -o pipefail

# ストリーミングリクエスト（プログレス非表示）
curl -s --no-progress-meter --no-buffer -N -X POST \
  https://nurumayu-worker.skume-bioinfo.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "temperature": 0.7,
    "stream": true,
    "max_completion_tokens": 256,
    "messages": [
      { "role": "system", "content": "You are a helpful assistant with 100 words." },
      { "role": "user",   "content": "Explain quantum computing" }
    ]
  }' | python3 -c '
import sys
import json
import time

for line in sys.stdin:
    if line.startswith("data:"):
        try:
            data = json.loads(line[5:].strip())
            if "choices" in data and len(data["choices"]) > 0:
                if "delta" in data["choices"][0] and "content" in data["choices"][0]["delta"]:
                    content = data["choices"][0]["delta"]["content"]
                    if content:
                        sys.stdout.write(content)
                        sys.stdout.flush()
                        time.sleep(0.01)  # 小さい遅延を入れて人間らしく見せる
        except json.JSONDecodeError:
            pass
'

echo
