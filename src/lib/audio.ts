export type FftOption = 512 | 1024 | 2048 | 4096 | 8192;

export const FFT_SIZES: FftOption[] = [512, 1024, 2048, 4096, 8192];

export function clampFrequency(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getFrequencyAtBin(
  binIndex: number,
  sampleRate: number,
  frequencyBinCount: number,
) {
  return (binIndex * sampleRate) / (frequencyBinCount * 2);
}

export function findPeakFrequency(
  data: Uint8Array,
  sampleRate: number,
  frequencyBinCount: number,
  minFrequency = 0,
  maxFrequency = sampleRate / 2,
) {
  let peakIndex = 0;
  let peakValue = -1;

  for (let i = 0; i < data.length; i += 1) {
    const frequency = getFrequencyAtBin(i, sampleRate, frequencyBinCount);
    if (frequency < minFrequency || frequency > maxFrequency) continue;
    if (data[i] > peakValue) {
      peakValue = data[i];
      peakIndex = i;
    }
  }

  return {
    frequency: getFrequencyAtBin(peakIndex, sampleRate, frequencyBinCount),
    level: Math.max(0, peakValue),
  };
}
