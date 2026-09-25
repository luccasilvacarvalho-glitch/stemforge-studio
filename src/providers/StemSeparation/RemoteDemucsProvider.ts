import { StemSeparationProvider } from './types';
import { StemSeparationResult } from '@/types/stems';

/**
 * Real provider: delegates separation to an external Demucs-compatible
 * inference service via the Netlify job-queue endpoints (see spec section
 * 20). It never talks to the inference API directly from the browser -
 * that call, and its API key, live server-side (netlify/functions).
 *
 * TODO: CONNECT REAL MODEL
 * The Netlify Function `create-job` currently returns a stub job that the
 * background function marks "completed" without calling a real model.
 * Point SEPARATION_API_URL / SEPARATION_API_KEY (Netlify env vars) at a
 * running Demucs-compatible endpoint (e.g. a Replicate deployment or a
 * self-hosted inference server) and implement the fetch call inside
 * netlify/background/process-audio.
 */
export class RemoteDemucsProvider implements StemSeparationProvider {
  readonly name = 'Demucs (remote)';
  readonly isMock = false;

  async separate(
    audioFile: File,
    onProgress?: (pct: number) => void
  ): Promise<StemSeparationResult> {
    const form = new FormData();
    form.append('file', audioFile);
    form.append('task', 'stem-separation');

    const createRes = await fetch('/api/jobs', { method: 'POST', body: form });
    if (!createRes.ok) {
      throw new Error(`Failed to create separation job: ${createRes.status}`);
    }
    const { jobId } = await createRes.json();

    return await pollJobUntilDone(jobId, onProgress);
  }
}

async function pollJobUntilDone(
  jobId: string,
  onProgress?: (pct: number) => void
): Promise<StemSeparationResult> {
  const pollIntervalMs = 2000;
  const maxAttempts = 300; // 10 minutes ceiling

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Job status check failed: ${res.status}`);
    const job = await res.json();

    onProgress?.(job.progress ?? 0);

    if (job.status === 'completed') {
      return job.outputs as StemSeparationResult;
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Stem separation job failed');
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error('Stem separation job timed out');
}
