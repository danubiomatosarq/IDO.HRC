const fs = require('fs');
const js = fs.readFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', 'utf8');

const matches = js.match(/useState\(['"]2025-02['"]\)/g);
if (matches) {
    console.log('Matches:', matches.length);
    let newJs = js;
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const idx = newJs.indexOf(m);
        console.log('Context:', newJs.substring(idx - 50, idx + 100));
        
        // I will replace all useState("2025-02") with useState("")
        newJs = newJs.replace(m, 'useState("")');
    }
    fs.writeFileSync('D:/Users/giordane/Downloads/IDO VERSÃO 80 CORRIGIDA/JavaScript.html', newJs);
    console.log('Replaced and saved');
} else {
    console.log('No matches found for useState("2025-02")');
}
