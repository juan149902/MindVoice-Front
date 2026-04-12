# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MindVoice-Front is an Angular 21.2 application with SSR capabilities, integrating Gemini AI for AI-powered features. Built with Tailwind CSS 4 and Angular Material.

## Development Commands

```bash
npm install                    # Install dependencies
npm run start                  # Start dev server (default port)
npm run dev                    # Start dev server on port 3000 with env vars
npm run build                  # Production build
npm run watch                  # Watch mode builds
npm run test                   # Run unit tests with Vitest
npm run lint                   # ESLint validation
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `GEMINI_API_KEY` - Required for Gemini AI API calls
- `APP_URL` - Application URL for OAuth callbacks and API endpoints

## Architecture

**Core Structure:**
- `src/app/core/` - Singleton services, guards, interceptors, and models
  - `services/` - API communication (ApiHttpService), auth (AuthService), sockets (MindmapSocketService)
  - `guards/` - Route protection (auth.guard.ts)
  - `interceptors/` - JWT token and auth header injection
- `src/app/pages/` - Route-level components (dashboard, library, tasks, summaries, mind-maps, profile, settings)
- `src/app/layout/` - Main application shell component

**Routing:**
- Public routes: `/` (landing), `/auth` (login/register)
- Protected routes (require authGuard): `/dashboard`, `/library`, `/tags`, `/tasks`, `/summaries`, `/mind-maps`, `/profile`, `/settings`

**Key Dependencies:**
- Angular 21.2 with standalone components
- Tailwind CSS 4 with PostCSS
- Angular Material + CDK
- Socket.IO client for real-time mind map features
- Vitest for testing

**Build Configuration:**
- Uses `@angular/build:application` builder
- SSR enabled with entry at `src/server.ts`
- Production builds output to `dist/app/browser/`
- Docker multi-stage build available (Node 20 build, nginx serve)
