# Deriv Bot

## Overview

Deriv Bot is a web-based automated trading platform that allows users to create trading bots without coding. The application uses a visual block-based programming interface (powered by Blockly) to let users design trading strategies. Users can build bots from scratch, use quick strategies, or import existing bot configurations. The platform supports both demo and real trading accounts through the Deriv trading API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18** with TypeScript as the primary UI framework
- **MobX** for state management across the application
- Stores are organized in `src/stores/` with a root store pattern that aggregates domain-specific stores (client, dashboard, chart, run-panel, etc.)

### Build System
- **Rsbuild** as the primary build tool (modern, fast bundler)
- Webpack configuration available as fallback
- Babel for transpilation with support for decorators and class properties

### Visual Programming
- **Blockly** library for the drag-and-drop bot building interface
- Custom blocks and toolbox configurations for trading-specific operations
- Workspace serialization for saving/loading bot strategies

### Trading Integration
- **@deriv/deriv-api** for WebSocket-based communication with Deriv trading servers
- Real-time market data streaming and order execution
- Support for multiple account types (demo, real, wallet-based)

### Authentication
- OAuth2-based authentication flow with OIDC support
- Token Management Backend (TMB) integration for enhanced session handling
- Multi-account support with account switching capabilities

### Charting
- **@deriv/deriv-charts** for displaying market data and trade visualizations
- Real-time chart updates during bot execution

### PWA Support
- Service worker for offline capabilities
- Installable as a Progressive Web App on mobile devices
- Offline fallback page

### Internationalization
- **@deriv-com/translations** for multi-language support
- CDN-based translation loading with Crowdin integration

### Analytics & Monitoring
- **RudderStack** for event tracking and analytics
- **Datadog** for session replay and performance monitoring
- **TrackJS** for error tracking in production

## External Dependencies

### Deriv Ecosystem Packages
- `@deriv-com/auth-client` - Authentication client
- `@deriv-com/analytics` - Analytics integration
- `@deriv-com/quill-ui` / `@deriv-com/quill-ui-next` - UI component library
- `@deriv-com/translations` - Internationalization
- `@deriv/deriv-api` - Trading API client
- `@deriv/deriv-charts` - Charting library

### Cloud Services
- **Cloudflare Pages** - Deployment platform
- **Google Drive API** - Bot strategy storage and sync
- **LiveChat** - Customer support integration
- **Intercom** - In-app messaging (feature-flagged)
- **GrowthBook** - Feature flag management
- **Survicate** - User surveys

### Third-Party Libraries
- `blockly` - Visual programming blocks
- `mobx` / `mobx-react-lite` - State management
- `react-router-dom` - Client-side routing
- `formik` - Form handling
- `@tanstack/react-query` - Server state management
- `js-cookie` - Cookie management
- `localforage` - Client-side storage
- `lz-string` / `pako` - Compression utilities

## Running the App

```bash
npm run start   # rsbuild dev server on port 5000
npm run build   # production build to dist/
```

## Deployment (Netlify)

This project deploys to Netlify. Set the following environment variable in the Netlify UI under **Site → Environment variables**:

| Variable | Purpose |
|----------|---------|
| `APP_ID` | Your Deriv app ID (overrides all domain-based defaults) |

`APP_ID` is the highest-priority override — it takes precedence over localStorage, staging detection, and domain-based lookup. Leave it unset locally to use the domain-based defaults in `src/components/shared/utils/config/config.ts`.

## Auth Architecture

Login uses the new OIDC flow via `@deriv-com/auth-client`:
1. `requestOidcAuthentication({ redirectCallbackUri: '/callback' })` — initiates login
2. `/callback` route → `<Callback onSignInSuccess={...}>` — exchanges OIDC code for legacy Deriv tokens, stores to localStorage
3. `OAuth2Logout(...)` — logs out via OIDC front-channel logout
4. TMB (Token Management Backend) — optional SSO layer, enabled via Firebase remote config (`remote_config/oauth/is_tmb_enabled.json → dbot`); can be overridden via `localStorage.setItem('is_tmb_enabled', 'true'/'false')`

## Recent Changes

### Auth Migration (August 2026)
- Added `APP_ID` environment variable support in `rsbuild.config.ts` and `src/components/shared/utils/config/config.ts` — set this in Netlify to override the app ID without code changes
- Updated `@deriv-com/auth-client` to `^1.5.8` (latest)
- Fixed React hooks violation in `src/pages/callback/callback-page.tsx` — `useTMB()` was called inside an async callback; moved to component level with a ref for closure safety
- Fixed `src/components/layout/header/header.tsx` — replaced `isTmbEnabled()` (async function call in render) with the `is_tmb_enabled` state value from the hook
- Added `websocket-driver: ^0.7.5` override to fix a blocked CVE in the transitive dependency chain
- Removed `@deriv-com/shiftai-cli` dev dependency (was pulling in `simple-git@3.30.0` which is blocked by the Replit security policy; not needed to build or run the app)

### Free Bots Feature (December 2025)
- Added Free Bots page with 12 pre-built trading bot templates
- Bot cards display with category filtering (Speed Trading, AI Trading, Pattern Analysis, etc.)
- Click-to-load functionality that imports bot XML into Bot Builder
- Responsive card design with hover effects and loading states
- Bot XML files stored in `/public/bots/` directory
- Files: `src/pages/free-bots/index.tsx`, `src/pages/free-bots/free-bots.scss`