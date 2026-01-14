import { useState } from 'react';
import { ConnectionMode, RelayConfig } from '../utils/hueApi';

interface BrightnessSensorProps {
  brightness: number;
  isActive: boolean;
  isGrabbing: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStart: () => void;
  onStop: () => void;
  onGrabOnce: () => void;
  // Hue connection props
  hueStatus: string;
  hueError: string | null;
  connectionMode: ConnectionMode;
  relayConfig: RelayConfig | null;
  bridgeIp: string | null;
  onConnect: () => void;
  onConnectWithRelay: (config: RelayConfig) => Promise<void>;
  onSetConnectionMode: (mode: ConnectionMode) => void;
  onDisconnect: () => void;
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
  hueStatus,
  hueError,
  connectionMode,
  relayConfig,
  bridgeIp,
  onConnect,
  onConnectWithRelay,
  onSetConnectionMode,
  onDisconnect,
}: BrightnessSensorProps) {
  const brightnessPercent = Math.round((brightness / 255) * 100);
  const isConnected = hueStatus === 'connected';
  const isConnecting = hueStatus === 'discovering' || hueStatus === 'pairing';

  // Local state for relay form
  const [relayUrl, setRelayUrl] = useState(relayConfig?.url || '');
  const [relayToken, setRelayToken] = useState(relayConfig?.token || '');

  const handleRelayConnect = () => {
    if (relayUrl && relayToken) {
      onConnectWithRelay({ url: relayUrl, token: relayToken });
    }
  };

  const getStatusMessage = () => {
    switch (hueStatus) {
      case 'discovering':
        return 'Searching for bridge...';
      case 'pairing':
        return 'Press the bridge button...';
      case 'connected':
        return bridgeIp || 'Connected';
      default:
        return 'Disconnected';
    }
  };

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

        {/* Sensor Controls */}
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
                className="btn-sensor"
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

      {/* Hue Connection Section */}
      <div className="connection-section">
        <div className="section-header">
          <h4>Hue Connection</h4>
          <div
            className="status-indicator small"
            style={{
              background: isConnected ? 'var(--success)' : isConnecting ? 'var(--warning)' : 'var(--text-dim)',
              boxShadow: isConnected ? '0 0 6px var(--success)' : isConnecting ? '0 0 6px var(--warning)' : 'none',
            }}
          />
        </div>

        {hueError && <p className="error-message">{hueError}</p>}

        {isConnected ? (
          <div className="connected-info">
            <span className="connection-status">
              {connectionMode === 'relay' ? '[RELAY] ' : ''}{bridgeIp}
            </span>
            <button onClick={onDisconnect} className="btn-text">
              Disconnect
            </button>
          </div>
        ) : (
          <>
            {/* Mode Toggle */}
            <div className="mode-toggle">
              <label className={connectionMode === 'local' ? 'active' : ''}>
                <input
                  type="radio"
                  name="connectionMode"
                  checked={connectionMode === 'local'}
                  onChange={() => onSetConnectionMode('local')}
                  disabled={isConnecting}
                />
                Local
              </label>
              <label className={connectionMode === 'relay' ? 'active' : ''}>
                <input
                  type="radio"
                  name="connectionMode"
                  checked={connectionMode === 'relay'}
                  onChange={() => onSetConnectionMode('relay')}
                  disabled={isConnecting}
                />
                Relay
              </label>
            </div>

            {connectionMode === 'local' ? (
              <div className="local-connect">
                {isConnecting ? (
                  <p className="status-message">{getStatusMessage()}</p>
                ) : (
                  <button onClick={onConnect} className="btn-primary btn-full">
                    Locate Bridge
                  </button>
                )}
              </div>
            ) : (
              <div className="relay-connect">
                <input
                  type="text"
                  placeholder="Relay URL"
                  value={relayUrl}
                  onChange={e => setRelayUrl(e.target.value)}
                  disabled={isConnecting}
                />
                <input
                  type="password"
                  placeholder="Token"
                  value={relayToken}
                  onChange={e => setRelayToken(e.target.value)}
                  disabled={isConnecting}
                />
                {isConnecting ? (
                  <p className="status-message">{getStatusMessage()}</p>
                ) : (
                  <button
                    onClick={handleRelayConnect}
                    className="btn-primary btn-full"
                    disabled={!relayUrl || !relayToken}
                  >
                    Connect
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Keep backwards-compatible export
export { BrightnessSensor as WebcamPreview };
