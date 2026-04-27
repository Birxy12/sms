import * as XLSX from 'xlsx';
import fs from 'fs';

try {
    const buf = fs.readFileSync('c:/Users/birxy/sms/src/assets/ss1 english.xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
} catch (err) {
    console.error(err);
}
