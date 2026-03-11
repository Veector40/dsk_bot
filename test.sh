#!/bin/bash

URL="http://localhost:7860/api/v1/mcp/project/b3aebfbe-bd77-4fed-b575-3bc64d3c76f0/streamable"

declare -a queries=(
    # Test 1: High Credit Risk (Amount > 100,000)
    "Фирма Алфа ЕООД, ЕИК 111222333. Искаме кредит от 150000 лева за нови машини."
    
    # Test 2: Missing Location (Has POS request, but no city mentioned)
    "Здравейте, фирма Бета АД, ЕИК 999888777. Трябват ни 2 нови ПОС терминала. Спешно е."
    
    # Test 3: The Complaint (Should trigger the IGNORE rule)
    "Аз съм управител на Гама ООД, ЕИК 555666777. Искам да подам жалба! Чаках 2 часа в клона ви в Центъра!"
)

declare -a expected=(
    "EXPECTED: REQUIRES_HUMAN_REVIEW | HIGH | Висок кредитен риск"
    "EXPECTED: REQUIRES_HUMAN_REVIEW | MEDIUM | Липсват локации за инсталация"
    "EXPECTED: IGNORED | LOW | Документът не е бизнес заявка"
)

echo "================================================"
echo " Starting Phase 2 Logic Tests for Bank DSK"
echo "================================================"

for i in "${!queries[@]}"; do
    echo -e "\n▶ TEST CASE $((i+1))"
    echo -e "${expected[$i]}"
    echo -e "Input: \"${queries[$i]}\""
    
    JSON_PAYLOAD=$(jq -n --arg text "${queries[$i]}" --arg id "test_$i" '{
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

    # Execute curl, grab only lines starting with 'data:', strip the prefix, and parse the raw JSON from the markdown block
    echo -e "Output:"
    curl -N -s -X POST "$URL" \
         -H "Content-Type: application/json" \
         -H "Accept: application/json, text/event-stream" \
         -d "$JSON_PAYLOAD" | \
    grep "^data: " | sed 's/^data: //' | \
    jq -r '.result.content[-1].text // empty' | \
    sed 's/```json//g; s/```//g'
    
    echo "------------------------------------------------"
    sleep 2 
done