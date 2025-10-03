/**
 * AssemblyScript type declarations for VS Code TypeScript language server
 * These types are built into AssemblyScript but not recognized by standard TypeScript
 */

// Numeric types
declare type i8 = number;
declare type u8 = number;
declare type i16 = number;
declare type u16 = number;
declare type i32 = number;
declare type u32 = number;
declare type i64 = bigint;
declare type u64 = bigint;
declare type f32 = number;
declare type f64 = number;
declare type isize = number;
declare type usize = number;
declare type bool = boolean;

// Type conversion functions (AssemblyScript allows types to be used as conversion functions)
declare function i8(value: any): i8;
declare function u8(value: any): u8;
declare function i16(value: any): i16;
declare function u16(value: any): u16;
declare function i32(value: any): i32;
declare function u32(value: any): u32;
declare function i64(value: any): i64;
declare function u64(value: any): u64;
declare function f32(value: any): f32;
declare function f64(value: any): f64;
declare function isize(value: any): isize;
declare function usize(value: any): usize;
declare function bool(value: any): bool;

// Built-in functions
declare function changetype<T>(value: any): T;

// Memory access functions
declare function load<T>(ptr: usize, offset?: usize): T;
declare function store<T>(ptr: usize, value: T, offset?: usize): void;

// StaticArray type (AssemblyScript allows size parameter in constructor)
declare class StaticArray<T> {
  constructor(size?: i32);
  [key: number]: T;
  readonly length: i32;
  static fromArray<T>(arr: T[]): StaticArray<T>;
  static slice<T>(array: StaticArray<T>, start?: i32, end?: i32): StaticArray<T>;
}

// Heap memory functions
declare namespace heap {
  function alloc(size: usize): usize;
  function free(ptr: usize): void;
}

// Math extensions for AssemblyScript
declare namespace Mathf {
  export function abs(x: f32): f32;
  export function ceil(x: f32): f32;
  export function floor(x: f32): f32;
  export function sqrt(x: f32): f32;
  export function min(a: f32, b: f32): f32;
  export function max(a: f32, b: f32): f32;
  export function sin(x: f32): f32;
  export function cos(x: f32): f32;
  export function atan2(y: f32, x: f32): f32;
  export function random(): f32;
}

// Memory operations
declare namespace memory {
  export function size(): i32;
  export function grow(delta: i32): i32;
  export function copy(dest: usize, src: usize, n: usize): void;
  export function fill(dest: usize, value: u8, n: usize): void;
}

// Atomic operations
declare namespace atomic {
  export namespace load {
    function i32(ptr: usize, offset?: usize): i32;
    function i64(ptr: usize, offset?: usize): i64;
  }
  export namespace store {
    function i32(ptr: usize, value: i32, offset?: usize): void;
    function i64(ptr: usize, value: i64, offset?: usize): void;
  }
}
