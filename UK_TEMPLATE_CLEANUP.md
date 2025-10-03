# UK Standard Template - Placeholder Text Removal

## Overview

Removed the placeholder text "ABC 123" from the UK Standard template image generator.

## What Changed

**File**: `public/generate-templates.html`

### Before
The UK Standard template had placeholder text rendered on it:
```javascript
// Sample plate text
ctx.fillStyle = '#000000';
ctx.font = 'bold 60px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('ABC 123', canvas.width / 2 + 20, canvas.height / 2);
```

### After
The template is now clean without any placeholder text - just the yellow background, black border, blue EU strip with stars, and "GB" text.

## How to Update the Template

1. Open `public/generate-templates.html` in your browser
2. Click the "Download UK Standard" button
3. Save the new `uk-standard.png` file
4. Replace the existing file in `public/templates/uk-standard.png`

## Result

✅ UK Standard template is now clean and ready for users to add their own text and designs  
✅ No distracting placeholder text  
✅ Professional blank template appearance

**Template Features Retained**:
- Yellow background (#FFCC00)
- Black border
- Blue EU strip on left side
- Yellow stars in EU strip
- "GB" text at bottom of EU strip

**Date**: October 3, 2025  
**Status**: ✅ Completed
