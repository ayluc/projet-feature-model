#!/bin/sh

# TODO: The url should be passed as paramater

url="http://localhost:8080"

if ! curl -o /dev/null -s "$url"; then
	echo "ERROR:"
	printf "The backend service is not running or cannot be reached at %s\n\n" "$url"
	echo "Please make sure that you have started the backend and that it is reachable at %s" "$url"
	exit 1
fi

endpoint="$url/validate-creation"

printf "=== Test 1: Valid request ===\n"

curl -s -X POST "$endpoint" \
  -H "Content-Type: application/json" \
  -d '
  {
    "nodes": [
      { "id": "1", "type": "feature" },
      { "id": "2", "type": "or"      },
      { "id": "3", "type": "xor"     }
    ],
    "arcs": [
      { "id": "a1", "source": "1", "target": "2" },
      { "id": "a2", "source": "1", "target": "3" }
    ]
  }'

printf "\n\n=== Test 2: Empty model ===\n"

curl -s -X POST "$endpoint" \
  -H "Content-Type: application/json" \
  -d '{"nodes": [], "arcs": []}'

printf "\n\n=== Test 3: Bad JSON ===\n"

# Clearly not JSON
curl -s -X POST "$endpoint" \
  -H "Content-Type: application/json" \
  -d 'not json'

echo

# Incorrect type
curl -s -X POST "$endpoint" \
	-H "Content-Type: application/json" \
	-d '
	{
		"nodes": [
			{ "id": "1", "type": "bad_type" },
			{ "id": "2", "type": "feature" }
		],
		"arcs": [
			{ "id": "a1", "source": "1", "target": "2" }
		]
	}
	'

printf "\n\n=== Test 4: Missing body ===\n"

curl -s -X POST "$endpoint"
