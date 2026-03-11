import os
import random

# Ensure the directory exists
output_dir = "mock_data"
os.makedirs(output_dir, exist_ok=True)

# 1. Perfect POS Requests
pos_valid = [
    "Здравейте, ние сме фирма 'ТехноБГ' ЕООД с ЕИК 123456789. Искаме да заявим 5 ПОС терминала за нашите нови обекти в София и Пловдив. Моля за оферта.",
    "До Банка ДСК. Заявявам 12 броя ПОС устройства за верига магазини 'СуперМарт' АД, ЕИК 987654321. Обектите се намират във Варна, Бургас и Добрич. Лице за контакт: Мария Иванова.",
    "Моля да ни предоставите 1 виртуален ПОС терминал (vPOS) за нашия онлайн магазин. Фирма 'УебСейлс' ЕООД, ЕИК 112233445."
]

# 2. Perfect Credit Requests
credit_valid = [
    "Уважаеми господа, 'СтройКомплект' ООД (ЕИК 556677889) кандидатства за оборотна кредитна линия в размер на 50 000 лв. Прикачваме нужните финансови отчети за миналата година.",
    "Здравейте, интересуваме се от инвестиционен кредит за закупуване на земеделска техника. Нужната сума е 120 000 лева. Фирмата е 'АгроИнвест' ЕООД, ЕИК 445566778. Какви са следващите стъпки?",
]

# 3. Incomplete/Broken Requests (Designed to trigger Agent 3's Human-in-the-Loop)
broken_requests = [
    "Здравейте, искам 20 ПОС терминала спешно за утре за новите ми магазини. Поздрави, Иван.", # Missing company name, EIK, locations
    "Кандидатствам за кредит от 500 000 лева. Моля свържете се с мен на този имейл.", # Missing EIK, huge amount, high risk
    "Трябват ни ПОС терминали за фирмата. ЕИК е 123123123. Колко ще струва?", # Missing quantity and locations
]

# 4. Complaints / General Inquiries (To test the Dispatcher routing)
complaints = [
    "Здравейте, от два дни ПОС терминалът в обекта ни в Русе не работи! Дава грешка 404. Моля за спешно съдействие!",
    "Къде мога да видя актуалните такси за превод към чужбина в евро?",
    "Искам да подам оплакване за лошо обслужване в клон Младост."
]

# Combine and shuffle
all_emails = []
all_emails.extend([("pos_valid", text) for text in pos_valid])
all_emails.extend([("credit_valid", text) for text in credit_valid])
all_emails.extend([("broken", text) for text in broken_requests])
all_emails.extend([("complaint", text) for text in complaints])

# Duplicate some to reach ~20 files for a good test batch
while len(all_emails) < 20:
    all_emails.append(random.choice(all_emails))

random.shuffle(all_emails)

# Write to files
for i, (category, text) in enumerate(all_emails):
    filename = f"email_{i+1:02d}.txt"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(text)

print(f"Successfully generated {len(all_emails)} mock business emails in '{output_dir}/'")
