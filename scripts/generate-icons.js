import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'public/icon_512_pro.png';
const outputDir = 'public';

const sizes = [192, 512];

async function generate() {
  if (!fs.existsSync(input)) {
    console.error(`Source image ${input} not found!`);
    process.exit(1);
  }

  for (const size of sizes) {
    const fileName = `icon-${size}.png`;
    const outputPath = path.join(outputDir, fileName);
    
    await sharp(input)
      .resize(size, size)
      .toFile(outputPath);
      
    console.log(`Generated ${outputPath}`);
  }

  // Generate a smaller one for favicon
  await sharp(input)
    .resize(32, 32)
    .toFile(path.join(outputDir, 'favicon-32.png'));
  console.log('Generated favicon-32.png');
}

generate().catch(console.error);
