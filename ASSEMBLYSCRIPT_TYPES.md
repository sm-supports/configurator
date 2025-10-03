# AssemblyScript Type Declarations

## Overview

This document explains the type declaration file created to resolve VS Code TypeScript language server errors when working with AssemblyScript files.

## The Problem

AssemblyScript uses specialized types and built-in functions that are not part of standard TypeScript:
- Numeric types: `i8`, `u8`, `i16`, `u16`, `i32`, `u32`, `i64`, `u64`, `f32`, `f64`, `isize`, `usize`
- Boolean type: `bool`
- Special types: `StaticArray<T>`
- Built-in functions: `changetype<T>()`, `heap.alloc()`, etc.
- Type conversion: Using types as functions (e.g., `f64(value)`)

When opening AssemblyScript `.ts` files in VS Code, the TypeScript language server reports errors because it doesn't recognize these types.

## The Solution

Created: `wasm/assembly/assemblyscript.d.ts`

This TypeScript declaration file provides type definitions for AssemblyScript's built-in types and functions, allowing VS Code's language server to understand the code without affecting the actual AssemblyScript compilation.

### Key Features

1. **Type Aliases**: Maps AssemblyScript numeric types to TypeScript equivalents
   ```typescript
   declare type i32 = number;
   declare type f64 = number;
   declare type bool = boolean;
   ```

2. **Type Conversion Functions**: Allows using types as conversion functions
   ```typescript
   declare function f64(value: any): f64;
   declare function i32(value: any): i32;
   ```

3. **StaticArray**: Declares the AssemblyScript-specific array type
   ```typescript
   declare class StaticArray<T> {
     constructor(size?: i32);
     [key: number]: T;
     readonly length: i32;
   }
   ```

4. **Built-in Functions**: Provides declarations for AssemblyScript runtime functions
   ```typescript
   declare function changetype<T>(value: any): T;
   declare namespace heap {
     function alloc(size: usize): usize;
     function free(ptr: usize): void;
   }
   ```

## Important Notes

1. **Editor-Only**: These declarations are **only for VS Code's TypeScript language server**. They do not affect AssemblyScript compilation.

2. **Compilation**: The actual WASM compilation uses the AssemblyScript compiler (`asc`), which has its own built-in type system.

3. **No Impact on Runtime**: This file is never included in the compiled WASM modules.

4. **Maintenance**: If you use additional AssemblyScript features, you may need to add corresponding declarations to this file.

## Compilation Commands

The AssemblyScript files are compiled separately using:

```bash
# Development build (includes debug info)
npx asc wasm/assembly/canvas-performance.ts \
  --target debug \
  --outFile public/wasm/canvas-performance.wasm

# Production build (optimized)
npx asc wasm/assembly/canvas-performance.ts \
  --target release \
  --outFile public/wasm/canvas-performance.wasm \
  --optimize
```

Or use the npm script:
```bash
npm run asbuild
```

## Benefits

✅ **No Editor Errors**: VS Code no longer shows red squiggles in AssemblyScript files  
✅ **Better IntelliSense**: Autocomplete and type hints work correctly  
✅ **Correct Compilation**: AssemblyScript compiler works exactly as before  
✅ **Better Developer Experience**: Cleaner code editor without false errors  

## Related Files

- `wasm/assembly/canvas-performance.ts` - Main AssemblyScript source
- `wasm/assembly/assemblyscript.d.ts` - Type declarations (this file)
- `public/wasm/canvas-performance.wasm` - Compiled WASM output
- `src/lib/wasmBridge.ts` - TypeScript bridge to WASM
