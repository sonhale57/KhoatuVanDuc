---
name: fullstack-aspnet-react
description: "Initialize a fullstack project with ASP.NET Core Web API backend, SQL Server database, React TypeScript frontend, and shadcn UI."
user-invocable: true
---

# Fullstack ASP.NET Core + React TypeScript Project Setup

Use this skill to scaffold and configure a new fullstack project in this workspace with:

- Backend: ASP.NET Core Web API
- Database: SQL Server via Entity Framework Core
- Frontend: React with TypeScript
- UI: shadcn/ui with Tailwind CSS

## What this skill produces

- A backend ASP.NET Core Web API project configured for SQL Server
- EF Core models, DbContext, migrations, and connection string setup
- A React TypeScript frontend scaffolded with Vite
- shadcn/ui installed and initialized for component-based UI
- responsive frontend design for desktop and mobile
- mobile-first app-style UI with different layouts and navigation patterns for phone devices
- CORS-enabled API and environment configuration for local development
- Automated review and troubleshooting guidance for build/runtime issues
- Fixes for missing components, startup errors, and configuration problems before run

## Step-by-step workflow

1. Confirm the project root and desired project name.
2. Scaffold the backend app:
   - `dotnet new webapi -o src/Backend`
   - add Entity Framework Core and SQL Server provider
   - configure `appsettings.Development.json` with a SQL Server connection string
   - enable CORS for the frontend app URL
3. Create the database layer:
   - add `DbContext`, entity models, and repository/service patterns if needed
   - create an initial migration and apply it with `dotnet ef database update`
4. Scaffold the frontend app:
   - `npm create vite@latest src/frontend -- --template react-ts`
   - install dependencies: `react`, `react-dom`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`
5. Install and initialize shadcn UI:
   - `npx shadcn-ui@latest init` inside `src/frontend`
   - install the default UI components and configure Tailwind CSS
   - use responsive Tailwind/shadcn patterns for different screen sizes
   - define a separate mobile app-like navigation and layout using drawers, tabs, or bottom navigation
6. Connect frontend to backend:
   - set `VITE_API_BASE_URL=http://localhost:5000` or the backend launch URL
   - build sample fetch/auth integration to consume the Web API
   - verify desktop and mobile layouts separately with devtools/mobile preview
7. Validate locally:
   - run backend: `dotnet watch --project src/Backend`
   - run frontend: `npm install && npm run dev` from `src/frontend`
   - verify API endpoints and UI pages work together
8. Review and fix startup issues:
   - inspect backend startup logs and frontend build output for missing components, failed imports, or runtime exceptions
   - correct component declarations, export/import mismatches, and missing package installations
   - fix ASP.NET Core startup failures caused by invalid configuration, connection strings, or missing services before rerunning
   - restart both backend and frontend after applying fixes to verify the updated project state

## Decision points

- Use `npm`, `yarn`, or `pnpm` based on workspace preference.
- Choose minimal API or controller-based endpoints for the backend.
- Optionally add Docker support later by creating `Dockerfile` and `docker-compose.yml`.
- Optionally add authentication after the initial scaffold (Identity, JWT, or external provider).

## Quality checks

- Backend starts without errors and responds to HTTP requests.
- Database migrations apply successfully to SQL Server.
- Frontend builds and launches in development mode.
- shadcn UI components render correctly and Tailwind CSS is active.
- Desktop and mobile layouts are responsive and follow distinct app-style navigation patterns.
- Mobile rendering is verified with a compact app-like UI, while desktop retains a wider dashboard-like layout.
- Environment variables are documented in `.env` files.
- Missing components or missing imports are detected and corrected before running.
- Failed startup conditions are reviewed, fixed, and the app is restarted after changes.

## Example prompts to try

- `Start a new fullstack ASP.NET Core + React TypeScript project with SQL Server and shadcn UI.`
- `Scaffold the backend API, SQL Server database, and React frontend for this project.`
- `Initialize the frontend with shadcn/ui and connect it to the ASP.NET Core API.`

## Next customization ideas

- Add a workspace instruction file for `ASP.NET Core + React` code style and architecture rules.
- Add a hook to run formatting and linting after scaffolding.
- Create a separate skill for adding authentication and authorization.
