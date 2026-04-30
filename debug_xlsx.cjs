const XLSX = require('xlsx');
console.log('Available methods:', Object.keys(XLSX).filter(k => typeof XLSX[k] === 'function').slice(0, 10));
