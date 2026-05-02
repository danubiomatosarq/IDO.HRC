const fs = require('fs');

// Read the new build outputs
const js = fs.readFileSync('dist/assets/index-BkHnKd_q.js', 'utf8');
const css = fs.readFileSync('dist/assets/index-CEx8JoeK.css', 'utf8');

// Wrap JS with the script tag format expected by Apps Script
const wrappedJs = `<script id="app-bundle" type="text/plain">\n${js}\n</script>`;
fs.writeFileSync('TXT/JavaScript.html.txt', wrappedJs, 'utf8');
console.log('✅ TXT/JavaScript.html.txt updated (' + (wrappedJs.length / 1024).toFixed(1) + ' KB)');

// Wrap CSS with the style tag format expected by Apps Script
const wrappedCss = `<style>\n${css}\n</style>`;
fs.writeFileSync('TXT/Stylesheet.html.txt', wrappedCss, 'utf8');
console.log('✅ TXT/Stylesheet.html.txt updated (' + (wrappedCss.length / 1024).toFixed(1) + ' KB)');

console.log('\nDone! Both TXT files are ready for Apps Script deployment.');
