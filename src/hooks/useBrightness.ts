import { useState, useRef, useCallback, useEffect } from 'react';

interface UseBrightnessOptions {
  sampleInterval?: number; // ms between samples
  smoothingFactor?: number; // 0-1, higher = more smoothing
}

interface UseBrightnessReturn {
  brightness: number; // 0-255
  isActive: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
}

export function useBrightness(options: UseBrightnessOptions = {}): UseBrightnessReturn {
  const { sampleInterval = 500, smoothingFactor = 0.3 } = options;

  const [brightness, setBrightness] = useState(128);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const smoothedBrightnessRef = useRef(128);

  const calculateBrightness = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Use smaller resolution for performance
    const width = 64;
    const height = 48;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate average brightness using luminance formula
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance formula: 0.299R + 0.587G + 0.114B
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const rawBrightness = totalBrightness / pixelCount;

    // Apply exponential smoothing to prevent flickering
    smoothedBrightnessRef.current =
      smoothingFactor * rawBrightness +
      (1 - smoothingFactor) * smoothedBrightnessRef.current;

    setBrightness(Math.round(smoothedBrightnessRef.current));
  }, [smoothingFactor]);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start sampling brightness
      intervalRef.current = window.setInterval(calculateBrightness, sampleInterval);
      setIsActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      setIsActive(false);
    }
  }, [calculateBrightness, sampleInterval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    brightness,
    isActive,
    error,
    videoRef,
    start,
    stop,
  };
}
