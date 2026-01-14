# Lightify - Project Overview

## Purpose

Lightify is an ambient light control system for Philips Hue smart bulbs. It automatically adjusts bulb brightness based on room lighting conditions - when the room is bright, lights dim; when the room is dark, lights brighten. This creates a comfortable, adaptive lighting environment.

## Goals

- Control Hue lights from anywhere (not just local network)
- Multiple ambient light detection methods (webcam, native sensor)
- Easy deployment to Vercel with self-hosted relay for remote access
- Clean, maintainable React codebase

## Modules / Phases

### Phase 1: Relay Server
**Objective:** Enable remote Hue control from outside the local network
**Deliverable:** Self-hosted Node.js relay server with Docker support

- Express server with authentication middleware
- Proxy requests from Vercel app to local Hue bridge
- Docker container for easy deployment
- Environment-based configuration

### Phase 2: Frontend Relay Support
**Objective:** Add relay connection mode to the frontend
**Deliverable:** UI for configuring and using relay connection

- Connection mode abstraction (local vs relay)
- Relay configuration UI component
- Updated HueSetup with mode toggle
- Vercel deployment configuration

### Phase 3: Ambient Light Sensor (ALS) Integration
**Objective:** Add native ALS API as alternative to webcam
**Deliverable:** Either/or toggle between camera and light sensor

- ALS hook with browser compatibility detection
- Unified brightness source abstraction
- Refactored UI supporting both sources
- Graceful fallback when ALS unavailable

### Phase 4: Documentation
**Objective:** Comprehensive README for users and contributors
**Deliverable:** Full documentation with architecture, setup, troubleshooting

- Architecture diagrams
- Local dev and Vercel deployment guides
- Relay server setup instructions
- API reference and troubleshooting

## Architecture

```
[Browser SPA]
     |
     +-- Local Mode: Direct HTTP to Hue Bridge (same network only)
     |
     +-- Relay Mode: HTTPS to Self-Hosted Relay --> HTTP to Hue Bridge

[Brightness Detection]
     |
     +-- Webcam: MediaStream API --> Canvas pixel analysis --> Luminance
     |
     +-- ALS: AmbientLightSensor API --> Lux values --> Normalized brightness
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Relay Server:** Node.js, Express, Docker
- **APIs:** Philips Hue Local API, MediaStream API, AmbientLightSensor API
- **Deployment:** Vercel (frontend), Self-hosted (relay)

## Success Criteria

By the end, you should be able to:
1. Deploy Lightify to Vercel and control Hue lights from anywhere via relay
2. Choose between webcam or native light sensor for ambient detection
3. Set up the relay server with Docker in under 5 minutes
4. Understand the full architecture from the README
