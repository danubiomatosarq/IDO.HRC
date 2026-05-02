const fs = require('fs');

// Fix JavaScript.html
let jsTxt = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', 'utf8');
jsTxt = jsTxt.replace('<script id="app-bundle" type="text/plain">\n<script id="app-bundle" type="text/plain">', '<script id="app-bundle" type="text/plain">');
fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', jsTxt);
console.log('Fixed JavaScript.html');

// Fix Stylesheet.html
let cssTxt = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/Stylesheet.html', 'utf8');
cssTxt = cssTxt.replace('<style>\n<style>', '<style>');
fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/Stylesheet.html', cssTxt);
console.log('Fixed Stylesheet.html');
