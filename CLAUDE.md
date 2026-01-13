# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Lightify is a React + TypeScript SPA that automatically adjusts Philips Hue smart lights based on ambient room brightness. It uses webcam or Ambient Light Sensor to detect room lighting and inversely maps it to bulb brightness (bright room = dim lights, dark room = bright lights).

## Development

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- React 18 + TypeScript + Vite
- Philips Hue Local API
- MediaStream API (webcam) / AmbientLightSensor API
- CSS with retrofuturistic terminal aesthetic

## Session Context Tracking

This project uses context tracking files for multi-session continuity.

**At the start of every session:**
1. Read `context.md` to find the "RESUME HERE" section
2. Summarize the current state and ask: "Does this match where you are?"
3. Wait for confirmation before proceeding
4. Read `overview.md` if you need project structure context

**Update `context.md` when you:**
- Create, modify, or delete any file
- Complete or fail a task
- Hit a blocker or change direction
- End a work session

**Do NOT update context.md when you:**
- Answer questions without changing files
- Explain code or concepts
- Make minor edits (typos, formatting)

**Before starting any task:**
1. Update "LAST ACTION ATTEMPTED" with what you're about to do
2. Complete the work
3. Update "LAST ACTION COMPLETED" or note the failure
4. Check off completed items, archive if Progress exceeds 20 items

**When project scope changes significantly:**
1. Update `overview.md` with new modules/phases/architecture

**Files:**
- `context.md` - Dynamic session state (update on file operations)
- `overview.md` - Static project plan (update when scope changes)
