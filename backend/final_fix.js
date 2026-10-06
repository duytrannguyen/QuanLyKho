const fs = require('fs');
let content = fs.readFileSync('e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx.fixed.jsx', 'utf8');

if (content.startsWith('')) {
    content = content.substring(1);
}
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
}

fs.writeFileSync('e:/QKSHOP/QL_Kho/frontend/src/trang/NhapMayMoc/TrangNhapMayMoc.jsx', content, 'utf8');
