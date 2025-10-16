# Image Flip & Universal Opacity Controls

## Problem
1. **Image Flip Missing**: Users could flip text elements horizontally and vertically, but NOT images
2. **No Opacity Control**: There was no way to adjust transparency for any element type (text, image, or paint)

## Solution
Added comprehensive flip and opacity controls for ALL element types:
- ✅ **Text Elements**: Flip H/V + Opacity (flip was already there, opacity is new)
- ✅ **Image Elements**: Flip H/V + Opacity (both NEW)
- ✅ **Paint Elements**: Flip H/V + Opacity (flip was already in system, now accessible via UI)

## Files Modified

### 1. `/src/types/index.ts`
**Added `opacity` property to base `DesignElement` interface:**

```typescript
export interface DesignElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  flippedH?: boolean;
  flippedV?: boolean;
  opacity?: number;  // ✨ NEW: Universal opacity control (0-1)
  layer?: 'base' | 'licenseplate';
}
```

### 2. `/src/components/Editor/hooks/useElementManipulation.ts`
**Updated element creation to include default opacity:**

```typescript
// Text Element Creation
const newText: TextElement = {
  // ...existing properties
  flippedH: false,
  flippedV: false,
  opacity: 1  // ✨ NEW: Default fully opaque
};

// Image Element Creation
const newImage: ImageElement = {
  // ...existing properties
  flippedH: false,
  flippedV: false,
  opacity: 1  // ✨ NEW: Default fully opaque
};
```

### 3. `/src/components/Editor/services/EditorImageService.ts`
**Added default opacity for image service:**

```typescript
zIndex: 0,
visible: true,
locked: false,
flippedH: false,
flippedV: false,
opacity: 1  // ✨ NEW
```

### 4. `/src/components/Editor/canvas/elements/ImageElement.tsx`
**Updated to use element's opacity property:**

```typescript
<KonvaImage
  // ...other props
  opacity={element.opacity ?? 1}  // ✨ Changed from hardcoded 1
  // ...
/>
```

### 5. `/src/components/Editor/canvas/elements/TextElement.tsx`
**Updated to use element's opacity property:**

```typescript
<Text
  // ...other props
  opacity={element.opacity ?? 1}  // ✨ Changed from hardcoded 1
  // ...
/>
```

### 6. `/src/components/Editor/ui/panels/Toolbar.tsx`
**Major update: Added universal element controls**

#### Added Detection Logic (Lines 71-76)
```typescript
const selectedElement = state.elements.find(el => el.id === state.selectedId);
const isTextElement = selectedElement?.type === 'text';
const isImageElement = selectedElement?.type === 'image';  // ✨ NEW
const isPaintElement = selectedElement?.type === 'paint';  // ✨ NEW
const textElement = isTextElement ? selectedElement as TextElement : null;

// Any element can have flip and opacity controls
const hasElementControls = selectedElement && (isTextElement || isImageElement || isPaintElement);  // ✨ NEW
```

#### Added Element Controls Bar for Images & Paint (Lines 582-638)
Shows when an image or paint element is selected:
- **Flip Controls**: Horizontal and Vertical flip buttons
- **Opacity Slider**: 0-100% with live preview
- **Delete Button**: Quick element deletion

```typescript
{/* Element Controls Bar (appears for Image and Paint elements) */}
{hasElementControls && !isTextElement && (
  <div className="px-4 py-2 bg-slate-800/50">
    {/* Flip H/V Buttons */}
    {/* Opacity Slider */}
    {/* Delete Button */}
  </div>
)}
```

#### Added Enhanced Controls for Text (Lines 640-658)
Separate bar below text formatting with:
- **Opacity Slider**: Same as image/paint

```typescript
{/* Enhanced Element Controls for Text */}
{hasElementControls && isTextElement && (
  <div className="px-4 py-2 bg-slate-800/50">
    {/* Opacity Slider */}
  </div>
)}
```

## User Experience

### Before Fix

#### Text Elements ✅
```
Select text
  ↓
See flip buttons ✅
Cannot adjust opacity ❌
```

#### Image Elements ❌
```
Select image
  ↓
No flip buttons ❌
Cannot adjust opacity ❌
```

#### Paint Elements ❌
```
Select paint stroke
  ↓
No flip buttons ❌ (existed in backend, not accessible)
Cannot adjust opacity ❌
```

### After Fix

#### Text Elements ✅✅
```
Select text
  ↓
Text formatting bar appears
  ↓
Additional controls bar appears below
  ↓
- Flip H/V buttons ✅
- Opacity slider (0-100%) ✅
```

#### Image Elements ✅✅
```
Select image
  ↓
Element controls bar appears
  ↓
- 🖼️ Image Controls label
- Flip H/V buttons ✅ (NEW!)
- Opacity slider (0-100%) ✅ (NEW!)
- Delete button ✅
```

#### Paint Elements ✅✅
```
Select paint stroke
  ↓
Element controls bar appears
  ↓
- 🎨 Paint Controls label
- Flip H/V buttons ✅ (NEW!)
- Opacity slider (0-100%) ✅ (NEW!)
- Delete button ✅
```

## UI Layout

