import json
import re

# Read the content of payload.txt
with open('payload.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Generate the JS encoded string
encoded_payload = json.dumps(content)

# Read script.js
with open('script.js', 'r', encoding='utf-8') as f:
    script_content = f.read()

# Replace the specific block where we added DEFAULT_QUIZ_PAYLOAD earlier
pattern = re.compile(r"if \(typeof DEFAULT_QUIZ_PAYLOAD !== 'undefined'\) \{.*?localStorage\.setItem\('quizLibrary', JSON\.stringify\(state\.quizLibrary\)\);\s*\}\s*\}", re.DOTALL)

replacement = f'''const DEFAULT_QUIZ_PAYLOAD = {encoded_payload};
        const hasDeOn = state.quizLibrary.some(q => q.title === "Đề ôn lập trình CB.");
        if (!hasDeOn) {{
            state.quizLibrary.push({{
                id: 'default-de-on-cb',
                title: 'Đề ôn lập trình CB.',
                content: DEFAULT_QUIZ_PAYLOAD,
                date: Date.now()
            }});
            localStorage.setItem('quizLibrary', JSON.stringify(state.quizLibrary));
        }}'''

new_script_content = pattern.sub(lambda m: replacement, script_content)

# Write back to script.js
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(new_script_content)
