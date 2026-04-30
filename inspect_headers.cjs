const XLSX = require('xlsx');
const fs = require('fs');

const files = [
  'src/assets/js2classlist.xlsx',
  'src/assets/jss2ful.xlsx'
];

files.forEach(file => {
  console.log(`\n--- Reading ${file} ---`);
  if (!fs.existsSync(file)) {
    console.log('File does not exist');
    return;
  }
  const workbook = XLSX.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // header: 1 returns an array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('Headers:', data[0]);
  console.log('Sample Row:', data[1]);
});
