const fs = require('fs');
let c = fs.readFileSync('src/components/RadarRiscos.jsx', 'utf8');
c = c.replace(/slate-/g, 'gray-');
c = c.replace(/className="w-4 h-20 bg-(red|amber|emerald)-500 rounded-full mr-5/g, 'className="w-4 h-20 bg-$1-500 rounded-full mr-5 shrink-0');
fs.writeFileSync('src/components/RadarRiscos.jsx', c);
console.log('Fixed RadarRiscos CSS');
