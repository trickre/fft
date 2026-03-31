import { useEffect, useRef } from "react";

type SpectrumCanvasProps = {
  data: Uint8Array;
  sampleRate: number;
  maxFrequency: number;
};

export function SpectrumCanvas({
  data,
  sampleRate,
  maxFrequency,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    context.fillStyle = "#081521";
    context.fillRect(0, 0, rect.width, rect.height);

    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = (rect.height / 4) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(rect.width, y);
      context.stroke();
    }

    const frequencyPerBin = sampleRate / (data.length * 2);
    const visibleBins = Math.max(1, Math.floor(maxFrequency / frequencyPerBin));
    const barCount = Math.min(visibleBins, data.length);
    const barWidth = rect.width / barCount;

    for (let i = 0; i < barCount; i += 1) {
      const value = data[i] / 255;
      const height = value * rect.height;
      const x = i * barWidth;
      const y = rect.height - height;

      context.fillStyle = `hsl(${200 - value * 140} 90% ${45 + value * 20}%)`;
      context.fillRect(x, y, Math.max(1, barWidth - 1), height);
    }
  }, [data, maxFrequency, sampleRate]);

  return <canvas className="spectrum-canvas" ref={canvasRef} />;
}
