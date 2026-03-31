import { useMemo, useState } from "react";
import { SpectrumCanvas } from "./components/SpectrumCanvas";
import { useFftAnalyser } from "./hooks/useFftAnalyser";
import { FFT_SIZES, clampFrequency, findPeakFrequency } from "./lib/audio";

const FREQUENCY_RANGES = [1000, 2000, 5000, 10000, 20000];

function App() {
  const { status, errorMessage, fftSize, data, sampleRate, start, stop, setFftSize } =
    useFftAnalyser();
  const [maxFrequency, setMaxFrequency] = useState(5000);

  const peak = useMemo(() => {
    return findPeakFrequency(data, sampleRate, data.length, 0, maxFrequency);
  }, [data, maxFrequency, sampleRate]);

  const inputLevel = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((total, value) => total + value, 0);
    return Math.round(sum / data.length);
  }, [data]);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Client-side FFT Monitor</p>
        <h1>FFT Web App</h1>
        <p className="description">
          マイク入力をブラウザ内でFFT解析し、周波数スペクトルをリアルタイム表示します。
        </p>
      </section>

      <section className="panel spectrum-panel">
        <div className="panel-header">
          <div>
            <h2>Spectrum</h2>
            <p>0Hz - {clampFrequency(maxFrequency, 1000, sampleRate / 2).toLocaleString()}Hz</p>
          </div>
          <span className={`status-badge status-${status}`}>{status}</span>
        </div>
        <SpectrumCanvas data={data} sampleRate={sampleRate} maxFrequency={maxFrequency} />
      </section>

      <section className="panel metrics-grid">
        <article className="metric-card">
          <span className="metric-label">Peak Frequency</span>
          <strong>{Math.round(peak.frequency).toLocaleString()} Hz</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Input Level</span>
          <strong>{inputLevel} / 255</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">FFT Size</span>
          <strong>{fftSize}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Sample Rate</span>
          <strong>{Math.round(sampleRate).toLocaleString()} Hz</strong>
        </article>
      </section>

      <section className="panel controls">
        <div className="button-row">
          <button className="primary" onClick={() => void start()} type="button">
            開始
          </button>
          <button className="secondary" onClick={() => void stop()} type="button">
            停止
          </button>
        </div>

        <label className="control">
          <span>FFTサイズ</span>
          <select
            onChange={(event) => setFftSize(Number(event.target.value) as (typeof FFT_SIZES)[number])}
            value={fftSize}
          >
            {FFT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <label className="control">
          <span>表示上限周波数</span>
          <select
            onChange={(event) => setMaxFrequency(Number(event.target.value))}
            value={maxFrequency}
          >
            {FREQUENCY_RANGES.map((range) => (
              <option key={range} value={range}>
                {range.toLocaleString()} Hz
              </option>
            ))}
          </select>
        </label>

        <p className="note">
          初回利用時はブラウザのマイク許可が必要です。音声データは保存・送信しません。
        </p>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  );
}

export default App;
