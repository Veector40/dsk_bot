#!/bin/bash

# --- Configuration ---
FLOW_ID="7c1862cf-2696-4821-96a5-b8799f615582"
NODE_ID="File-2PIQ4"
URL_UPLOAD="http://localhost:7860/api/v1/upload/$FLOW_ID"
URL_RUN="http://localhost:7860/api/v1/run/$FLOW_ID?stream=false"
TEST_DIR="./dsk_test_cases"

# Colors for terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN} 🚀 GENERATING EXTREME TEST DATA FOR BANK DSK 🚀${NC}"
echo -e "${CYAN}======================================================${NC}"

# Clean up old test files and make a fresh directory
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# --- SCENARIO 1: Perfect Auto-Approve (TXT) ---
cat << 'EOF' > "$TEST_DIR/01_perfect_credit.txt"
Здравейте, Търговия 2000 АД, ЕИК 987654321. Заявяваме инвестиционен заем в размер на 80000 евро.
EOF

# --- SCENARIO 2: High Risk Credit (TXT) ---
cat << 'EOF' > "$TEST_DIR/02_high_risk_credit.txt"
Искаме огромен кредит от 250000 евро за разширяване на бизнеса. Фирма Мега Строй ЕООД, ЕИК 123456789.
EOF

# --- SCENARIO 3: Missing Locations for POS (TXT) ---
cat << 'EOF' > "$TEST_DIR/03_missing_locations.txt"
Здравейте, трябват ни 3 нови физически ПОС терминала за магазините ни. Алфа Трейд ООД, ЕИК 111222333.
EOF

# --- SCENARIO 4: Invalid EIK Length (TXT) ---
cat << 'EOF' > "$TEST_DIR/04_invalid_eik.txt"
Заявявам 1 виртуален ПОС терминал за сайта ни. Фирма УебСел, ЕИК 1234567890.
EOF

# --- SCENARIO 5: Return Equipment (TXT) ---
cat << 'EOF' > "$TEST_DIR/05_return_pos.txt"
Искаме да върнем 2 ПОС терминала от обектите ни в София. Не ги ползваме. Бета ЕАД, ЕИК 999888777.
EOF

# --- SCENARIO 6: Angry Complaint (TXT) ---
cat << 'EOF' > "$TEST_DIR/06_complaint_ignored.txt"
Пълно безобразие! Чаках 2 часа на гишето в Пловдив. Фирма Нерви ООД, ЕИК 123456789. Искам компенсация!
EOF

# --- SCENARIO 7: Batch Processing File (CSV) ---
cat << 'EOF' > "$TEST_DIR/07_batch_request.csv"
company_name,eik,request_type,amount_or_quantity,cities
Супермаркети Плюс,565656565,CREDIT_REQUEST,50000,Бургас
EOF

# --- SCENARIO 8: Formal PDF Request (PDF using pdflatex) ---
echo -e "${YELLOW}Compiling PDF test file using pdflatex...${NC}"
cat << 'EOF' > "$TEST_DIR/08_formal_request.tex"
\documentclass{article}
\usepackage[T2A]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[bulgarian]{babel}
\begin{document}
\section*{Официална Заявка до Банка ДСК}
Уважаеми дами и господа,

Ние от \textbf{Иновации АД}, с ЕИК \textbf{135792468}, официално заявяваме необходимостта от \textbf{5 нови физически ПОС терминала} за нашите обекти в градовете \textbf{Варна и Бургас}.

