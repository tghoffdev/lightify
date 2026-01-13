import { ConnectionMode, RelayConfig } from '../utils/hueApi';
import { RelaySetup } from './RelaySetup';

interface HueSetupProps {
  status: 'disconnected' | 'discovering' | 'waiting_button' | 'connected' | 'error';
  error: string | null;
  connectionMode: ConnectionMode;
  relayConfig: RelayConfig | null;
  onConnect: () => void;
  onConnectWithRelay: (bridgeIp: string) => Promise<void>;
  onSetConnectionMode: (mode: ConnectionMode) => void;
  onConfigureRelay: (config: RelayConfig) => Promise<boolean>;
  onClearRelay: () => void;
}

export function HueSetup({
  status,
  error,
  connectionMode,
  relayConfig,
  onConnect,
  onConnectWithRelay,
  onSetConnectionMode,
  onConfigureRelay,
  onClearRelay,
}: HueSetupProps) {
  const isConnecting = status === 'discovering' || status === 'waiting_button';

  return (
    <div className="hue-setup panel">
      <div className="panel-header">
        <h3>Bridge Link</h3>
        <div className="status-indicator" style={{
          background: status === 'error' ? 'var(--accent)' : 'var(--text-dim)',
          boxShadow: status === 'error' ? '0 0 8px var(--accent)' : 'none',
          animation: isConnecting ? 'blink 1s ease-in-out infinite' : 'none'
        }} />
      </div>
      <div className="panel-content">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${connectionMode === 'local' ? 'active' : ''}`}
            onClick={() => onSetConnectionMode('local')}
            disabled={isConnecting}
          >
            Local Network
          </button>
          <button
            className={`mode-btn ${connectionMode === 'relay' ? 'active' : ''}`}
            onClick={() => onSetConnectionMode('relay')}
            disabled={isConnecting}
          >
            Remote (Relay)
          </button>
        </div>

        {/* Local Mode */}
        {connectionMode === 'local' && (
          <>
            {status === 'disconnected' && (
              <div className="setup-step">
                <p>Initialize connection to Philips Hue command bridge</p>
                <button onClick={onConnect} className="btn-primary">
                  Locate Bridge
                </button>
              </div>
            )}

            {status === 'discovering' && (
              <div className="setup-step">
                <div className="spinner" />
                <p>Scanning local network for Hue Bridge...</p>
              </div>
            )}

            {status === 'waiting_button' && (
              <div className="setup-step">
                <div className="pulse-icon">[ ]</div>
                <p className="highlight">Press bridge link button</p>
                <p className="hint">Authorization window: 30 seconds</p>
              </div>
            )}

            {status === 'error' && (
              <div className="setup-step">
                <p className="error-message">{error}</p>
                <button onClick={onConnect} className="btn-primary">
                  Retry Scan
                </button>
              </div>
            )}
          </>
        )}

        {/* Relay Mode */}
        {connectionMode === 'relay' && (
          <>
            {status === 'waiting_button' && (
              <div className="setup-step">
                <div className="pulse-icon">[ ]</div>
                <p className="highlight">Press bridge link button</p>
                <p className="hint">Authorization window: 30 seconds</p>
              </div>
            )}

            {status === 'error' && (
              <div className="setup-step">
                <p className="error-message">{error}</p>
              </div>
            )}

            {(status === 'disconnected' || status === 'error') && (
              <RelaySetup
                relayConfig={relayConfig}
                onConfigure={onConfigureRelay}
                onClear={onClearRelay}
                onConnect={onConnectWithRelay}
                isConnecting={isConnecting}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
