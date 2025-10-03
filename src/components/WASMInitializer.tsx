'use client';

import { useEffect, useState } from 'react';
import { initializeWASM } from '@/lib/wasmBridge';

/**
 * Client-side component to initialize WebAssembly module
 * This should be rendered early in the app lifecycle
 */
export function WASMInitializer() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[WASM] Initializing WebAssembly module...');
        const success = await initializeWASM();
        
        if (success) {
          console.log('[WASM] ✅ WebAssembly module loaded successfully');
        } else {
          console.log('[WASM] ⚠️  WebAssembly not available, using JavaScript fallback');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[WASM] ❌ Failed to initialize:', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // This component doesn't render anything visible
  // It just initializes WASM in the background
  if (error) {
    console.warn('[WASM] Continuing with JavaScript fallback due to error:', error);
  }

  return null;
}
