const fs = require('fs');
const js = fs.readFileSync('D:/Users/giordane/.gemini/antigravity/scratch/ido_dashboard/JavaScript.txt', 'utf8');

function findContext(str, radius) {
  const indexes = [];
  let idx = js.indexOf(str);
  while(idx !== -1) {
    indexes.push(idx);
    idx = js.indexOf(str, idx + 1);
  }
  if(indexes.length === 0) {
      console.log(`No match for: ${str}`);
  }
  indexes.forEach((i, j) => {
    const start = Math.max(0, i - radius);
    const end = Math.min(js.length, i + str.length + radius);
    console.log(`\n--- Match ${j+1} for "${str}" ---`);
    console.log(js.substring(start, end));
  });
}

findContext("Suas Estratégias para o Ciclo", 1000);
findContext("O que fizemos de bom", 1000);
findContext("Rodar", 500);
findContext("Registrar Estrat", 500);
