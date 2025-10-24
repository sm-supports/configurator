/**
 * Worker wrapper to ensure nodejs_compat is enabled
 * This file will be prepended to the generated worker
 */

export default {
  async fetch(request, env, ctx) {
    // Import the actual worker
    const worker = await import('./_worker.js');
    return worker.default.fetch(request, env, ctx);
  }
};

export const config = {
  compatibility_date: "2025-03-25",
  compatibility_flags: ["nodejs_compat"]
};
