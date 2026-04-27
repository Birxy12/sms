const XLSX = require('xlsx');
const fs = require('fs');

function investigateSheet(path) {
  try {
    const buf = fs.readFileSync(path);
    const workbook = XLSX.read(buf, {type: 'buffer'});
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {header: 1});
    
    console.log(`\n\n=== INVESTIGATING: ${path} ===`);
    console.log("=== ROWS 5 to 15 (Headers/Info) ===");
    for (let i = 4; i < Math.min(15, data.length); i++) {
        console.log(`Row ${i+1}:`, JSON.stringify(data[i]));
    }
    console.log("=== ROWS 18 to 22 (Subjects Start) ===");
    for (let i = 17; i < Math.min(22, data.length); i++) {
        console.log(`Row ${i+1}:`, JSON.stringify(data[i]));
    }
  } catch (e) {
    console.error(`Error reading ${path}:`, e.message);
  }
}

investigateSheet('C:\\Users\\birxy\\sms\\src\\assets\\s2s3a.xlsm');
investigateSheet('C:\\Users\\birxy\\sms\\src\\assets\\s2s3sc.xlsm');
