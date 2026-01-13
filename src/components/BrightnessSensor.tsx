interface BrightnessSensorProps {
  brightness: number;
  isActive: boolean;
  isGrabbing: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStart: () => void;
  onStop: () => void;
  onGrabOnce: () => void;
}

export function BrightnessSensor({
  brightness,
  isActive,
  isGrabbing,
  error,
  videoRef,
  onStart,
  onStop,
  onGrabOnce,
}: BrightnessSensorProps) {
  const brightnessPercent = Math.round((brightness / 255) * 100);

  return (
    <div className="brightness-sensor panel">
      <div className="panel-header">
        <h3>Optical Sensor Array</h3>
        <div
          className="status-indicator"
          style={{
            background: isActive ? 'var(--success)' : 'var(--text-dim)',
            boxShadow: isActive ? '0 0 8px var(--success)' : 'none',
            animation: isActive ? 'blink 2s ease-in-out infinite' : 'none',
          }}
        />
      </div>
      <div className="panel-content">
        {/* Webcam Display */}
        <div className="video-container">
          <video
            ref={videoRef as React.LegacyRef<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            style={{ display: isActive ? 'block' : 'none' }}
          />
          {!isActive && <div className="video-placeholder">Feed Offline</div>}
          {isActive && (
            <div className="video-overlay">
              <span className="live-label">Live</span>
            </div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* Brightness Meter */}
        <div className="meter">
          <div className="meter-label">
            <span>Ambient Level</span>
            <span>{brightnessPercent}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${brightnessPercent}%` }} />
          </div>
        </div>

        {/* Controls */}
        <div className="controls" style={{ marginTop: '1rem' }}>
          {!isActive ? (
            <div className="sensor-buttons">
              <button
                onClick={onGrabOnce}
                className="btn-secondary"
                disabled={isGrabbing}
              >
                {isGrabbing ? 'Grabbing...' : 'Grab Once'}
              </button>
              <button
                onClick={onStart}
                className="btn-primary"
                disabled={isGrabbing}
              >
                Continuous
              </button>
            </div>
          ) : (
            <button onClick={onStop} className="btn-secondary">
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep backwards-compatible export
export { BrightnessSensor as WebcamPreview };
