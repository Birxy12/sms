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
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
});
