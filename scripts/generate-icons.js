const fs = require('fs');
const path = require('path');

async function main(){
  let sharp;
  try{
    sharp = require('sharp');
  }catch(e){
    console.error('Error: sharp not found. Run `npm install` to add it.');
    process.exit(1);
  }

  const appsDir = path.join(__dirname, '..', 'apps');
  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  for(const e of entries){
    if(!e.isDirectory()) continue;
    const svgPath = path.join(appsDir, e.name, 'icon.svg');
    if(!fs.existsSync(svgPath)) continue;
    const pngPath = path.join(appsDir, e.name, 'icon.png');
    try{
      console.log(`Converting ${svgPath} -> ${pngPath}`);
      const data = await sharp(svgPath).resize(512,512).png({compressionLevel:9}).toBuffer();
      fs.writeFileSync(pngPath, data);
      console.log(`  ✓ Saved ${pngPath}`);
    }catch(err){
      console.error(`Failed to convert ${svgPath}:`, err.message || err);
    }
  }
}

main().catch(err=>{ console.error(err); process.exit(1)});
