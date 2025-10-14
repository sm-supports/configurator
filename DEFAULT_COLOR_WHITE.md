# Default Color Change to White

## Change Summary

Changed default colors from **black (#000000)** to **white (#ffffff)** for:
1. ✅ Paint tools (brush, airbrush, spray)
2. ✅ Text elements

## Files Modified

### 1. EditorContext.tsx (Line 141)

**Paint Settings Default Color**

```typescript
// BEFORE:
paintSettings: {
  color: '#000000',  // Black
  brushSize: 10,
  opacity: 1.0,
  brushType: 'brush'
}

// AFTER:
paintSettings: {
  color: '#ffffff',  // White
  brushSize: 10,
  opacity: 1.0,
  brushType: 'brush'
}
```

**Location**: `/src/components/Editor/core/context/EditorContext.tsx`  
**Line**: 141  
**Impact**: All paint tools (brush, airbrush, spray) now start with white color by default

### 2. useElementManipulation.ts (Line 43)

**Text Element Default Color**

```typescript
// BEFORE:
const newText: TextElement = {
  // ...
  color: '#000000',  // Black
  // ...
};

// AFTER:
const newText: TextElement = {
  // ...
  color: '#ffffff',  // White
  // ...
};
```

**Location**: `/src/components/Editor/hooks/useElementManipulation.ts`  
**Line**: 43  
**Impact**: New text elements created with "Add Text" button now default to white

## What This Changes

### Paint Tools
When user selects brush, airbrush, or spray:
- **Before**: Started with black color (#000000)
- **After**: Starts with white color (#ffffff)
- **Effect**: Paint is now visible on dark backgrounds by default

### Text Elements
When user clicks "Add Text" button:
- **Before**: New text appeared in black (#000000)
- **After**: New text appears in white (#ffffff)
- **Effect**: Text is now visible on dark license plate backgrounds

## User Experience Impact

### Before
```
User opens editor
  ↓
Selects paint tool → black paint (invisible on dark background)
Adds text → black text (invisible on dark background)
Must manually change color to white
```

### After
```
User opens editor
  ↓
Selects paint tool → white paint (visible on dark background) ✅
Adds text → white text (visible on dark background) ✅
Can optionally change color if needed
```

## Why White as Default?

1. **License plates typically have dark backgrounds** (UK plates, many custom plates)
2. **Better contrast** - White shows well on most dark colors
3. **Professional appearance** - White text/paint is standard for license plates
4. **User expectation** - Most users expect white as default for plate customization

## Color Picker Still Works

Users can still change colors:
- **Paint color picker** in toolbar (works for all brush types)
- **Text color picker** in properties panel
- Colors are **per-element** (not global)
- Each paint stroke and text element remembers its own color

## Verification Checklist

Test the defaults:

1. ✅ **Open editor fresh**
   - Paint color picker shows white (#ffffff)

2. ✅ **Select brush tool**
   - Paint with white by default
   - Visible on dark backgrounds

3. ✅ **Select airbrush tool**
   - Paint with white by default
   - Glow effect visible

4. ✅ **Select spray tool**
   - Paint with white by default
   - Dots visible on dark backgrounds

5. ✅ **Click "Add Text"**
   - New text appears in white
   - Visible on dark backgrounds

6. ✅ **Change colors**
   - Color picker still works
   - Can select any color from palette

## Technical Details

### State Initialization

The defaults are set during state initialization:
```typescript
useState<EditorState>({
  // ... other state
  paintSettings: {
    color: '#ffffff',  // ← Initial paint color
    // ...
  }
})
```

### Element Creation

Text elements get the default during creation:
```typescript
const newText: TextElement = {
  // ...
  color: '#ffffff',  // ← New text color
  // ...
};
```

### Color Persistence

Each element/stroke stores its own color:
- **Paint elements**: `element.color` from `paintSettings.color`
- **Text elements**: `element.color` set at creation
- Colors **don't change** when default is changed
- Only **new elements** use the new default

## Color Format

Using hex color format:
- `#ffffff` = White (RGB: 255, 255, 255)
- `#000000` = Black (RGB: 0, 0, 0)
- Fully opaque (alpha = 1.0)
- Compatible with all browsers and Konva

## Related Components

These components use the colors:

**Paint Rendering:**
- `PaintElement.tsx` - Reads `element.color`
- `Canvas.tsx` - Live preview uses `state.paintSettings.color`

**Text Rendering:**
- `TextElement.tsx` - Reads `element.color`
- Toolbar color picker updates via `updateElement()`

**Color Pickers:**
- `Toolbar.tsx` - Paint color picker (line 274)
- Properties panel - Text color picker (context-dependent)

## Backward Compatibility

**Existing designs** with black elements are **not affected**:
- Saved designs load with their stored colors
- Only **new elements** created after this change default to white
- Users can still create black elements by changing the color picker

## Result

🎨 **Better default user experience:**
- ✅ Paint tools start with white color
- ✅ New text starts with white color
- ✅ Visible on dark backgrounds immediately
- ✅ Users can still customize colors freely
- ✅ No breaking changes to existing designs

White is now the default for better visibility on typical license plate backgrounds! ✨
