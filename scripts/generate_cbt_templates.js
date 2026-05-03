import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLASS_LIST, getSubjectsForClass } from '../src/utils/subjectConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'cbt_question_banks');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let totalGenerated = 0;

for (const className of CLASS_LIST) {
  const subjects = getSubjectsForClass(className);
  
  for (const subject of subjects) {
    const filename = `${className}_${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Questions.csv`;
    const filepath = path.join(outputDir, filename);
    
    let csvContent = 'Question,Option A,Option B,Option C,Option D,Correct Answer\n';
    
    for (let i = 1; i <= 25; i++) {
      const q = `What is the correct answer for sample question ${i} in ${className} ${subject}?`;
      const a = `Option A for Q${i}`;
      const b = `Option B for Q${i}`;
      const c = `Option C for Q${i}`;
      const d = `Option D for Q${i}`;
      const correct = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
      
      csvContent += `"${q}","${a}","${b}","${c}","${d}","${correct}"\n`;
    }
    
    fs.writeFileSync(filepath, csvContent);
    totalGenerated++;
  }
}

console.log(`Successfully generated ${totalGenerated} CSV templates with 25 questions each in cbt_question_banks/`);
