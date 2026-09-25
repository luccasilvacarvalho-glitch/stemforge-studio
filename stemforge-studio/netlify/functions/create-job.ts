import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * POST /api/jobs
 *
 * Creates a job record and (in the real pipeline) triggers the
 * `process-audio` Background Function to do the actual heavy lifting -
 * stem separation via SEPARATION_API_URL and drum transcription via
 * DRUM_MODEL_API_URL (see spec sections 20-22, .env.example).
 *
 * TODO: CONNECT REAL MODEL
 * This function currently only creates the job record; it does not yet
 * upload the incoming file to temporary storage or invoke a real
 * inference endpoint. Wire that up here, then have
 * netlify/background/process-audio poll/consume it.
 *
 * Uses Netlify Blobs as a minimal job store so job status survives across
 * function invocations without a separate database.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const jobId = crypto.randomUUID();
  const store = getStore('stemforge-jobs');

  await store.setJSON(jobId, {
    jobId,
    status: 'queued',
    progress: 0,
    currentStage: 'uploading',
    createdAt: new Date().toISOString()
  });

  // TODO: CONNECT REAL MODEL - invoke the background function here, e.g.
  //   await fetch(`${process.env.URL}/.netlify/functions/process-audio-background`, {
  //     method: 'POST',
  //     body: JSON.stringify({ jobId })
  //   });
  // For now the job stays "queued" until job-status simulates completion,
  // so the frontend can be developed against a stable contract.

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, status: 'queued' })
  };
};
