import { useState } from 'react';
import { RelayConfig } from '../utils/hueApi';

interface RelaySetupProps {
  relayConfig: RelayConfig | null;
  onConfigure: (config: RelayConfig) => Promise<boolean>;
  onClear: () => void;
  onConnect: (bridgeIp: string) => Promise<void>;
  isConnecting: boolean;
}

export function RelaySetup({
  relayConfig,
  onConfigure,
  onClear,
  onConnect,
  isConnecting,
}: RelaySetupProps) {
  const [url, setUrl] = useState(relayConfig?.url || '');
  const [token, setToken] = useState(relayConfig?.token || '');
  const [bridgeIp, setBridgeIp] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    if (!url || !token) return;

    setTesting(true);
    setTestResult(null);

    const success = await onConfigure({ url, token });
    setTestResult(success ? 'success' : 'error');
    setTesting(false);
  };

  const handleConnect = async () => {
    if (!bridgeIp) return;
    await onConnect(bridgeIp);
  };

  const isConfigured = relayConfig !== null;

  return (
    <div className="relay-setup">
      <div className="form-group">
        <label htmlFor="relay-url">Relay Server URL</label>
        <input
          id="relay-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://relay.example.com or http://192.168.1.50:3001"
          disabled={isConnecting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="relay-token">Relay Token</label>
        <input
          id="relay-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Your relay secret token"
          disabled={isConnecting}
        />
      </div>

      <div className="button-row">
        <button
          onClick={handleTest}
          disabled={!url || !token || testing || isConnecting}
          className="secondary"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {isConfigured && (
          <button onClick={onClear} className="danger" disabled={isConnecting}>
            Clear
          </button>
        )}
      </div>

      {testResult === 'success' && (
        <div className="status-message success">
          Relay connection successful! Bridge is reachable.
        </div>
      )}
      {testResult === 'error' && (
        <div className="status-message error">
          Failed to connect. Check URL, token, and ensure relay server is running.
        </div>
      )}

      {isConfigured && (
        <div className="bridge-connect-section">
          <div className="divider">
            <span>Connect to Bridge</span>
          </div>

          <div className="form-group">
            <label htmlFor="bridge-ip">Bridge IP Address</label>
            <input
              id="bridge-ip"
              type="text"
              value={bridgeIp}
              onChange={(e) => setBridgeIp(e.target.value)}
              placeholder="192.168.1.xxx (from relay server network)"
              disabled={isConnecting}
            />
            <small>
              Enter the local IP of your Hue bridge (same as BRIDGE_IP in relay .env)
            </small>
          </div>

          <button
            onClick={handleConnect}
            disabled={!bridgeIp || isConnecting}
            className="primary"
          >
            {isConnecting ? 'Press Bridge Button...' : 'Connect via Relay'}
          </button>
        </div>
      )}
    </div>
  );
}
