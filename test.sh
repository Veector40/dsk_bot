#!/bin/bash

# Configuration
URL="http://localhost:7863/api/v1/mcp/project/b3aebfbe-bd77-4fed-b575-3bc64d3c76f0/streamable"
TEST_FILE="test_cases.txt"

# Terminal Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [[ ! -f "$TEST_FILE" ]]; then
    echo -e "${YELLOW}Error: $TEST_FILE not found! Please create it in the same directory.${NC}"
    exit 1
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN} 🚀 Starting 50-Scenario Stress Test for DSK 🚀${NC}"
echo -e "${GREEN}================================================${NC}"

counter=1

# Read the file line by line
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments (lines starting with #)
    if [[ -z "$line" ]] || [[ "$line" == \#* ]]; then
        continue
    fi

    echo -e "\n${CYAN}▶ TEST CASE $counter${NC}"
    echo -e "Input: \"$line\""

    # Safely construct the JSON-RPC payload using jq
    JSON_PAYLOAD=$(jq -n --arg text "$line" --arg id "test_$counter" '{
        jsonrpc: "2.0",
        id: $id,
        method: "tools/call", 
        params: {
            name: "the_extractor",
            arguments: {
                input_value: $text
            }
        }
    }')

    # Call Langflow MCP Tool
    RAW_RESPONSE=$(curl -N -s -X POST "$URL" \
         -H "Content-Type: application/json" \
         -H "Accept: application/json, text/event-stream" \
         -d "$JSON_PAYLOAD")

    # Parse the server-sent events, extract the text, and clean the markdown
    CLEAN_JSON=$(echo "$RAW_RESPONSE" | \
        grep "^data: " | \
        sed 's/^data: //' | \
        jq -r '.result.content[-1].text // empty' | \
        sed 's/```json//gi; s/```//gi')

    # Pretty-print the output using jq
    echo -e "Output:"
    if echo "$CLEAN_JSON" | jq -e . >/dev/null 2>&1; then
        echo "$CLEAN_JSON" | jq .
    else
        echo -e "${YELLOW}$CLEAN_JSON${NC}"
        echo -e "${YELLOW}[Warning: AI Output was not valid JSON]${NC}"
    fi

    echo "------------------------------------------------"
    
    ((counter++))
    
    # 1.5 second delay so we don't completely melt your local Langflow instance
    sleep 1.5 
done < "$TEST_FILE"

echo -e "${GREEN}✅ All tests completed successfully!${NC}"