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

const STORAGE_KEY = 'lightify_hue_credentials';

export function saveCredentials(credentials: HueCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function loadCredentials(): HueCredentials | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function discoverBridges(): Promise<HueBridge[]> {
  // Use proxy in development to avoid CORS issues
  const response = await fetch('/api/hue-discovery/');
  if (!response.ok) {
    throw new Error('Failed to discover Hue bridges');
  }
  return response.json();
}

export async function createUser(bridgeIp: string): Promise<string> {
  const response = await fetch(`http://${bridgeIp}/api`, {
    method: 'POST',
    body: JSON.stringify({
      devicetype: 'lightify#browser',
    }),
  });

  const data = await response.json();

  if (data[0]?.error) {
    throw new Error(data[0].error.description);
  }

  if (data[0]?.success?.username) {
    return data[0].success.username;
  }

  throw new Error('Unexpected response from bridge');
}

export async function getLights(credentials: HueCredentials): Promise<HueLight[]> {
  const response = await fetch(
    `http://${credentials.bridgeIp}/api/${credentials.username}/lights`
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

export interface LightState {
  on?: boolean;
  bri?: number;  // 1-254
  hue?: number;  // 0-65535
  sat?: number;  // 0-254
}

export async function setLightState(
  credentials: HueCredentials,
  lightId: string,
  state: LightState
): Promise<void> {
  const body: LightState = {};

  if (state.on !== undefined) body.on = state.on;
  if (state.bri !== undefined) body.bri = Math.max(1, Math.min(254, Math.round(state.bri)));
  if (state.hue !== undefined) body.hue = Math.max(0, Math.min(65535, Math.round(state.hue)));
  if (state.sat !== undefined) body.sat = Math.max(0, Math.min(254, Math.round(state.sat)));

  await fetch(
    `http://${credentials.bridgeIp}/api/${credentials.username}/lights/${lightId}/state`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}

export async function setMultipleLightsState(
  credentials: HueCredentials,
  lightIds: string[],
  state: LightState
): Promise<void> {
  await Promise.all(
    lightIds.map(id => setLightState(credentials, id, state))
  );
}

// Convenience function for brightness only
export async function setLightBrightness(
  credentials: HueCredentials,
  lightId: string,
  brightness: number,
  on: boolean = true
): Promise<void> {
  await setLightState(credentials, lightId, { on, bri: brightness });
}

export async function setMultipleLightsBrightness(
  credentials: HueCredentials,
  lightIds: string[],
  brightness: number,
  on: boolean = true
): Promise<void> {
  await setMultipleLightsState(credentials, lightIds, { on, bri: brightness });
}
