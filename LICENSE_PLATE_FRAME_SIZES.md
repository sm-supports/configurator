# License Plate Frame Size Selection Feature

## Overview
Added support for multiple license plate frame sizes with a dropdown selector in the toolbar. Users can now switch between three different frame sizes: Slim, Std (Standard), and XL.

## Changes Made

### 1. Frame Files
The following frame files are used:
- **Slim**: `/license-plate-frame.png` (existing file)
- **Std**: `/license-plate-frame-std.png` (new file)
- **XL**: `/license-plate-frame-xl.png` (new file)

### 2. Type Definitions (`src/components/Editor/core/types.ts`)
- Added `FrameSize` type: `'slim' | 'std' | 'xl'`
- Added `frameSize` property to `EditorState` interface with default value of `'slim'`

### 3. Editor Context (`src/components/Editor/core/context/EditorContext.tsx`)
- Added `frameSize: 'slim'` to the initial state
- Added `changeFrameSize` function to update both state and load the new frame image
- Exposed `changeFrameSize` in the context value and type definition
- Updated dependencies array to include `changeFrameSize`

### 4. Image Service (`src/components/Editor/services/EditorImageService.ts`)
- Added `currentFrameSize` property to track the selected frame size
- Added `getFrameUrl(size)` method to map frame sizes to file paths:
  - `'slim'` → `/license-plate-frame.png`
  - `'std'` → `/license-plate-frame-std.png`
  - `'xl'` → `/license-plate-frame-xl.png`
- Added `changeFrameSize(size)` method to:
  - Update `currentFrameSize`
  - Load the new frame image
  - Trigger the `onImageLoad` callback to update the context
- Updated `loadTemplateImages()` to use `getFrameUrl()` for loading the initial frame
- Exposed `changeFrameSize` in the `useEditorImageService` hook

### 5. Editor Component (`src/components/Editor/Editor.tsx`)
- Imported `changeFrameSize` from the editor context
- Passed `changeFrameSize` prop to the `Toolbar` component

### 6. Toolbar Component (`src/components/Editor/ui/panels/Toolbar.tsx`)
- Added `changeFrameSize` prop to `ToolbarProps` interface
- Added `showFrameSizeDropdown` state and `frameSizeDropdownRef` ref
- Added click-outside handler to close the frame size dropdown
- Added Frame Size dropdown UI next to the layer toggle with:
  - Display of current frame size (Small/Std/XL)
  - ChevronDown icon to indicate dropdown
  - Dropdown menu with three options (Small, Std, XL)
  - Visual highlight of the currently selected size
  - Async click handlers that call `changeFrameSize` and close the dropdown

## User Experience

### Location
The frame size selector is located in the top toolbar, to the right of the Base/Plate layer toggle switch.

### Functionality
1. The dropdown shows the currently selected frame size (Slim, Std, or XL)
2. Clicking the dropdown reveals all three size options
3. Clicking a size option:
   - Loads the corresponding frame image
   - Updates the canvas to display the new frame
   - Updates the state to track the selected size
   - Closes the dropdown
4. The currently selected size is highlighted in the dropdown

### Visual Design
- Integrated seamlessly with the existing toolbar design
- Uses the same styling as other toolbar controls
- Dropdown matches the theme with slate colors and hover effects
- Active selection is highlighted with blue accent color

## Technical Notes

### Frame Loading
- Frame images are loaded asynchronously to prevent UI blocking
- The image service handles loading errors gracefully
- The editor continues to work even if a frame fails to load

### State Management
- Frame size is part of the EditorState and can be saved with designs
- Changes to frame size trigger a re-render of the canvas
- The selected frame persists across undo/redo operations

### Performance
- Frame images are cached after initial load
- Switching between sizes only requires loading the new image once
- SVG frames (Std and XL) provide scalable quality

## Future Enhancements
- Could add frame size to saved design data for persistence
- Could add keyboard shortcuts for quick frame size switching
- Could add preview thumbnails in the dropdown
- Could add custom frame upload capability
