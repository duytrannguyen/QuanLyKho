import re

with open('src/pages/BangGia/TrangBangGia.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert PriceCard UI paddings and margins
content = content.replace("padding: '6px 10px',", "padding: '10px 14px',")
content = content.replace("marginBottom: '2px'", "marginBottom: '6px'")
content = content.replace("height: '60px', maxWidth: '100%', objectFit: 'contain' , marginTop:'-10px'", "height: '70px', maxWidth: '100%', objectFit: 'contain' , marginTop:'-17px'")
content = content.replace("lineHeight: 1.2, \n        padding: '4px 6px', width: '100%', boxSizing: 'border-box',\n        wordWrap: 'break-word', flexShrink: 0, marginTop:'-10px'", "lineHeight: 1.3, \n        padding: '6px 8px', width: '100%', boxSizing: 'border-box',\n        wordWrap: 'break-word', flexShrink: 0, marginTop:'-20px'")
content = content.replace("fontSize: '19px', margin: '4px 0 2px'", "fontSize: '20px', margin: '8px 0 4px'")
content = content.replace("margin: '0 8px 4px'", "margin: '0 8px 8px'")
content = content.replace("gap: '3px', overflow: 'hidden', fontSize: '12px', color: '#000', lineHeight: 1.2 ", "gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25")
content = content.replace("gap: '3px', overflow: 'hidden', fontSize: '12px', color: '#000', lineHeight: 1.2", "gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25")
content = content.replace("fontSize: '12px', padding: '4px', margin: '4px 0'", "fontSize: '13px', padding: '8px 4px', margin: '8px 0'")
content = content.replace("fontSize: '9px', fontStyle: 'italic', fontWeight: 700, lineHeight: 1.2", "fontSize: '9px', fontStyle: 'italic', fontWeight: 700, lineHeight: 1.35")

# Revert print CSS
content = re.sub(r'\.page \{\s*width: 100%;\s*height: 100vh;\s*padding: 0;', '.page {\n  width: ${pgW};\n  height: ${pgH};\n  padding: 0;', content)
content = re.sub(r'gap: 0;\s*padding: 2mm;', 'gap: 5px;\n  padding: 5px;', content)
content = re.sub(r'\.card \{\s*border: 1.5px solid #111;\s*padding: 6px 10px;', '.card {\n  border: 1.5px solid #111;\n  padding: 10px 14px;', content)
content = re.sub(r'\.logo img \{\s*height: 60px; max-width: 100%; object-fit: contain; margin-top: -10px;', '.logo img {\n  height: 70px; max-width: 100%; object-fit: contain; margin-top: -17px;', content)
content = re.sub(r'font-size: 15px; line-height: 1.2;\s*padding: 4px 6px; border-radius: 0; margin-top: -10px;', 'font-size: 15px; line-height: 1.3;\n  padding: 6px 8px; border-radius: 0; margin-top: -20px;', content)
content = content.replace("font-size: 19px; margin: 4px 0 2px; color: #000;", "font-size: 20px; margin: 8px 0 4px; color: #000;")
content = content.replace("margin: 0 8px 4px; flex-shrink: 0;", "margin: 0 8px 8px; flex-shrink: 0;")
content = re.sub(r'\.specs \{ flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 3px; color: #000;\}', '.specs { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; color: #000;}', content)
content = re.sub(r'\.spec \{ font-size: 12px; line-height: 1.2; \}', '.spec { font-size: 12.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }', content)
content = re.sub(r'font-size: 12px; line-height: 1.3;\s*padding: 4px; border-radius: 0; margin: 4px 0;', 'font-size: 13px; line-height: 1.4;\n  padding: 8px 4px; border-radius: 0; margin: 8px 0;', content)
content = re.sub(r'\.policy \{\s*font-size: 9px; font-style: italic; font-weight: 700; color: #000;\s*line-height: 1.2; flex-shrink: 0;\s*\}\s*\.policy div \{ \}', '.policy {\n  font-size: 9px; font-style: italic; font-weight: 700; color: #000;\n  line-height: 1.35; flex-shrink: 0;\n}\n.policy div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }', content)

# Revert UI Grid
content = re.sub(r"gap: '0px',\s*padding: '2mm',", "gap: '5px',\n              padding: '5px',", content)

with open('src/pages/BangGia/TrangBangGia.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
