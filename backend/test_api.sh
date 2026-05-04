#!/bin/bash
BASE="http://localhost:8080"

echo "=== Test 1: Valid request ==="
curl -s -X POST "$BASE/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "1", "type": "feature",  "label": "Car",    "position": {"x": 0, "y": 0}},
      {"id": "2", "type": "feature",  "label": "Engine", "position": {"x": 100, "y": 100}},
      {"id": "3", "type": "feature",  "label": "Wheels", "position": {"x": 200, "y": 100}}
    ],
    "arcs": [
      {"id": "a1", "source": "1", "target": "2"},
      {"id": "a2", "source": "1", "target": "3"}
    ]
  }'
echo

echo "=== Test 2: Empty model ==="
curl -s -X POST "$BASE/validate" \
  -H "Content-Type: application/json" \
  -d '{"nodes": [], "arcs": []}'
echo

echo "=== Test 3: Bad JSON ==="
curl -s -X POST "$BASE/validate" \
  -H "Content-Type: application/json" \
  -d 'not json'
echo

echo "=== Test 4: Missing body ==="
curl -s -X POST "$BASE/validate"
echo
