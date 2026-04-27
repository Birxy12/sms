const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
  'src/assets/SS1STUDENTDETAILS.xlsx',
  'src/assets/SS1MARKSHHET.xlsx',
  'src/assets/jss1studentdetails.xlsx',
  'src/assets/jss2studentdetails.xlsx',
  'src/assets/jss3studentdetail.xlsx'
];

files.forEach(file => {
  const absolutePath = path.join(process.cwd(), file);
  if (fs.existsSync(absolutePath)) {
    console.log(`\n--- File: ${file} ---`);
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Headers (First 2 rows):');
    console.log(data.slice(0, 2));
    console.log(`Total rows: ${data.length}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
