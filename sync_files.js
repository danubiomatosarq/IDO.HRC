const fs = require('fs');
const path = require('path');

const filesToSync = [
  { src: 'TXT/JavaScript.html.txt', dest: 'JavaScript.html' },
  { src: 'TXT/Stylesheet.html.txt', dest: 'Stylesheet.html' },
  { src: 'TXT/RadarRiscos.jsx.html.txt', dest: 'src/components/RadarRiscos.jsx' },
  { src: 'TXT/PDSAManager.jsx.txt', dest: 'src/components/modules/PDSAManager/PDSAManager.jsx' }
];

filesToSync.forEach(file => {
  const srcPath = path.resolve(__dirname, file.src);
  const destPath = path.resolve(__dirname, file.dest);
  
  if (fs.existsSync(srcPath)) {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(srcPath, destPath);
    console.log(`Synced: ${file.src} -> ${file.dest}`);
  } else {
    console.error(`Source not found: ${file.src}`);
  }
});
