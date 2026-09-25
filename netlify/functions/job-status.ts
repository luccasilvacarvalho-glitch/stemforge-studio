import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { JobRecord } from '../../src/types/project';

/**
 * GET /api/jobs/:id
 *
 * Returns { status, progress, currentStage, outputs } as required by
 * spec section 20. The frontend's RemoteDemucsProvider polls this.
 *
 * TODO: CONNECT REAL MODEL
 * Real status should be written by the background function as it calls
 * the external separation/drum-transcription APIs. Until that's wired
 * up, this function fakes progression so the contract/UI can be tested.
 */
export const handler: Handler = async (event) => {
  const jobId = event.path.split('/').pop();
  if (!jobId) return { statusCode: 400, body: 'Missing job id' };

  const store = getStore('stemforge-jobs');
  const existing = (await store.get(jobId, { type: 'json' })) as JobRecord | null;

  if (!existing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  }

  // Simulated progression purely so the polling contract can be exercised
  // end-to-end before a real model is connected (see file header).
  const elapsedMs = Date.now() - new Date((existing as any).createdAt ?? 0).getTime();
  const simulatedPct = Math.min(100, Math.floor(elapsedMs / 100));

  const updated: JobRecord = {
    jobId,
    status: simulatedPct >= 100 ? 'completed' : 'processing',
    progress: simulatedPct,
    currentStage: simulatedPct >= 100 ? 'ready' : 'separating_stems',
    outputs:
      simulatedPct >= 100
        ? { isMock: true, note: 'TODO: CONNECT REAL MODEL - replace with real provider output' }
        : undefined
  };

  await store.setJSON(jobId, updated);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  };
};
