---
name: realtime-ecg-canvas
description: High-performance medical waveform rendering using HTML5 Canvas 2D and WebGL. Renders multi-lead ECG signals (P-Q-R-S-T) at 60 FPS on standard medical millimetric grids (25mm/s, 10mm/mV) with real-time streaming via Server-Sent Events (SSE) or WebSockets without UI thread freezing.
origin: Biomedical Signal Processing & Web Graphics Engineering
---

# Realtime ECG Waveform Canvas Engineering Protocol

A specialized standard for AI agents building high-frequency biomedical signal visualization for clinical dashboards, cardiology review stations, and tele-health portals.

---

## When to Activate

Activate this skill whenever:
- Rendering electrocardiogram (ECG / EKG) waveforms or multi-lead cardiac monitoring data.
- Visualizing continuous, high-frequency time-series streams (250Hz - 1000Hz sampling rates).
- Building medical-grade charts that require standardized physical grid scaling (25 mm/s and 10 mm/mV).
- Preventing browser UI thread freezing, memory leaks, or GC pauses caused by streaming chart updates.
- Implementing Web Worker ingestion for Server-Sent Events (SSE) or binary WebSocket buffers.

---

## 1. Why DOM / SVG / Chart.js Fail for ECG

- **The Data Volume Bottleneck:** A standard 12-lead ECG sampled at 500 Hz produces **6,000 data points per second**. Over a 10-minute review session, that exceeds **3.6 million data points**.
- **The SVG / DOM Trap:** Libraries like Chart.js, Recharts, or D3 (SVG mode) create DOM nodes for each point or path segment. At 50,000 nodes, the browser's style recalculation and layout engine drop to < 5 FPS, locking up the clinical interface.
- **The Solution:** **Direct-to-Buffer Rendering via HTML5 Canvas 2D Context or WebGL** combined with a **Sweep-Bar (Erase Bar)** pattern or static chunk tiling.

---

## 2. Medical Grid Standardization (AHA / IEC Standards)

Standard clinical ECG paper runs at fixed physical dimensions:
- **Paper Speed:** `25 mm/second` (Horizontal X-Axis).
- **Voltage Calibration:** `10 mm/mV` (Vertical Y-Axis = 1.0 mV per 10 mm).
- **Minor Grid (Small box):** `1 mm x 1 mm` = `0.04 seconds` (40 ms) x `0.1 mV`.
- **Major Grid (Large box):** `5 mm x 5 mm` = `0.20 seconds` (200 ms) x `0.5 mV`.

```
        0.04s (1mm)
       ◄───►
   ┌───┬───┬───┬───┬───┐ ▲
   │   │   │   │   │   │ │ 0.1 mV (1mm)
   ├───┼───┼───┼───┼───┤ ▼
   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┤
   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┤
   │   │   │   │   │   │
   ├───┼───┼───┼───┼───┤
   │   │   │   │   │   │
   └───┴───┴───┴───┴───┘ ▲
   ◄───────────────────► │ 0.5 mV (5mm)
        0.20s (5mm)      ▼
```

---

## 3. High-Performance Canvas 2D Architecture

### 3.1. Layered Canvas Pattern (Static Grid vs Dynamic Signal)
Never redraw the medical grid on every animation frame! Use **two layered HTML5 canvases**:
1. **Background Canvas (Static):** Renders the pink/red millimeter grid **once**. Cached as a bitmap.
2. **Foreground Canvas (Dynamic):** Only renders the moving ECG green/black signal path with `requestAnimationFrame`.

### 3.2. Sweep-Bar Rendering Pattern (Hospital Bedside Monitor)
Instead of scrolling the entire canvas horizontally (which consumes heavy CPU/GPU bandwidth), draw a moving vertical **Sweep Line**:
- Old data is erased 10 pixels ahead of the sweep line.
- The signal advances from left to right; when it hits the right edge, it wraps around to the left.

---

## 4. Production-Grade React Component Implementation

```tsx
// components/ECGMonitor.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface ECGMonitorProps {
  streamUrl?: string; // SSE endpoint
  width?: number;
  height?: number;
  samplingRate?: number; // e.g., 250 Hz
}

export const ECGMonitor: React.FC<ECGMonitorProps> = ({
  streamUrl = '/api/v1/ecg/stream',
  width = 800,
  height = 300,
  samplingRate = 250,
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataBuffer = useRef<number[]>([]);
  const currentX = useRef<number>(0);
  const lastY = useRef<number>(height / 2);

  // 1. Render Static Medical Grid (Once)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFF8F8'; // Light clinical ivory/pink paper background
    ctx.fillRect(0, 0, width, height);

    // Minor Grid (1mm = 5px at 100 DPI)
    ctx.strokeStyle = '#FED7D7'; // Pink minor line
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Major Grid (5mm = 25px)
    ctx.strokeStyle = '#FEB2B2'; // Darker pink major line
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 25) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 25) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }, [width, height]);

  // 2. Stream Data via Server-Sent Events (SSE)
  useEffect(() => {
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const samples: number[] = JSON.parse(event.data); // Array of mV values
      dataBuffer.current.push(...samples);
    };

    return () => {
      eventSource.close();
    };
  }, [streamUrl]);

  // 3. 60 FPS Sweep Animation Loop
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const pixelsPerSample = (25 * (width / 200)) / samplingRate; // Scale based on width
      const baselineY = height / 2;
      const scaleY = (height / 2) * 0.4; // 1mV amplitude scaling

      ctx.strokeStyle = '#059669'; // Clinical Emerald Green
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Process samples accumulated in buffer
      while (dataBuffer.current.length > 0) {
        const sample = dataBuffer.current.shift()!;
        const nextX = currentX.current + 1.2;
        const nextY = baselineY - sample * scaleY;

        // Clear 15px ahead with clearRect (Sweep Bar Erase pattern)
        ctx.clearRect(currentX.current, 0, 15, height);

        // Draw signal vector
        ctx.beginPath();
        ctx.moveTo(currentX.current, lastY.current);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        currentX.current = nextX;
        lastY.current = nextY;

        // Wrap around when hitting the right boundary
        if (currentX.current >= width) {
          currentX.current = 0;
          ctx.clearRect(0, 0, 15, height);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height, samplingRate]);

  return (
    <div className="relative border-2 border-red-200 rounded-xl overflow-hidden shadow-inner bg-white" style={{ width, height }}>
      {/* Background Canvas: Static Medical Grid */}
      <canvas ref={bgCanvasRef} width={width} height={height} className="absolute inset-0" />
      {/* Foreground Canvas: Dynamic ECG Trace */}
      <canvas ref={fgCanvasRef} width={width} height={height} className="absolute inset-0" />
    </div>
  );
};
```

---

## 5. Web Worker Signal Downsampling & Baseline Filtering

When loading a continuous 24-hour Holter ECG recording (gigabytes of raw telemetry):
1. **Offload parsing to a Web Worker:** Do not block the main UI thread with JSON deserialization or byte decoding.
2. **Apply Largest-Triangle-Three-Buckets (LTTB) Downsampling:** When the user zooms out to view a 1-hour overview, downsample 1,800,000 points down to 2,000 display points without losing the critical R-peak spikes or arrhythmia anomalies.
