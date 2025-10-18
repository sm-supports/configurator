# Image Filename Display in Layers Panel

## Summary
Enhanced the Layers Panel to display the actual filename of uploaded images instead of the generic "Image" label, making it easier for users to identify and manage their images.

## Problem
Previously, when users uploaded multiple images to the canvas, the Layers Panel showed all images with the generic label "Image", making it difficult to distinguish between different uploaded files.

## Solution
Added a `filename` property to the `ImageElement` interface and updated the image upload process to capture and store the original filename. The Layers Panel now displays the actual filename for each image.

## Changes Made

### 1. **Type Definition** - `/src/types/index.ts`

Added optional `filename` property to the `ImageElement` interface:

```typescript
export interface ImageElement extends DesignElement {
  type: 'image';
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  filename?: string;  // NEW: Store original filename
}
```

### 2. **Image Upload Hook** - `/src/components/Editor/hooks/useElementManipulation.ts`

Updated the `addImage` function to capture and store the filename:

```typescript
const newImage: ImageElement = {
  id: uuidv4(),
  type: 'image',
  imageUrl: e.target?.result as string,
  x: centerX,
  y: centerY,
  width: targetW,
  height: targetH,
  originalWidth: img.width,
  originalHeight: img.height,
  filename: file.name,  // NEW: Capture filename from File object
  zIndex: state.elements.length,
  visible: true,
  locked: false,
  flippedH: false,
  flippedV: false
};
```

### 3. **Image Service** - `/src/components/Editor/services/EditorImageService.ts`

Updated the `processUserImage` method to include filename:

```typescript
const element: ImageElement = {
  id: uuidv4(),
  type: 'image',
  imageUrl: dataURL,
  x,
  y,
  width: targetW,
  height: targetH,
  originalWidth: img.width,
  originalHeight: img.height,
  filename: file.name,  // NEW: Include filename in processed image
  zIndex: 0,
  visible: true,
  locked: false,
  flippedH: false,
  flippedV: false
};
```

### 4. **Layers Panel** - `/src/components/Editor/ui/panels/LayersPanel.tsx`

**Import Update:**
```typescript
import { TextElement, ImageElement } from '@/types';
```

**Display Logic Update:**
```typescript
const getElementLabel = (element: Element): string => {
  if (element.type === 'text') {
    const textEl = element as TextElement;
    return textEl.text?.substring(0, 20) || 'Text';
  } else if (element.type === 'image') {
    const imageEl = element as ImageElement;
    return imageEl.filename || 'Image';  // NEW: Display filename or fallback to 'Image'
  } else if (element.type === 'paint') {
    return 'Paint Stroke';
  }
  return 'Element';
};
```

## User Experience

### Before
```
Layers Panel:
├── Image
├── Image
├── Image
└── Text: Hello World
```
❌ Difficult to identify which image is which

### After
```
Layers Panel:
├── photo-1.jpg
├── logo.png
├── background.webp
└── Text: Hello World
```
✅ Easy to identify each image by its filename

## Features

1. **Automatic Filename Capture**: When users upload an image, the original filename is automatically captured from the File object
2. **Fallback Handling**: If filename is not available (e.g., for legacy data), it falls back to displaying "Image"
3. **Full Filename Display**: Shows the complete filename including extension (e.g., "photo.jpg", "logo.png")
4. **Backwards Compatible**: Optional property ensures existing designs without filenames still work

## Benefits

1. **Better Organization**: Users can easily identify uploaded images in the layers panel
2. **Improved Workflow**: Quickly locate specific images when working with multiple files
3. **Professional Experience**: Matches behavior of professional design tools (Figma, Photoshop, etc.)
4. **File Management**: Makes it easier to track which source files were used in the design

## Technical Details

### Property Type
- **Type**: `string | undefined`
- **Optional**: Yes (backwards compatible with existing designs)
- **Source**: Captured from `File.name` property during upload
- **Storage**: Stored in the design JSON alongside other image properties

### Display Logic
1. Check if the element is an image type
2. Cast to `ImageElement` to access typed properties
3. Use `filename` property if available, otherwise fallback to "Image"
4. Display in layers panel alongside icon and controls

### Validation
- No special validation needed - filename comes directly from browser File API
- Filenames are sanitized by the browser before reaching JavaScript
- Optional property means missing filenames won't cause errors

## Testing Checklist

- ✅ Upload single image → filename appears in layers panel
- ✅ Upload multiple images → each shows its own filename
- ✅ Upload images with various extensions (.jpg, .png, .gif, .webp) → all display correctly
- ✅ Upload image with long filename → displays without breaking UI
- ✅ Load existing design without filename property → fallback to "Image" works
- ✅ Save and reload design → filenames persist correctly
- ✅ TypeScript compilation → no type errors
- ✅ No breaking changes to existing functionality

## Future Enhancements

1. **Filename Truncation**: For very long filenames, show truncated version with tooltip
2. **Rename Capability**: Allow users to rename images in the layers panel
3. **File Type Icons**: Show different icons based on file extension (JPG, PNG, etc.)
4. **File Size Display**: Optionally show file size information
5. **Duplicate Detection**: Highlight when multiple copies of same filename exist

## Files Modified

1. `/src/types/index.ts` - Added `filename` property to ImageElement interface
2. `/src/components/Editor/hooks/useElementManipulation.ts` - Capture filename in addImage
3. `/src/components/Editor/services/EditorImageService.ts` - Include filename in processUserImage
4. `/src/components/Editor/ui/panels/LayersPanel.tsx` - Display filename in layer label

## Notes

- The filename property is optional to maintain backwards compatibility
- Filenames are stored exactly as provided by the browser File API
- No file path information is stored, only the filename itself
- This feature enhances usability without changing any core functionality
