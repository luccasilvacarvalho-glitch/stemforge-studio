import { decodeAudioFile, computePeaks } from '@/utils/audio';
import { audioBufferToWav } from '@/services/export/exportService';
import { RecordedTrack } from '@/types/recording';
import { defaultChannelStrip } from '@/types/stems';

/**
 * Real microphone capture, using MediaRecorder for the raw capture (which
 * has solid browser support and doesn't require a custom AudioWorklet)
 * and Web Audio's decodeAudioData to convert the result into the same
 * AudioBuffer/WAV pipeline the rest of the app already uses (export,
 * waveform peaks, playback).
 *
 * This does NOT depend on any third-party service - it is entirely local
 * (mic → browser → WAV), which fits a solo-artist "just get it recorded"
 * workflow rather than a full multi-mic studio setup.
 */
export class AudioRecorderService {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private monitorCtx: AudioContext | null = null;
  private monitorNode: MediaStreamAudioSourceNode | null = null;
  private monitorGain: GainNode | null = null;

  async requestPermission(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
  }

  /** Route the raw mic input to the speakers so the artist can hear themselves while recording. */
  enableMonitoring(enabled: boolean, volume = 0.6) {
    if (!this.stream) return;

    if (enabled) {
      if (!this.monitorCtx) {
        this.monitorCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      this.monitorNode = this.monitorCtx.createMediaStreamSource(this.stream);
      this.monitorGain = this.monitorCtx.createGain();
      this.monitorGain.gain.value = volume;
      this.monitorNode.connect(this.monitorGain).connect(this.monitorCtx.destination);
    } else {
      this.monitorNode?.disconnect();
      this.monitorGain?.disconnect();
      this.monitorNode = null;
      this.monitorGain = null;
    }
  }

  start() {
    if (!this.stream) throw new Error('Permissão de microfone não concedida ainda.');
    this.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : '';
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /**
   * Stops recording, decodes the captured audio, and returns a
   * ready-to-use RecordedTrack (WAV-encoded, with waveform peaks
   * already computed) so it can be dropped straight into the mixer.
   */
  async stop(startOffsetSec: number): Promise<RecordedTrack> {
    if (!this.recorder) throw new Error('Gravação não foi iniciada.');

    const stopped = new Promise<void>((resolve) => {
      this.recorder!.onstop = () => resolve();
    });
    this.recorder.stop();
    await stopped;

    const rawBlob = new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' });
    const file = new File([rawBlob], 'recording.webm', { type: rawBlob.type });
    const buffer = await decodeAudioFile(file);

    const wavBytes = audioBufferToWav(buffer);
    const wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
    const fileUrl = URL.createObjectURL(wavBlob);

    const mono = averageChannels(buffer);
    const peaks = computePeaks(mono, Math.max(1, Math.floor(buffer.sampleRate / 100)));

    return {
      id: `recording-${crypto.randomUUID()}`,
      label: `Recording ${new Date().toLocaleTimeString()}`,
      fileUrl,
      meta: {
        durationSec: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        format: 'audio/wav'
      },
      waveform: peaks,
      strip: defaultChannelStrip(),
      createdAt: new Date().toISOString(),
      startOffsetSec
    };
  }

  release() {
    this.enableMonitoring(false);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.monitorCtx?.close().catch(() => {});
    this.monitorCtx = null;
  }
}

function averageChannels(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}
