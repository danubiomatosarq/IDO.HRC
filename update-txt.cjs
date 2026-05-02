const fs = require('fs');
const path = require('path');

const assetsDir = 'dist/assets';

// Find files automatically by extension
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

if (!jsFile || !cssFile) {
    console.error('❌ Erro: Arquivos do build não encontrados em ' + assetsDir);
    process.exit(1);
}

console.log(`📦 Usando JS: ${jsFile}`);
console.log(`🎨 Usando CSS: ${cssFile}`);

// Read the build outputs
const js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

// Wrap JS with the script tag format expected by Apps Script
const wrappedJs = `<script id="app-bundle" type="text/plain">\n${js}\n</script>`;
fs.writeFileSync('TXT/JavaScript.html.txt', wrappedJs, 'utf8');
console.log('✅ TXT/JavaScript.html.txt atualizado');

// Wrap CSS with the style tag format expected by Apps Script
const wrappedCss = `<style>\n${css}\n</style>`;
fs.writeFileSync('TXT/Stylesheet.html.txt', wrappedCss, 'utf8');
console.log('✅ TXT/Stylesheet.html.txt atualizado');

console.log('\nPronto! Os arquivos na pasta TXT foram atualizados.');
