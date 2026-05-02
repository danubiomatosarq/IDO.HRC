const fs = require('fs');

let js = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80/JavaScript.txt', 'utf8');

const headerFind = 'v.jsx("header",{className:"bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between shadow-sm sticky top-0 z-50"';
const headerReplace = 'v.jsx("header",{className:"bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-center text-center shadow-sm sticky top-0 z-50"';

const navFind = 'v.jsxs("div",{className:"flex items-center justify-between h-14",children:[v.jsx("nav",{className:"flex space-x-2 overflow-x-auto no-scrollbar"';
const navReplace = 'v.jsxs("div",{className:"flex items-center justify-between h-14",children:[v.jsx("nav",{className:"flex-1 flex justify-center space-x-4 overflow-x-auto no-scrollbar"';

js = js.replace(headerFind, headerReplace);
js = js.replace(navFind, navReplace);

const outJsHtml = '<script id="app-bundle" type="text/plain">\n' + js + '\n</script>';
fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', outJsHtml);

const css = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80/Stylesheet.txt', 'utf8');
const outCssHtml = '<style>\n' + css + '\n</style>';
fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/Stylesheet.html', outCssHtml);

fs.copyFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80/Index.html.txt', 'D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/Index.html');

console.log('Script ran successfully!');
