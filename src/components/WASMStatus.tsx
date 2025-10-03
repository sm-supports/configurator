'use client';

import { useEffect, useState } from 'react';
import { getWASMStatus } from '@/lib/wasmBridge';

/**
 * WASM Status Display Component
 * Shows whether WebAssembly is loaded and active for canvas operations
 */
export function WASMStatusDisplay() {
  const [status, setStatus] = useState({
    isLoaded: false,
    isSupported: false,
    isActive: false,
    message: 'Checking...'
  });

  useEffect(() => {
    // Check status after a short delay to allow WASM to initialize
    const timer = setTimeout(() => {
      const wasmStatus = getWASMStatus();
      setStatus(wasmStatus);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {status.isActive ? (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          ) : status.isSupported ? (
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          ) : (
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {status.isActive ? '⚡ WASM Active' : '🔄 JavaScript Mode'}
          </div>
          <div className="text-xs text-gray-600">
            {status.message}
          </div>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <span className={status.isSupported ? 'text-green-600' : 'text-red-600'}>
                {status.isSupported ? '✓' : '✗'}
              </span>
              <span>WebAssembly Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={status.isLoaded ? 'text-green-600' : 'text-yellow-600'}>
                {status.isLoaded ? '✓' : '○'}
              </span>
              <span>Module Loaded</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={status.isActive ? 'text-green-600' : 'text-gray-400'}>
                {status.isActive ? '✓' : '○'}
              </span>
              <span>Acceleration Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline WASM Status Badge (smaller, for toolbar)
 */
export function WASMStatusBadge() {
  const [status, setStatus] = useState({
    isActive: false,
    message: 'Checking...'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const wasmStatus = getWASMStatus();
      setStatus(wasmStatus);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
        status.isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-yellow-100 text-yellow-800'
      }`}
      title={status.message}
    >
      {status.isActive ? (
        <>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>WASM</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
          <span>JS</span>
        </>
      )}
    </div>
  );
}
