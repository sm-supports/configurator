#!/usr/bin/env node

/**
 * This script adds compatibility flags to the generated worker file
 * to ensure Node.js compatibility in Cloudflare Pages
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');

// Check if the worker file exists
if (!fs.existsSync(workerPath)) {
  console.error('Worker file not found at:', workerPath);
  process.exit(1);
}

// Read the worker file
let workerContent = fs.readFileSync(workerPath, 'utf-8');

// Add compatibility settings at the top of the file
const compatibilityHeader = `// Cloudflare compatibility settings
// @cloudflare-compatibility-date 2025-03-25
// @cloudflare-compatibility-flag nodejs_compat

`;

// Only add if not already present
if (!workerContent.includes('@cloudflare-compatibility-flag')) {
  workerContent = compatibilityHeader + workerContent;
  fs.writeFileSync(workerPath, workerContent, 'utf-8');
  console.log('✅ Added nodejs_compat compatibility flag to worker');
} else {
  console.log('✅ Compatibility flags already present in worker');
}
