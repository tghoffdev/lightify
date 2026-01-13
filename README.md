# Lightify

Ambient light control system for Philips Hue. Automatically adjusts smart bulb brightness based on room lighting conditions.

## Features

- **Ambient Light Detection**: Webcam-based brightness sensing
- **Inverse Brightness Mapping**: Bright room = dim lights, dark room = bright lights
- **Remote Control**: Access your lights from anywhere via self-hosted relay
- **Retrofuturistic UI**: Terminal-inspired aesthetic with real-time feedback

## Quick Start

### Prerequisites

- Node.js 18+
- Philips Hue Bridge on local network
- Modern browser with webcam access

### Local Development

```bash
git clone https://github.com/youruser/lightify.git
cd lightify
npm install
npm run dev
```

Open http://localhost:5173 and click "Locate Bridge".

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────┐                     │
│  │  useBrightness   │  │ useHueBridge │                     │
│  │  (webcam)        │  │              │                     │
│  └─────────┬────────┘  └──────┬───────┘                     │
│            │                  │                             │
│            └───────┬──────────┘                             │
│                    ▼                                        │
│           ┌─────────────────┐                               │
│           │    App.tsx      │                               │
│           │  (Orchestrator) │                               │
│           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
   ┌──────────────┐               ┌──────────────┐
   │ Local Mode   │               │ Relay Mode   │
   │              │               │              │
   │ Direct HTTP  │               │ Via Relay    │
   │ to Bridge    │               │ Server       │
   └──────┬───────┘               └──────┬───────┘
          │                               │
          │                       ┌───────▼───────┐
          │                       │ Relay Server  │
          │                       │ (Your Network)│
          │                       └───────┬───────┘
          │                               │
          └───────────────┬───────────────┘
                          ▼
                  ┌───────────────┐
                  │  Hue Bridge   │
                  └───────────────┘
```

## Deployment

### Vercel Deployment

1. Fork/clone repository
2. Connect to Vercel
3. Deploy (zero config needed - `vercel.json` included)

The app will work in "Local Network" mode when on the same network as your Hue bridge.

### Remote Access (Relay Server)

For controlling lights from outside your home network, deploy the included relay server.

#### Option 1: Docker (Recommended)

```bash
cd relay-server
cp .env.example .env
# Edit .env with your settings

docker build -t lightify-relay .
docker run -d -p 3001:3001 --env-file .env lightify-relay
```

#### Option 2: Node.js Direct

```bash
cd relay-server
npm install
cp .env.example .env
# Edit .env with your settings

npm start
```

#### Exposing the Relay

The relay server needs to be accessible from the internet. Options:

1. **Port Forwarding**: Forward port 3001 on your router to the relay server
2. **Cloudflare Tunnel**: Free, secure tunnel without opening ports
3. **ngrok**: Quick testing with `ngrok http 3001`
4. **Tailscale/ZeroTier**: VPN-based access

For production, use HTTPS (put behind Caddy, nginx, or Cloudflare).

#### Relay Configuration in App

1. Open Lightify in your browser
2. Select "Remote (Relay)" mode
3. Enter your relay URL (e.g., `https://relay.yourdomain.com`)
4. Enter your relay token (from `.env`)
5. Click "Test Connection"
6. Enter your bridge's local IP (same as BRIDGE_IP in relay `.env`)
7. Press the bridge button when prompted

### Environment Variables (Relay Server)

| Variable | Description | Example |
|----------|-------------|---------|
| `RELAY_SECRET` | Auth token (generate with `openssl rand -hex 32`) | `a1b2c3d4...` |
| `BRIDGE_IP` | Hue bridge local IP | `192.168.1.42` |
| `PORT` | Server port | `3001` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://lightify.vercel.app,http://localhost:5173` |

## How It Works

### Webcam Brightness Detection

- Analyzes luminance from video frames at 2 FPS
- Calculates average brightness using luminance formula
- Applies smoothing to prevent flickering
- Privacy note: video stays local, never uploaded

## API Reference

### Hue Bridge Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api` | POST | Create new user (requires button press) |
| `/api/{user}/lights` | GET | List all lights |
| `/api/{user}/lights/{id}/state` | PUT | Set light state |

### Relay Server Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/relay/health` | GET | No | Health check, returns bridge config status |
| `/relay/api/*` | * | Yes | Proxy all requests to Hue bridge |

Auth: `X-Relay-Token` header with your `RELAY_SECRET`

## Project Structure

```
lightify/
├── src/
│   ├── App.tsx                    # Main orchestration
│   ├── components/
│   │   ├── HueSetup.tsx           # Bridge discovery & pairing
│   │   ├── RelaySetup.tsx         # Relay configuration
│   │   ├── BrightnessSensor.tsx   # Webcam feed display
│   │   └── LightControls.tsx      # Light control panel
│   ├── hooks/
│   │   ├── useHueBridge.ts        # Bridge connection state
│   │   └── useBrightness.ts       # Webcam brightness detection
│   ├── utils/
│   │   └── hueApi.ts              # Hue API + relay integration
│   └── styles.css                 # Retrofuturistic styling
├── relay-server/                  # Self-hosted relay
│   ├── src/
│   │   ├── index.js               # Express server
│   │   ├── middleware/auth.js     # Token validation
│   │   └── routes/proxy.js        # Hue API proxy
│   ├── Dockerfile
│   └── .env.example
├── vercel.json                    # Vercel deployment config
└── vite.config.ts                 # Vite build config
```

## Troubleshooting

### "No Hue bridges found"

- Ensure bridge is powered on and connected to network
- Check you're on the same WiFi network as the bridge
- Try the Philips Hue app to verify bridge connectivity
- As a last resort, manually enter bridge IP (find it in your router's DHCP list)

### Camera permission denied

- Check browser settings for camera permissions
- Ensure site is served over HTTPS (or localhost)
- Some browsers block camera on HTTP sites

### Relay connection failed

- Verify relay server is running: `curl http://relay-ip:3001/relay/health`
- Check firewall allows port 3001
- Confirm ALLOWED_ORIGINS includes your app's URL
- Verify token matches between app and `.env`

### Lights not responding

- Check lights are reachable in the Hue app first
- Ensure lights are selected (checkboxes) in Lightify
- Bridge may rate-limit rapid changes - wait a moment
- Try refreshing the page and reconnecting

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Relay Server**: Node.js, Express
- **APIs**: Philips Hue Local API, MediaStream API
- **Deployment**: Vercel (frontend), Self-hosted (relay)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- TypeScript strict mode enabled
- Functional components with hooks
- CSS follows existing variable system
- Test on Chrome, Firefox, Safari

## License

MIT License - see LICENSE file for details.
