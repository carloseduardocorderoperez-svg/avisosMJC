const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'dist-public', 'index.html');
try {
  const html = fs.readFileSync(p, 'utf8');
  const re = /<script>([\s\S]*?)<\/script>/;
  const m = html.match(re);
  if (!m) {
    console.error('NO_SCRIPT_TAG_FOUND');
    process.exit(2);
  }
  const script = m[1];
  try {
    new Function(script);
    console.log('SCRIPT_OK');
    process.exit(0);
  } catch (e) {
    console.error('SYNTAX_ERROR', e && e.message);
    // write the script to a temp file for inspection
    try { fs.writeFileSync(path.join(__dirname, 'extracted_script.js'), script, 'utf8'); console.error('WROTE', path.join(__dirname, 'extracted_script.js')); } catch (ee) {}
    process.exit(1);
  }
} catch (err) {
  console.error('READ_ERROR', err && err.message);
  process.exit(3);
}