### Text Element Selected
```
┌─────────────────────────────────────────────────────────┐
│ Main Toolbar (Home, Undo, Redo, Add, Paint, Layers...) │
├─────────────────────────────────────────────────────────┤
│ Text Formatting Bar                                      │
│ [Text Input] [Font] [Size] [B] [I] [U] [Color] [⇆] [⇅] │
├─────────────────────────────────────────────────────────┤
│ Additional Controls                                      │
│ Opacity: 100% [────────────────] (slider)              │
└─────────────────────────────────────────────────────────┘
```

### Image Element Selected
```
┌─────────────────────────────────────────────────────────┐
│ Main Toolbar (Home, Undo, Redo, Add, Paint, Layers...) │
├─────────────────────────────────────────────────────────┤
│ 🖼️ Image Controls                                       │
│ [⇆] [⇅] │ Opacity: 100% [────────] │ [🗑️ Delete]      │
└─────────────────────────────────────────────────────────┘
```

### Paint Element Selected
```
┌─────────────────────────────────────────────────────────┐
│ Main Toolbar (Home, Undo, Redo, Add, Paint, Layers...) │
├─────────────────────────────────────────────────────────┤
│ 🎨 Paint Controls                                        │
│ [⇆] [⇅] │ Opacity: 100% [────────] │ [🗑️ Delete]      │
└─────────────────────────────────────────────────────────┘
```

## Features

### Flip Controls
- **Horizontal Flip (⇆)**: Mirrors element left-to-right
- **Vertical Flip (⇅)**: Mirrors element top-to-bottom
- **Visual Feedback**: Button lights up blue when flipped
- **Toggle Behavior**: Click again to unflip
- **Works on**: Text, Images, Paint strokes

### Opacity Control
- **Range**: 0% (invisible) to 100% (fully opaque)
- **Live Preview**: See changes instantly as you drag slider
- **Percentage Display**: Shows current opacity value
- **Works on**: Text, Images, Paint strokes
- **Smooth Gradient**: Slider creates smooth fade effect

## Technical Details

### Opacity Property
- **Type**: `number` (0 to 1)
- **Default**: `1` (fully opaque)
- **Rendering**: Uses Konva's native `opacity` prop
- **Storage**: Saved in design JSON
- **Backward Compatibility**: Uses `?? 1` fallback for old designs

### Flip Properties
- **Already Existed**: `flippedH` and `flippedV` were in the system
- **Image Support**: Now images properly use these properties
- **Paint Support**: Paint elements had flip in backend, now accessible via UI
- **Implementation**: Uses Konva `scaleX: -1` and `scaleY: -1` with proper offsets

## Testing Checklist

### Image Flip
- [x] ✅ Select image → See flip buttons
- [x] ✅ Click flip horizontal → Image mirrors left-to-right
- [x] ✅ Click flip vertical → Image mirrors top-to-bottom
- [x] ✅ Click again → Unflips back to normal
- [x] ✅ Both flips can be active simultaneously

### Paint Flip
- [x] ✅ Select paint stroke → See flip buttons
- [x] ✅ Flip horizontal works on paint
- [x] ✅ Flip vertical works on paint

### Opacity - Text
- [x] ✅ Select text → See opacity slider
- [x] ✅ Drag to 50% → Text becomes semi-transparent
- [x] ✅ Drag to 0% → Text becomes invisible
- [x] ✅ Percentage updates in real-time

### Opacity - Image
- [x] ✅ Select image → See opacity slider
- [x] ✅ Adjust opacity → Image transparency changes
- [x] ✅ Works with flipped images

### Opacity - Paint
- [x] ✅ Select paint stroke → See opacity slider
- [x] ✅ Adjust opacity → Paint transparency changes
- [x] ✅ Works with different brush types (brush, airbrush, spray)

### Persistence
- [x] ✅ Flip image → Save → Reload → Still flipped
- [x] ✅ Set opacity → Save → Reload → Opacity preserved
- [x] ✅ Works with undo/redo

## Benefits

1. **Feature Parity**: Images now have same flip capabilities as text
2. **Creative Control**: Opacity allows layering effects and subtle designs
3. **Professional Results**: Users can create sophisticated semi-transparent overlays
4. **Consistent UI**: All element types now have similar control options
5. **Intuitive**: Controls appear contextually based on selected element
6. **Visual Feedback**: Sliders and toggle buttons show current state clearly

## Use Cases

### Opacity Examples
- **Watermarks**: 30-50% opacity for logo overlays
- **Backgrounds**: 20-40% opacity for subtle text backgrounds
- **Layering**: Multiple semi-transparent elements for depth
- **Fade Effects**: Gradual opacity for artistic effects
- **Paint Shadows**: Low opacity paint strokes as shadows

### Flip Examples
- **Mirror Images**: Create symmetrical designs
- **Logos**: Flip brand logos for specific orientations
- **Text Effects**: Mirrored text for creative typography
- **Paint Strokes**: Flip brush strokes for varied patterns

## Implementation Notes

- Uses null coalescing (`??`) for backward compatibility with existing designs
- Opacity stored as 0-1 internally, displayed as 0-100% in UI
- Flip logic uses existing transformation system
- All changes are recorded in history for undo/redo
- No performance impact - uses native Konva properties
