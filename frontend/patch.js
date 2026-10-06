const fs = require('fs');
let content = fs.readFileSync('src/pages/BangGia/TrangBangGia.jsx', 'utf8');

content = content.replace(/padding: '6px 10px',/g, "padding: '10px 14px',");
content = content.replace(/marginBottom: '2px'/g, "marginBottom: '6px'");
content = content.replace(/height: '60px', maxWidth: '100%', objectFit: 'contain' , marginTop:'-10px'/g, "height: '70px', maxWidth: '100%', objectFit: 'contain' , marginTop:'-17px'");
content = content.replace(/lineHeight: 1.2, \s*padding: '4px 6px', width: '100%', boxSizing: 'border-box',\s*wordWrap: 'break-word', flexShrink: 0, marginTop:'-10px'/g, "lineHeight: 1.3, \n        padding: '6px 8px', width: '100%', boxSizing: 'border-box',\n        wordWrap: 'break-word', flexShrink: 0, marginTop:'-20px'");
content = content.replace(/fontSize: '19px', margin: '4px 0 2px'/g, "fontSize: '20px', margin: '8px 0 4px'");
content = content.replace(/margin: '0 8px 4px'/g, "margin: '0 8px 8px'");
content = content.replace(/gap: '3px', overflow: 'hidden', fontSize: '12px', color: '#000', lineHeight: 1.2/g, "gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25");
content = content.replace(/fontSize: '12px', padding: '4px', margin: '4px 0'/g, "fontSize: '13px', padding: '8px 4px', margin: '8px 0'");
content = content.replace(/fontSize: '9px', fontStyle: 'italic', fontWeight: 700, lineHeight: 1.2/g, "fontSize: '9px', fontStyle: 'italic', fontWeight: 700, lineHeight: 1.35");

content = content.replace(/\.page \{\s*width: 100%;\s*height: 100vh;\s*padding: 0;/g, ".page {\n  width: ${pgW};\n  height: ${pgH};\n  padding: 0;");
content = content.replace(/gap: 0;\s*padding: 2mm;/g, "gap: 5px;\n  padding: 5px;");
content = content.replace(/\.card \{\s*border: 1.5px solid #111;\s*padding: 6px 10px;/g, ".card {\n  border: 1.5px solid #111;\n  padding: 10px 14px;");
content = content.replace(/\.logo img \{\s*height: 60px; max-width: 100%; object-fit: contain; margin-top: -10px;/g, ".logo img {\n  height: 70px; max-width: 100%; object-fit: contain; margin-top: -17px;");
content = content.replace(/font-size: 15px; line-height: 1.2;\s*padding: 4px 6px; border-radius: 0; margin-top: -10px;/g, "font-size: 15px; line-height: 1.3;\n  padding: 6px 8px; border-radius: 0; margin-top: -20px;");
content = content.replace(/font-size: 19px; margin: 4px 0 2px; color: #000;/g, "font-size: 20px; margin: 8px 0 4px; color: #000;");
content = content.replace(/margin: 0 8px 4px; flex-shrink: 0;/g, "margin: 0 8px 8px; flex-shrink: 0;");
content = content.replace(/\.specs \{ flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 3px; color: #000;\}/g, ".specs { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; color: #000;}");
content = content.replace(/\.spec \{ font-size: 12px; line-height: 1.2; \}/g, ".spec { font-size: 12.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }");
content = content.replace(/font-size: 12px; line-height: 1.3;\s*padding: 4px; border-radius: 0; margin: 4px 0;/g, "font-size: 13px; line-height: 1.4;\n  padding: 8px 4px; border-radius: 0; margin: 8px 0;");
content = content.replace(/\.policy \{\s*font-size: 9px; font-style: italic; font-weight: 700; color: #000;\s*line-height: 1.2; flex-shrink: 0;\s*\}\s*\.policy div \{ \}/g, ".policy {\n  font-size: 9px; font-style: italic; font-weight: 700; color: #000;\n  line-height: 1.35; flex-shrink: 0;\n}\n.policy div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }");

content = content.replace(/gap: '0px',\s*padding: '2mm',/g, "gap: '5px',\n              padding: '5px',");

fs.writeFileSync('src/pages/BangGia/TrangBangGia.jsx', content);
console.log("Done");
