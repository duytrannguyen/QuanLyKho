const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\DONG DUY\\.gemini\\antigravity-ide\\brain\\77d23339-7cfd-4993-88d2-266d5b90d053\\.system_generated\\logs\\transcript_full.jsonl';

async function processLineByLine() {
  const fileStream = fs.createReadStream(transcriptPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('export default function TrangNhapMayMoc() {') && line.includes('TrangNhapMayMoc.jsx')) {
      const data = JSON.parse(line);
      // It's a view_file output.
      if (data.type === 'TOOL_CALL_RESPONSE') {
          console.log("Found in tool response!");
          fs.writeFileSync('e:\\QKSHOP\\QL_Kho\\backend\\extracted.txt', data.content, 'utf8');
          break;
      }
    }
  }
}

processLineByLine();
