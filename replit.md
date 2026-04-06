# Sentinela IA - Trusted News Aggregator

## Overview

Sentinela IA is a Portuguese-language news verification and aggregation platform designed to combat misinformation. The application monitors trusted news sources via RSS feeds, cross-references information from multiple sources, and presents verified news to users with reliability ratings. The system helps users distinguish between confirmed facts, probable information, and unverified claims.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: Custom React Context-based store (`@/lib/store.tsx`) with local preferences persistence
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style variant)
- **UI Components**: Radix UI primitives wrapped by shadcn/ui for accessible, customizable components
- **Data Fetching**: TanStack React Query for server state management
- **Animations**: Framer Motion for UI transitions
- **Fonts**: Merriweather (serif, for headlines/trust) and Open Sans (readability)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Pattern**: RESTful endpoints under `/api/*`
- **Development**: Hot module replacement via Vite middleware in development mode

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Migrations**: Drizzle Kit with `db:push` command
- **Tables**:
  - `users` - User accounts
  - `sources` - News sources with RSS URLs and trust ratings
  - `newsItems` - Aggregated news with reliability scores, tags, and verification notes
  - `userPreferences` - User settings including selected tags, text size, contrast preferences

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), Server (`server/`), Shared code (`shared/`), Database (`db/`)
- **Path Aliases**: `@/*` for client source, `@shared/*` for shared code, `@assets` for attached assets
- **Type Safety**: Drizzle-zod for schema validation, shared types between frontend and backend
- **RSS Aggregation**: Server-side RSS parsing with automatic tag extraction and reliability calculation
- **Parallel RSS Fetching**: `p-limit` (concurrency=5) used in `fetchAllRSS()` to reduce fetch time from ~10min to ~2min; manual refresh button also uses `fetchAllRSS()` (was sequential before)
- **7-day display window**: News items visible for 7 days from publication date (was 72h)
- **Auth System**: Session-based auth (express-session + connect-pg-simple), sessions persisted in PostgreSQL `session` table (survives server restarts/deploys), password hashing via Node.js `crypto.scrypt`, `/api/auth/register|login|logout|me` endpoints, React `AuthContext`/`useAuth` hook
- **Auth Flow**: Unauthenticated users are redirected to `/login`; after login, onboarding check runs; `AuthProvider` wraps `StoreProvider` in App.tsx

### Application Flow
1. User completes onboarding to select interest tags
2. Server fetches RSS feeds from trusted sources periodically
3. News items are processed, tagged, and assigned reliability levels based on source type and cross-referencing
4. Frontend displays filtered feed based on user preferences with trust badges

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### RSS/News Processing
- **rss-parser**: Fetches and parses RSS feeds from configured news sources

### UI/Frontend Libraries
- **Radix UI**: Full suite of accessible primitives (dialogs, menus, tooltips, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting with Portuguese locale support
- **embla-carousel-react**: Carousel component
- **sonner**: Toast notifications (via shadcn wrapper)

### Build/Development
- **Vite**: Frontend development server and build tool
- **esbuild**: Server bundling for production
- **Replit Plugins**: Dev banner, cartographer (development only), runtime error overlay

### Pre-seeded Sources
The application comes with initial trusted sources including NASA, NOAA, BBC News Brasil, G1 Globo, and Reuters Science for demonstration purposes.

## Pages and Routes
- `/` — News feed (protected)
- `/news/:id` — Article detail (protected)
- `/sources` — RSS sources list (protected)
- `/settings` — User settings, account info, legal links (protected)
- `/onboarding` — Interest tag selection after first login (protected)
- `/login` — Login page (public)
- `/register` — Registration page (public)
- `/privacy` — Privacy Policy / LGPD (public)
- `/terms` — Terms of Service (public)

## App Store Readiness
- Privacy Policy (LGPD-compliant) at `/privacy`
- Terms of Service at `/terms`
- No children's data collection
- Links from Settings screen
- Updated meta tags to "Sentinela IA"
- ARIA labels on interactive elements