interface WebcamPreviewProps {
  videoRef: React.RefCallback<HTMLVideoElement> | React.RefObject<HTMLVideoElement | null>;
  brightness: number;
  isActive: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function WebcamPreview({
  videoRef,
  brightness,
  isActive,
  error,
  onStart,
  onStop,
}: WebcamPreviewProps) {
  const brightnessPercent = Math.round((brightness / 255) * 100);

  return (
    <div className="webcam-preview panel">
      <div className="panel-header">
        <h3>Optical Sensor Array</h3>
        <div className="status-indicator" style={{
          background: isActive ? 'var(--success)' : 'var(--text-dim)',
          boxShadow: isActive ? '0 0 8px var(--success)' : 'none',
          animation: isActive ? 'blink 2s ease-in-out infinite' : 'none'
        }} />
      </div>
      <div className="panel-content">
        <div className="video-container">
          <video
            ref={videoRef as React.LegacyRef<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            style={{ display: isActive ? 'block' : 'none' }}
          />
          {!isActive && (
            <div className="video-placeholder">
              Feed Offline
            </div>
          )}
          {isActive && (
            <div className="video-overlay">
              <span className="live-label">Live</span>
            </div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="meter">
          <div className="meter-label">
            <span>Ambient Level</span>
            <span>{brightnessPercent}%</span>
          </div>
          <div className="meter-bar">
            <div
              className="meter-fill"
              style={{ width: `${brightnessPercent}%` }}
            />
          </div>
        </div>

        <div className="controls" style={{ marginTop: '1rem' }}>
          {!isActive ? (
            <button onClick={onStart} className="btn-primary">
              Activate Sensor
            </button>
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
