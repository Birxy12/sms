const fs = require('fs');
const content = fs.readFileSync('src/components/BulkUpload.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let inString = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'" || char === "`") {
            if (inString === char) inString = null;
            else if (!inString) inString = char;
        }
        if (inString) continue;

        if (char === '{') {
            stack.push({ line: i + 1, char: j + 1 });
        } else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra } at line ${i + 1}, char ${j + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    console.log(`Unclosed { at lines: ${stack.map(s => s.line).join(', ')}`);
} else {
    console.log("All braces matched!");
}
