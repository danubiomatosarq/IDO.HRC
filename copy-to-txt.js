import fs from 'fs';
import path from 'path';

const srcJs = path.join('dist', 'gas_deployment', 'JavaScript.html');
const destJs = path.join('TXT', 'JavaScript.html.txt');

const srcCss = path.join('dist', 'gas_deployment', 'Stylesheet.html');
const destCss = path.join('TXT', 'Stylesheet.html.txt');

// Copy JS
if (fs.existsSync(srcJs)) {
    fs.copyFileSync(srcJs, destJs);
    console.log('✅ Copiado JavaScript.html para TXT/JavaScript.html.txt');
} else {
    console.error('❌ JavaScript.html não encontrado na pasta dist/gas_deployment');
}

// Copy CSS
if (fs.existsSync(srcCss)) {
    fs.copyFileSync(srcCss, destCss);
    console.log('✅ Copiado Stylesheet.html para TXT/Stylesheet.html.txt');
} else {
    console.error('❌ Stylesheet.html não encontrado na pasta dist/gas_deployment');
}

console.log('Pronto! Os arquivos na pasta TXT foram atualizados.');
