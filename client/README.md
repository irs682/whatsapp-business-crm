# WhatsApp Business CRM - Frontend Client

Modern, responsive Single Page Application (SPA) built with React 18, Vite, and Tailwind CSS.

## Architecture

```
client/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/                # Central Axios client with JWT interceptor
│   ├── components/
│   │   ├── common/         # Button, Input, Card, Badge, StatCard
│   │   └── navigation/     # Sidebar, Header
│   ├── constants/          # Route constants
│   ├── context/            # AuthContext (JWT lifecycle, permissions)
│   ├── features/           # Modular domain features (dashboard, inbox, etc.)
│   ├── layouts/            # AuthLayout & MainLayout
│   ├── pages/              # Primary route pages (10 core pages)
│   ├── routes/             # AppRoutes with React Router DOM v6
│   ├── App.jsx             # Root application wrapper
│   ├── index.css           # Tailwind CSS directives & theme rules
│   └── main.jsx            # React root DOM bootstrap
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Available Routes

- `/login` — Agent authentication portal
- `/dashboard` — Executive KPI metrics and recent chat previews
- `/inbox` — Shared team inbox with 24h customer window countdown and internal notes
- `/contacts` — Contact directory, tags, and consent status
- `/leads` — Visual pipeline stages and deal values
- `/departments` — Operational routing pools
- `/users` — Team members, roles, and assignments
- `/campaigns` — WhatsApp broadcast templates and delivery stats
- `/reports` — SLA analytics and agent performance leaderboards
- `/settings` — Meta WhatsApp API credentials and webhook verification

## Development

```bash
# Install dependencies
npm install

# Start Vite dev server on http://localhost:5173
npm run dev

# Production bundle build
npm run build
```
