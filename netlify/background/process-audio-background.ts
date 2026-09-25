import type { Handler } from '@netlify/functions';

/**
 * Netlify Background Function (note the `-background` suffix, which
 * Netlify requires to run it with a 15-minute timeout instead of the
 * standard 10-second limit - see spec section 20).
 *
 * TODO: CONNECT REAL MODEL
 * This is where the real, long-running work belongs:
 *   1. Read the uploaded audio (from temporary storage - see section 23).
 *   2. Call SEPARATION_API_URL (Demucs-compatible service) with
 *      SEPARATION_API_KEY to get vocals/drums/bass/other stems.
 *   3. Call DRUM_MODEL_API_URL with DRUM_MODEL_API_KEY to transcribe the
 *      isolated drum stem, or fall back to the in-browser
 *      HeuristicDrumProvider logic ported to Node if no model is
 *      configured.
 *   4. Write progress + final outputs back into the job store
 *      (`getStore('stemforge-jobs')` from @netlify/blobs) so job-status.ts
 *      can report it to the client.
 *   5. Clean up any temporary files (spec section 23).
 *
 * Background functions cannot return a response body to the original
 * caller - the client always finds out the result via job-status polling.
 */
export const handler: Handler = async (event) => {
  const { jobId } = JSON.parse(event.body || '{}');
  if (!jobId) return { statusCode: 400, body: 'Missing jobId' };

  // Intentionally left as a stub - see TODOs above.
  return { statusCode: 202, body: 'Accepted' };
};
