import Papa from 'papaparse';

/**
 * Robust CSV question parser that handles:
 * - UTF-8 BOM
 * - Leading / trailing spaces in headers and values
 * - Any header variations (Question, Prompt, Q, Option A/1/a, Correct Answer, Ans, Key, Target Class, etc.)
 * - Positional fallbacks (col 0, 1, 2, 3, 4, 5, 6)
 * - Flexible answer keys: 'A'|'B'|'C'|'D', '1'|'2'|'3'|'4', '0'|'1'|'2'|'3', or exact option text matching
 */
export const parseQuestionsCsv = (file, defaultClass = 'All') => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.replace(/^\ufeff/, '').trim(),
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            return resolve([]);
          }

          const parsed = [];

          results.data.forEach((row) => {
            if (!row || typeof row !== 'object') return;

            // Map all keys with sanitized lowercased stripped names
            const keyMap = {};
            Object.keys(row).forEach(k => {
              const cleaned = k.replace(/^\ufeff/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              keyMap[cleaned] = row[k];
            });

            // 1. Find question prompt
            let prompt = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k.includes('question') || k.includes('prompt') || k === 'q' || k === 'item' || k === 'title') {
                prompt = String(v || '').trim();
                break;
              }
            }

            // 2. Find Option A
            let optionA = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k === 'optiona' || k === 'a' || k === 'opta' || k === 'option1' || k === 'opt1' || k === 'choicea' || k === 'choice1') {
                optionA = String(v || '').trim();
                break;
              }
            }

            // 3. Find Option B
            let optionB = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k === 'optionb' || k === 'b' || k === 'optb' || k === 'option2' || k === 'opt2' || k === 'choiceb' || k === 'choice2') {
                optionB = String(v || '').trim();
                break;
              }
            }

            // 4. Find Option C
            let optionC = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k === 'optionc' || k === 'c' || k === 'optc' || k === 'option3' || k === 'opt3' || k === 'choicec' || k === 'choice3') {
                optionC = String(v || '').trim();
                break;
              }
            }

            // 5. Find Option D
            let optionD = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k === 'optiond' || k === 'd' || k === 'optd' || k === 'option4' || k === 'opt4' || k === 'choiced' || k === 'choice4') {
                optionD = String(v || '').trim();
                break;
              }
            }

            // 6. Find Correct Answer
            let rawAnswer = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k.includes('answer') || k.includes('correct') || k === 'ans' || k === 'key' || k === 'solution') {
                rawAnswer = String(v || '').trim();
                break;
              }
            }

            // 7. Find Target Class
            let targetClass = '';
            for (const [k, v] of Object.entries(keyMap)) {
              if (k.includes('class') || k === 'target') {
                targetClass = String(v || '').trim();
                break;
              }
            }

            // Fallback: If headers didn't match standard names, read positionally from row values
            const values = Object.values(row).map(val => String(val || '').trim());
            if (!prompt && values[0]) prompt = values[0];
            if (!optionA && values[1]) optionA = values[1];
            if (!optionB && values[2]) optionB = values[2];
            if (!optionC && values[3]) optionC = values[3];
            if (!optionD && values[4]) optionD = values[4];
            if (!rawAnswer && values[5]) rawAnswer = values[5];
            if (!targetClass && values[6]) targetClass = values[6];

            const options = [optionA, optionB, optionC, optionD];

            // Only proceed if prompt exists and at least 2 options exist
            if (prompt && options.filter(Boolean).length >= 2) {
              // Deduce correct index
              let correctIndex = 0;
              const upperAns = rawAnswer.toUpperCase().trim();

              if (upperAns === 'B' || upperAns === 'OPT B' || upperAns === 'OPTION B' || upperAns === '2') {
                correctIndex = 1;
              } else if (upperAns === 'C' || upperAns === 'OPT C' || upperAns === 'OPTION C' || upperAns === '3') {
                correctIndex = 2;
              } else if (upperAns === 'D' || upperAns === 'OPT D' || upperAns === 'OPTION D' || upperAns === '4') {
                correctIndex = 3;
              } else if (upperAns === 'A' || upperAns === 'OPT A' || upperAns === 'OPTION A' || upperAns === '1' || upperAns === '0') {
                correctIndex = 0;
              } else if (optionB && upperAns === optionB.toUpperCase()) {
                correctIndex = 1;
              } else if (optionC && upperAns === optionC.toUpperCase()) {
                correctIndex = 2;
              } else if (optionD && upperAns === optionD.toUpperCase()) {
                correctIndex = 3;
              }

              parsed.push({
                prompt,
                options,
                correctIndex,
                targetClass: targetClass || defaultClass || 'All'
              });
            }
          });

          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err)
    });
  });
};
