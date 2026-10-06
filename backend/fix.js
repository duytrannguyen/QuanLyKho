const fs = require('fs');
const path = require('path');
const file = 'e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx';
const content = fs.readFileSync(file, 'utf8');

// The file was read as Windows-1252 (or CP1252) and written as UTF-8.
// We can reverse it by taking the UTF-8 bytes and interpreting them as CP1252.
// Actually, since Node.js 'binary' encoding is basically latin1/CP1252:
const originalStr = Buffer.from(content, 'latin1').toString('utf8');

fs.writeFileSync(file + '.fixed.jsx', originalStr, 'utf8');
