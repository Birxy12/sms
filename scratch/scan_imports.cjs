const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
const files = [];

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.match(/\.(jsx?|tsx?)$/)) files.push(p);
  }
}
walk(src);

const imp = new Set();
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  for (const m of c.matchAll(/from ['"]([^./][^'"]*)['"]/g)) {
    imp.add(m[1]);
  }
  for (const m of c.matchAll(/require\(['"]([^./][^'"]*)['"]\)/g)) {
    imp.add(m[1]);
  }
}

console.log([...imp].sort().join('\n'));
