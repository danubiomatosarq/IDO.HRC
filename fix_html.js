const fs = require('fs');
let txt = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', 'utf8');
txt = txt.replace('<script id="app-bundle" type="text/plain">\n<script id="app-bundle" type="text/plain">', '<script id="app-bundle" type="text/plain">');
fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', txt);
console.log(txt.substring(0, 80));
