/**
 * Generate placeholder template images using canvas
 * Run with: node scripts/generate-template-images.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const templatesDir = path.join(__dirname, '../public/templates');

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

function createPlaceholderImage(width, height, bgColor, textColor, text, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${Math.floor(height * 0.2)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(templatesDir, filename);
  fs.writeFileSync(filepath, buffer);
  
  console.log(`✓ Created ${filename} (${width}x${height})`);
}

console.log('Creating placeholder template images...\n');

// UK Standard plate - yellow background, black text
createPlaceholderImage(520, 110, '#FFCC00', '#000000', 'UK STANDARD', 'uk-standard.png');

// US Standard plate - white background, blue text
createPlaceholderImage(600, 300, '#FFFFFF', '#0055A4', 'USA STANDARD', 'us-standard.png');

// US Motorcycle plate - white background, blue text (smaller)
createPlaceholderImage(400, 200, '#FFFFFF', '#0055A4', 'USA MOTORCYCLE', 'us-motorcycle.png');

console.log('\n✓ All template placeholder images created successfully!');
console.log('\nNote: These are basic placeholder images.');
console.log('Replace them with actual license plate template images for production.\n');
