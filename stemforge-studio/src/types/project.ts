import { AudioAnalysis } from './audio';
import { StemSeparationResult } from './stems';
import { DrumEvent } from './drums';

export type GridSubdivision = 4 | 8 | 16 | 32;
export type SnapMode = 'off' | 4 | 8 | 16 | 32;

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'analyzing_audio'
  | 'separating_stems'
  | 'analyzing_drums'
  | 'detecting_bpm'
  | 'creating_grid'
  | 'ready'
  | 'failed';

export interface ProcessingProgress {
  stage: ProcessingStage;
  progressPct: number; // 0..100 for the current stage
  message?: string;
  error?: string;
}

export interface ProjectFile {
  version: '0.1';
  name: string;
  createdAt: string;
  sourceFileName: string;
  analysis: AudioAnalysis;
  stems: Omit<StemSeparationResult, never> | null;
  drumEvents: DrumEvent[];
  grid: {
    subdivision: GridSubdivision;
    snap: SnapMode;
  };
}

export interface JobRecord {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage: ProcessingStage;
  outputs?: Record<string, unknown>;
  error?: string;
}
