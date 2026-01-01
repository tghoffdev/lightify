import { useState, useEffect, useCallback } from 'react';
import {
  HueCredentials,
  HueLight,
  LightState,
  loadCredentials,
  saveCredentials,
  clearCredentials,
  discoverBridges,
  createUser,
  getLights,
  setMultipleLightsState,
} from '../utils/hueApi';

type ConnectionStatus = 'disconnected' | 'discovering' | 'waiting_button' | 'connected' | 'error';

interface UseHueBridgeReturn {
  status: ConnectionStatus;
  error: string | null;
  bridgeIp: string | null;
  lights: HueLight[];
  selectedLightIds: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshLights: () => Promise<void>;
  toggleLightSelection: (lightId: string) => void;
  selectAllLights: () => void;
  setLightsState: (state: LightState) => Promise<void>;
}

export function useHueBridge(): UseHueBridgeReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<HueCredentials | null>(null);
  const [lights, setLights] = useState<HueLight[]>([]);
  const [selectedLightIds, setSelectedLightIds] = useState<string[]>([]);

  // Load saved credentials on mount
  useEffect(() => {
    const saved = loadCredentials();
    if (saved) {
      setCredentials(saved);
      setStatus('connected');
    }
  }, []);

  // Fetch lights when connected
  useEffect(() => {
    if (status === 'connected' && credentials) {
      getLights(credentials)
        .then(lights => {
          setLights(lights);
          // Auto-select all lights initially
          setSelectedLightIds(lights.map(l => l.id));
        })
        .catch(err => {
          console.error('Failed to fetch lights:', err);
        });
    }
  }, [status, credentials]);

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

  const disconnect = useCallback(() => {
    clearCredentials();
    setCredentials(null);
    setLights([]);
    setSelectedLightIds([]);
    setStatus('disconnected');
    setError(null);
  }, []);

  const refreshLights = useCallback(async () => {
    if (!credentials) return;
    try {
      const lights = await getLights(credentials);
      setLights(lights);
    } catch (err) {
      console.error('Failed to refresh lights:', err);
    }
  }, [credentials]);

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
      if (!credentials || selectedLightIds.length === 0) return;
      await setMultipleLightsState(credentials, selectedLightIds, state);
    },
    [credentials, selectedLightIds]
  );

  return {
    status,
    error,
    bridgeIp: credentials?.bridgeIp ?? null,
    lights,
    selectedLightIds,
    connect,
    disconnect,
    refreshLights,
    toggleLightSelection,
    selectAllLights,
    setLightsState,
  };
}
