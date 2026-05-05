import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env variables if you have dotenv installed, or just set them here
import * as dotenv from 'dotenv';
dotenv.config();

// We need the SERVICE ROLE KEY to bypass RLS if inserting from a script, 
// or Anon Key if RLS allows inserts.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateMarks() {
  const filePath = path.join(process.cwd(), 'marks_data.tsv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error("Please save your full TSV data into 'marks_data.tsv' in the root directory.");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');

  // Ensure there's a header
  const header = lines[0].split('\t');
  console.log("Headers detected:", header);

  let successCount = 0;
  let errorCount = 0;
  
  // Start from index 1 to skip header
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    
    // Skip empty or malformed lines
    if (columns.length < 8) continue;

    const docId = columns[0].replace(/"/g, '').trim();
    // Assuming format is /marks/BDS-21-001_2025-2026_secondterm
    const id = docId.startsWith('/marks/') ? docId.replace('/marks/', '') : docId;
    
    const className = columns[1].replace(/"/g, '').trim();
    
    let marksJson = {};
    try {
      marksJson = JSON.parse(columns[2].trim());
    } catch (err) {
      // Data might be truncated or invalid JSON
      console.warn(`Line ${i+1}: Failed to parse marks JSON for ${id}. Skipping.`);
      continue;
    }

    const regNo = columns[3].replace(/"/g, '').trim();
    const session = columns[4].replace(/"/g, '').trim();
    const studentName = columns[5].replace(/"/g, '').trim();
    const term = columns[6].replace(/"/g, '').trim();
    const updatedAt = columns[7].replace(/"/g, '').trim();

    const record = {
      id: id,
      class_name: className,
      marks: marksJson,
      reg_no: regNo,
      session: session,
      student_name: studentName,
      term: term,
      updated_at: new Date(updatedAt).toISOString()
    };

    const { data, error } = await supabase
      .from('marks')
      .upsert(record);

    if (error) {
      console.error(`Error inserting ${id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
    
    if (i % 10 === 0) {
      console.log(`Processed ${i} / ${lines.length - 1} lines...`);
    }
  }

  console.log('--- Migration Complete ---');
  console.log(`Successfully inserted/updated: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

migrateMarks();