С уважение,\\
Управител
\end{document}
EOF
pdflatex -interaction=batchmode -output-directory="$TEST_DIR" "$TEST_DIR/08_formal_request.tex" > /dev/null 2>&1
rm -f "$TEST_DIR"/*.tex "$TEST_DIR"/*.aux "$TEST_DIR"/*.log

# --- 🚀 NEW SCENARIOS ADDED BELOW 🚀 ---

# --- SCENARIO 9: Missing Key Data (TXT) ---
# Testing Rule 1: Wants a loan, but provides absolutely no company info.
cat << 'EOF' > "$TEST_DIR/09_missing_data.txt"
Здравейте, много спешно ни трябва кредит от 50000 евро, за да купим стока. Моля свържете се с мен!
EOF

# --- SCENARIO 10: Multi-Intent / Mixed Request (TXT) ---
# Testing prioritization: Wants a small loan (Auto Approve) BUT wants physical POS without cities (Rule 5). 
# Agent 3 must apply the strictest rule and send to human review.
cat << 'EOF' > "$TEST_DIR/10_mixed_request.txt"
Фирма Гама ЕАД, ЕИК 555444333. Искаме да изтеглим 20000 евро за оборудване, както и да ни предоставите 2 физически ПОС терминала за новите ни каси.
EOF

# --- SCENARIO 11: Foreign Currency Handling (TXT) ---
# Testing Agent 2's conversion rule: Asks for 100,000 BGN (leva). Agent 2 should convert to ~51,129 EUR. 
# It should NOT trigger the >100k EUR high-risk rule.
cat << 'EOF' > "$TEST_DIR/11_currency_bgn.txt"
Здравейте, фирма Родопи ООД, ЕИК 121212121. Заявяваме бизнес кредит на стойност 100000 лева.
EOF

# --- SCENARIO 12: Virtual POS Exception (TXT) ---
# Testing Virtual POS: A virtual POS doesn't need physical locations. Rule 5 should NOT trigger.
cat << 'EOF' > "$TEST_DIR/12_virtual_pos.txt"
Онлайн Магазин БГ ЕООД, ЕИК 989898989. Моля да ни откриете 1 виртуален ПОС терминал за новия ни уебсайт.
EOF

# --- SCENARIO 13: HTML/Formatting Noise (TXT) ---
# Testing Agent 1/2's ability to ignore garbage formatting and just extract the intent.
cat << 'EOF' > "$TEST_DIR/13_html_noise.txt"
<html><body><div class="email-body"><b>FWD: Заявка от клиент</b><br><br>Моля да разгледате искането на <i>Шумни АД</i>, ЕИК: 777666555. Искат 10000 евро кредит.<br><hr><small>This email is confidential.</small></div></body></html>
EOF

echo -e "${GREEN}✅ All 13 test files generated successfully!${NC}\n"

# --- THE TESTING LOOP ---

for FILE_PATH in "$TEST_DIR"/*; do
    FILENAME=$(basename "$FILE_PATH")
    echo -e "${CYAN}▶ Testing Scenario:${NC} ${YELLOW}$FILENAME${NC}"
    
    # 1. Upload
    UPLOAD_RESPONSE=$(curl -s -X POST "$URL_UPLOAD" -F "file=@$FILE_PATH")
    ABS_UPLOADED_PATH=$(echo "$UPLOAD_RESPONSE" | jq -r '.file_path')
    
    if [ -z "$ABS_UPLOADED_PATH" ] || [ "$ABS_UPLOADED_PATH" == "null" ]; then
        echo -e "❌ ${PURPLE}Upload failed for $FILENAME${NC}"
        continue
    fi

    # 2. Extract Relative Path
    INTERNAL_FILENAME=$(basename "$ABS_UPLOADED_PATH")
    RELATIVE_PATH="$FLOW_ID/$INTERNAL_FILENAME"

    # 3. Payload
    JSON_PAYLOAD=$(jq -n --arg path "$RELATIVE_PATH" --arg node "$NODE_ID" '{
        input_value: "",
        output_type: "chat",
        input_type: "chat",
        tweaks: {
            ($node): {
                "path": $path
            }
        }
    }')

    # 4. Execute API
    RAW_RESPONSE=$(curl -s -X POST "$URL_RUN" \
         -H "Content-Type: application/json" \
         -d "$JSON_PAYLOAD")

    # 5. Extract Text
    OUTPUT_TEXT=$(echo "$RAW_RESPONSE" | jq -r '.outputs[0].outputs[0].results.message.text')

    # 6. Format and Print
    if [ -z "$OUTPUT_TEXT" ] || [ "$OUTPUT_TEXT" == "null" ]; then
        echo -e "⚠️ ${PURPLE}Output was empty. Raw response:${NC}"
        echo "$RAW_RESPONSE" | jq .
    else
        if echo "$OUTPUT_TEXT" | jq . >/dev/null 2>&1; then
            echo "$OUTPUT_TEXT" | jq .
        else
            echo -e "${PURPLE}$OUTPUT_TEXT${NC}"
        fi
    fi
    echo "------------------------------------------------------"
    
    # Give the LLM a breather to avoid rate limits
    sleep 2 
done

echo -e "${GREEN}🎉 ALL 13 STRESS TESTS COMPLETE! 🎉${NC}"