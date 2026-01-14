export interface HueBridge {
  id: string;
  internalipaddress: string;
}

export interface HueLight {
  id: string;
  name: string;
  state: {
    on: boolean;
    bri: number;
    reachable: boolean;
  };
}

export interface HueCredentials {
  bridgeIp: string;
  username: string;
}

export type ConnectionMode = 'local' | 'relay';

export interface RelayConfig {
  url: string;
  token: string;
}

export interface ConnectionConfig {
  mode: ConnectionMode;
  credentials: HueCredentials;
  relay?: RelayConfig;
}

const CREDENTIALS_STORAGE_KEY = 'lightify_hue_credentials';
const RELAY_STORAGE_KEY = 'lightify_relay_config';
const MODE_STORAGE_KEY = 'lightify_connection_mode';

// Credentials persistence
export function saveCredentials(credentials: HueCredentials): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
}

export function loadCredentials(): HueCredentials | null {
  const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
}

// Relay config persistence
export function saveRelayConfig(config: RelayConfig): void {
  localStorage.setItem(RELAY_STORAGE_KEY, JSON.stringify(config));
}

export function loadRelayConfig(): RelayConfig | null {
  const stored = localStorage.getItem(RELAY_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearRelayConfig(): void {
  localStorage.removeItem(RELAY_STORAGE_KEY);
}

// Connection mode persistence
export function saveConnectionMode(mode: ConnectionMode): void {
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

export function loadConnectionMode(): ConnectionMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'relay' ? 'relay' : 'local';
}

/**
 * Core request function that routes through relay or direct based on mode
 */
async function makeHueRequest(
  config: ConnectionConfig,
  path: string,
  options?: RequestInit
): Promise<Response> {
  if (config.mode === 'relay' && config.relay) {
    // Route through relay server
    const relayUrl = config.relay.url.replace(/\/$/, ''); // Remove trailing slash
    return fetch(`${relayUrl}/relay/api${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
        'X-Relay-Token': config.relay.token,
      },
    });
  } else {
    // Direct local connection
    return fetch(`http://${config.credentials.bridgeIp}/api${path}`, options);
  }
}

export async function discoverBridges(): Promise<HueBridge[]> {
  // Use proxy in development to avoid CORS issues
  const response = await fetch('/api/hue-discovery/');
  if (!response.ok) {
    throw new Error('Failed to discover Hue bridges');
  }
  return response.json();
}

export async function createUser(bridgeIp: string, relay?: RelayConfig): Promise<string> {
  let response: Response;

  if (relay) {
    // Route through relay for remote pairing
    const relayUrl = relay.url.replace(/\/$/, '');
    response = await fetch(`${relayUrl}/relay/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Token': relay.token,
      },
      body: JSON.stringify({
        devicetype: 'lightify#browser',
      }),
    });
  } else {
    // Direct local connection
    response = await fetch(`http://${bridgeIp}/api`, {
      method: 'POST',
      body: JSON.stringify({
        devicetype: 'lightify#browser',
      }),
    });
  }

  const data = await response.json();

  if (data[0]?.error) {
    throw new Error(data[0].error.description);
  }

  if (data[0]?.success?.username) {
    return data[0].success.username;
  }

  throw new Error('Unexpected response from bridge');
}

export async function getLights(config: ConnectionConfig): Promise<HueLight[]> {
  const response = await makeHueRequest(
    config,
    `/${config.credentials.username}/lights`
  );

  const data = await response.json();

  if (data[0]?.error) {
    throw new Error(data[0].error.description);
  }

  return Object.entries(data).map(([id, light]) => ({
    id,
    name: (light as any).name,
    state: (light as any).state,
  }));
}

// Legacy function for backwards compatibility
export async function getLightsLegacy(credentials: HueCredentials): Promise<HueLight[]> {
  return getLights({
    mode: 'local',
    credentials,
  });
}

export interface LightState {
  on?: boolean;
  bri?: number;  // 1-254
  hue?: number;  // 0-65535
  sat?: number;  // 0-254
  ct?: number;   // 153-500 mirek (6500K-2000K)
}

export async function setLightState(
  config: ConnectionConfig,
  lightId: string,
  state: LightState
): Promise<void> {
  const body: LightState = {};

  if (state.on !== undefined) body.on = state.on;
  if (state.bri !== undefined) body.bri = Math.max(1, Math.min(254, Math.round(state.bri)));

  // CT and HSV are mutually exclusive color modes
  // If ct is provided, use color temperature mode; otherwise use hue/sat mode
  if (state.ct !== undefined) {
    body.ct = Math.max(153, Math.min(500, Math.round(state.ct)));
  } else {
    if (state.hue !== undefined) body.hue = Math.max(0, Math.min(65535, Math.round(state.hue)));
    if (state.sat !== undefined) body.sat = Math.max(0, Math.min(254, Math.round(state.sat)));
  }

  await makeHueRequest(
    config,
    `/${config.credentials.username}/lights/${lightId}/state`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}

export async function setMultipleLightsState(
  config: ConnectionConfig,
  lightIds: string[],
  state: LightState
): Promise<void> {
  await Promise.all(
    lightIds.map(id => setLightState(config, id, state))
  );
}

// Convenience function for brightness only
export async function setLightBrightness(
  config: ConnectionConfig,
  lightId: string,
  brightness: number,
  on: boolean = true
): Promise<void> {
  await setLightState(config, lightId, { on, bri: brightness });
}

export async function setMultipleLightsBrightness(
  config: ConnectionConfig,
  lightIds: string[],
  brightness: number,
  on: boolean = true
): Promise<void> {
  await setMultipleLightsState(config, lightIds, { on, bri: brightness });
}

/**
 * Test relay connection by hitting the health endpoint
 */
export async function testRelayConnection(relay: RelayConfig): Promise<boolean> {
  try {
    const relayUrl = relay.url.replace(/\/$/, '');
    const response = await fetch(`${relayUrl}/relay/health`, {
      headers: {
        'X-Relay-Token': relay.token,
      },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok' && data.bridgeConfigured;
  } catch {
    return false;
  }
}

/**
 * Get bridge IP from relay server health endpoint
 */
export async function getRelayBridgeIp(relay: RelayConfig): Promise<string | null> {
  try {
    const relayUrl = relay.url.replace(/\/$/, '');
    const response = await fetch(`${relayUrl}/relay/health`, {
      headers: {
        'X-Relay-Token': relay.token,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.bridgeIp || null;
  } catch {
    return null;
  }
}
