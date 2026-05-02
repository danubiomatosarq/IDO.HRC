
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

// Find CSS and JS files
const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

if (!cssFile || !jsFile) {
    console.error("Could not find CSS or JS files in assets directory");
    process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

// Basic HTML template (since we are replacing the original index.html completely to be safe)
const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IDO Dashboard</title>
    <style>
      ${cssContent}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      ${jsContent}
    </script>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
console.log("Successfully merged assets into dist/index.html");
