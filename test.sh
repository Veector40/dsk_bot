#!/bin/bash

# Configuration - Updated to match your Langflow UI port and Flow ID
FLOW_ID="7c1862cf-2696-4821-96a5-b8799f615582"
URL="http://localhost:7860/api/v1/run/$FLOW_ID?stream=false"
TEST_FILE="test_cases.txt"

# Terminal Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 1. Auto-generate the test file if it doesn't exist
if [[ ! -f "$TEST_FILE" ]]; then
    echo -e "${YELLOW}Creating $TEST_FILE with hackathon scenarios...${NC}"
    cat << 'EOF' > "$TEST_FILE"
# 1. FORMAL EMAIL
[Email] Здравейте, Търговия 2000 АД, ЕИК 987654321. Заявяваме инвестиционен заем в размер на 80000 евро.

# 2. CSV EXPORT (One-liner representation)
[System_CSV_Import] Супермаркети Плюс ЕООД; 565656565; POS_TERMINAL; 5; Бургас, Варна

# 3. INTERNAL CHAT (Missing data -> High Priority)
[Internal Chat - Burgas Branch] Трябват ми 3 ПОС терминала за магазините в Бургас. Спешно е! Клиентът чака на гишето.

# 4. VOICE TRANSCRIPT (Messy data -> High Priority)
[Voice_Memo_Transcript] искаме кредит сто хиляди лева фирмата е омега ад ейк сто двайсет трийсет четирийсет

# 5. WEB FEEDBACK (Complaint -> Ignored)
[Web_Feedback] Name: Фирма Нерви ООД | EIK: 123456789 | Message: Пълно безобразие! Чаках 2 часа за превод. Искам компенсация!

# 6. OCR/SCANNED PDF (Return equipment -> Medium Priority)
[Scanned_PDF_OCR] Клоузър АД, ЕИК 999999999. Моля да демонтирате 3 терминала от магазините ни във Варна и Добрич. Не ги ползваме.

# 7. CLIENT PORTAL TICKET (Mixed Request)
[Client_Portal_Ticket_#9982] Искаме 150 хил. евро кредит и 4 ПОС терминала за Пловдив и Асеновград. Ита Трейд АД, ЕИК 554433221.
EOF
    echo -e "${GREEN}Created!${NC}\n"
fi

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN} 🚀 Starting Multi-Format Stress Test for DSK 🚀${NC}"
echo -e "${GREEN}======================================================${NC}"

counter=1

# Read the file line by line
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" == \#* ]]; then
        continue
    fi

    echo -e "\n${CYAN}▶ TEST CASE $counter${NC}"
    echo -e "${PURPLE}Input:${NC} $line"

    # Construct standard Langflow API payload
    JSON_PAYLOAD=$(jq -n --arg text "$line" '{
        input_value: $text,
        output_type: "chat",
        input_type: "chat"
    }')

    # Call Langflow REST API
    RAW_RESPONSE=$(curl -s -X POST "$URL" \
         -H "Content-Type: application/json" \
         -d "$JSON_PAYLOAD")

    # Extract the final message text deep within Langflow's nested JSON response
    # This jq filter aggressively searches for the final text output
    RAW_TEXT=$(echo "$RAW_RESPONSE" | jq -r '.. | .text? | select(. != null)' | tail -n 1)

    # Clean the markdown formatting from the AI response
    CLEAN_JSON=$(echo "$RAW_TEXT" | sed 's/```json//gi; s/```//gi')

    echo -e "${PURPLE}Output:${NC}"
    if echo "$CLEAN_JSON" | jq -e . >/dev/null 2>&1; then
        echo "$CLEAN_JSON" | jq .
    else
        echo -e "${YELLOW}$CLEAN_JSON${NC}"
        echo -e "${YELLOW}[Warning: AI Output was not valid JSON]${NC}"
        echo -e "Raw API Error/Response: $RAW_RESPONSE"
    fi

    echo "------------------------------------------------------"
    
    ((counter++))
    
    # 2 second delay to prevent overwhelming the local LLM proxy/API limits
    sleep 2 
done < "$TEST_FILE"

echo -e "${GREEN}✅ All tests completed successfully!${NC}"