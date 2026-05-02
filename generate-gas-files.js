import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const outputDir = path.join(distDir, 'gas_deployment');
const backendSrc = path.resolve('src', 'backend', 'Code.js');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if assets exist
if (!fs.existsSync(assetsDir)) {
  console.error("Assets directory not found. Run 'npm run build' first.");
  process.exit(1);
}

// Find CSS and JS files
const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error("Could not find CSS or JS files in assets directory");
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
const jsContentRaw = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const jsContent = jsContentRaw
  .replace(/<\/script>/g, '\\x3C/script>')
  .replace(/<\?/g, '\\x3C?')
  .replace(/\?>/g, '?\\x3E');

// 1. Create Stylesheet.html
const styleHtml = `<style>\n${cssContent}\n</style>`;
fs.writeFileSync(path.join(outputDir, 'Stylesheet.html'), styleHtml);

// 2. Create JavaScript.html (Single File - Safe Loader Pattern)
// We use type="text/plain" to prevent GAS from parsing the minified code as HTML/Script immediately.
const jsHtml = `<script id="app-bundle" type="text/plain">\n${jsContent}\n</script>`;
fs.writeFileSync(path.join(outputDir, 'JavaScript.html'), jsHtml);

// 3. Create Index.html
const indexHtmlIndices = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IDO Dashboard</title>
    <?!= include('Stylesheet'); ?>
  </head>
  <body>
    <div id="root"></div>

    <!-- Load the bundle as text -->
    <?!= include('JavaScript'); ?>

    <!-- Execute the bundle -->
    <script>
      (function() {
        var bundle = document.getElementById('app-bundle');
        if (bundle) {
          var script = document.createElement('script');
          script.textContent = bundle.textContent;
          document.body.appendChild(script);
          bundle.remove(); // Clean up memory
        } else {
          console.error("Critical: App bundle not found.");
          document.body.innerHTML = "<h3>Erro: Falha ao carregar a aplicação (Bundle não encontrado).</h3>";
        }
      })();
    </script>
  </body>
</html>`;
fs.writeFileSync(path.join(outputDir, 'Index.html'), indexHtmlIndices);

// 4. Create Code.gs (Read from src/backend/Code.js)
let codeGs = '';
if (fs.existsSync(backendSrc)) {
  console.log(`Reading backend code from ${backendSrc}`);
  codeGs = fs.readFileSync(backendSrc, 'utf-8');
} else {
  console.warn("⚠️ Warning: src/backend/Code.js not found. Using minimal fallback.");
  codeGs = `
var SPREADSHEET_ID = "112o3WtHcNaPjMWqMbSTot_LCsgwktf-FdIx3KuDVjmA";
function doGet(e) { return HtmlService.createTemplateFromFile('Index').evaluate(); }
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
`;
}

fs.writeFileSync(path.join(outputDir, 'Code.gs'), codeGs);

console.log("✅ Successfully created modular deployment files in dist/gas_deployment/");
console.log("   - Index.html");
console.log("   - Stylesheet.html");
console.log(`   - JavaScript.html`);
console.log("   - Code.gs");
