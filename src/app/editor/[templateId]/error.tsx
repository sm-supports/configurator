"use client";

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Error occurred in editor - could be logged to error reporting service here
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong in the editor</h2>
      <p className="text-gray-600 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
