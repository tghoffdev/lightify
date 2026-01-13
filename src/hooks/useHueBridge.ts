import { useState, useEffect, useCallback } from 'react';
import {
  HueCredentials,
  HueLight,
  LightState,
  ConnectionMode,
  RelayConfig,
  ConnectionConfig,
  loadCredentials,
  saveCredentials,
  clearCredentials,
  loadRelayConfig,
  saveRelayConfig,
  clearRelayConfig,
  loadConnectionMode,
  saveConnectionMode,
  discoverBridges,
  createUser,
  getLights,
  setMultipleLightsState,
  testRelayConnection,
} from '../utils/hueApi';

type ConnectionStatus = 'disconnected' | 'discovering' | 'waiting_button' | 'connected' | 'error';

interface UseHueBridgeReturn {
  status: ConnectionStatus;
  error: string | null;
  bridgeIp: string | null;
  lights: HueLight[];
  selectedLightIds: string[];
  connectionMode: ConnectionMode;
  relayConfig: RelayConfig | null;
  connect: () => Promise<void>;
  connectWithRelay: (bridgeIp: string) => Promise<void>;
  disconnect: () => void;
  refreshLights: () => Promise<void>;
  toggleLightSelection: (lightId: string) => void;
  selectAllLights: () => void;
  setLightsState: (state: LightState) => Promise<void>;
  setConnectionMode: (mode: ConnectionMode) => void;
  configureRelay: (config: RelayConfig) => Promise<boolean>;
  clearRelay: () => void;
}

export function useHueBridge(): UseHueBridgeReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<HueCredentials | null>(null);
  const [lights, setLights] = useState<HueLight[]>([]);
  const [selectedLightIds, setSelectedLightIds] = useState<string[]>([]);
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>('local');
  const [relayConfig, setRelayConfig] = useState<RelayConfig | null>(null);

  // Build connection config from current state
  const getConnectionConfig = useCallback((): ConnectionConfig | null => {
    if (!credentials) return null;
    return {
      mode: connectionMode,
      credentials,
      relay: relayConfig ?? undefined,
    };
  }, [credentials, connectionMode, relayConfig]);

  // Load saved state on mount
  useEffect(() => {
    const savedCredentials = loadCredentials();
    const savedRelay = loadRelayConfig();
    const savedMode = loadConnectionMode();

    setConnectionModeState(savedMode);
    if (savedRelay) {
      setRelayConfig(savedRelay);
    }
    if (savedCredentials) {
      setCredentials(savedCredentials);
      setStatus('connected');
    }
  }, []);

  // Fetch lights when connected
  useEffect(() => {
    const config = getConnectionConfig();
    if (status === 'connected' && config) {
      getLights(config)
        .then(fetchedLights => {
          setLights(fetchedLights);
          // Auto-select all lights initially
          setSelectedLightIds(fetchedLights.map(l => l.id));
        })
        .catch(err => {
          console.error('Failed to fetch lights:', err);
          // If relay mode fails, might be connectivity issue
          if (connectionMode === 'relay') {
            setError('Failed to reach bridge via relay');
          }
        });
    }
  }, [status, getConnectionConfig, connectionMode]);

  // Local network connect flow
  const connect = useCallback(async () => {
    try {
      setError(null);
      setStatus('discovering');

      // Discover bridges
      const bridges = await discoverBridges();
      if (bridges.length === 0) {
        throw new Error('No Hue bridges found on your network');
      }

      const bridgeIp = bridges[0].internalipaddress;
      setStatus('waiting_button');

      // Poll for button press (try for 30 seconds)
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const username = await createUser(bridgeIp);
          const newCredentials = { bridgeIp, username };
          saveCredentials(newCredentials);
          setCredentials(newCredentials);
          setStatus('connected');
          return;
        } catch (err) {
          if (err instanceof Error && err.message.includes('link button')) {
            // Button not pressed yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw err;
          }
        }
      }

      throw new Error('Timed out waiting for button press');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setStatus('error');
    }
  }, []);

  // Relay connect flow - requires bridge IP from relay config
  const connectWithRelay = useCallback(async (bridgeIp: string) => {
    if (!relayConfig) {
      setError('Relay not configured');
      setStatus('error');
      return;
    }

    try {
      setError(null);
      setStatus('waiting_button');

      // Poll for button press via relay (try for 30 seconds)
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const username = await createUser(bridgeIp, relayConfig);
          const newCredentials = { bridgeIp, username };
          saveCredentials(newCredentials);
          setCredentials(newCredentials);
          setStatus('connected');
          return;
        } catch (err) {
          if (err instanceof Error && err.message.includes('link button')) {
            // Button not pressed yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw err;
          }
        }
      }

      throw new Error('Timed out waiting for button press');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setStatus('error');
    }
  }, [relayConfig]);

  const disconnect = useCallback(() => {
    clearCredentials();
    setCredentials(null);
    setLights([]);
    setSelectedLightIds([]);
    setStatus('disconnected');
    setError(null);
  }, []);

  const refreshLights = useCallback(async () => {
    const config = getConnectionConfig();
    if (!config) return;
    try {
      const fetchedLights = await getLights(config);
      setLights(fetchedLights);
    } catch (err) {
      console.error('Failed to refresh lights:', err);
    }
  }, [getConnectionConfig]);

  const toggleLightSelection = useCallback((lightId: string) => {
    setSelectedLightIds(prev =>
      prev.includes(lightId)
        ? prev.filter(id => id !== lightId)
        : [...prev, lightId]
    );
  }, []);

  const selectAllLights = useCallback(() => {
    setSelectedLightIds(lights.map(l => l.id));
  }, [lights]);

  const setLightsState = useCallback(
    async (state: LightState) => {
      const config = getConnectionConfig();
      if (!config || selectedLightIds.length === 0) return;
      await setMultipleLightsState(config, selectedLightIds, state);
    },
    [getConnectionConfig, selectedLightIds]
  );

  const setConnectionMode = useCallback((mode: ConnectionMode) => {
    setConnectionModeState(mode);
    saveConnectionMode(mode);
  }, []);

  const configureRelay = useCallback(async (config: RelayConfig): Promise<boolean> => {
    // Test the connection first
    const isValid = await testRelayConnection(config);
    if (isValid) {
      setRelayConfig(config);
      saveRelayConfig(config);
      return true;
    }
    return false;
  }, []);

  const clearRelay = useCallback(() => {
    setRelayConfig(null);
    clearRelayConfig();
    if (connectionMode === 'relay') {
      setConnectionModeState('local');
      saveConnectionMode('local');
    }
  }, [connectionMode]);

  return {
    status,
    error,
    bridgeIp: credentials?.bridgeIp ?? null,
    lights,
    selectedLightIds,
    connectionMode,
    relayConfig,
    connect,
    connectWithRelay,
    disconnect,
    refreshLights,
    toggleLightSelection,
    selectAllLights,
    setLightsState,
    setConnectionMode,
    configureRelay,
    clearRelay,
  };
}
