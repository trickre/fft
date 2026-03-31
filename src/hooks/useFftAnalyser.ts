import { useEffect, useRef, useState } from "react";
import { FFT_SIZES, type FftOption } from "../lib/audio";

type Status = "idle" | "requesting" | "running" | "stopped" | "error";

type AnalyzerState = {
  status: Status;
  errorMessage: string | null;
  fftSize: FftOption;
  data: Uint8Array;
  sampleRate: number;
};

const DEFAULT_FFT_SIZE: FftOption = 2048;

export function useFftAnalyser() {
  const [state, setState] = useState<AnalyzerState>({
    status: "idle",
    errorMessage: null,
    fftSize: DEFAULT_FFT_SIZE,
    data: new Uint8Array(DEFAULT_FFT_SIZE / 2),
    sampleRate: 44100,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopLoop = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const teardown = async () => {
    stopLoop();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
    }

    sourceRef.current = null;
    analyserRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
  };

  const runLoop = () => {
    const analyser = analyserRef.current;
    const audioContext = audioContextRef.current;
    if (!analyser || !audioContext) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(frequencyData);
      setState((prev) => ({
        ...prev,
        data: frequencyData.slice(),
        sampleRate: audioContext.sampleRate,
      }));
      frameRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  const start = async () => {
    try {
      setState((prev) => ({
        ...prev,
        status: "requesting",
        errorMessage: null,
      }));

      await teardown();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = state.fftSize;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -20;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);

      mediaStreamRef.current = mediaStream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      analyserRef.current = analyser;

      setState((prev) => ({
        ...prev,
        status: "running",
        sampleRate: audioContext.sampleRate,
        data: new Uint8Array(analyser.frequencyBinCount),
      }));

      runLoop();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "マイクの初期化に失敗しました。";
      await teardown();
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: message,
      }));
    }
  };

  const stop = async () => {
    await teardown();
    setState((prev) => ({
      ...prev,
      status: "stopped",
    }));
  };

  const setFftSize = (nextFftSize: FftOption) => {
    if (!FFT_SIZES.includes(nextFftSize)) return;

    setState((prev) => ({
      ...prev,
      fftSize: nextFftSize,
      data: new Uint8Array(nextFftSize / 2),
    }));

    if (analyserRef.current) {
      analyserRef.current.fftSize = nextFftSize;
    }
  };

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    setFftSize,
  };
}
