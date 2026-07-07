@AGENTS.md

# CLAUDE.md

## Commands

```bash
npm run dev          # Dev server na porta 3000
npm run build        # Build de produção
npm run lint         # ESLint
npm run test         # Rodar testes uma vez (Vitest)
npm run test:watch   # Rodar testes em watch mode
```

Para rodar um único arquivo de teste:
```bash
npx vitest run src/test/example.test.ts
```

E2E usa Playwright (`playwright.config.ts`).

## Architecture

**mentorados-ae-escala** is a multi-tenant white-label members area built with Next.js 16 (App Router), TypeScript, and Supabase. Each mentorado (tenant) gets a branded training space for up to 1,000 revendedores; video content is central and shared across all tenants (Panda Video).

### Routing & Layout

`src/app/` defines all routes via Next.js App Router. Unauthenticated users are redirected to `/login` by `src/proxy.ts` (Next 16 renamed middleware to proxy). Protected routes live inside `src/app/(auth)/`.

### State Management

- **Server state**: TanStack React Query for all Supabase data fetching, caching, and mutations.
- **UI state**: Local `useState` only — no global state library.

### Backend (Supabase)

- **Database**: PostgreSQL with RLS policies — every tenant-owned row carries a tenant id and RLS enforces isolation.
- **Auth**: Supabase Auth managed via SSR cookies (proxy handles redirect).
- **Types**: `src/integrations/supabase/types.ts` is auto-generated — do not edit manually.
- **Migrations**: `supabase/migrations/` — add new `.sql` files for schema changes.

### Key Directories

- `src/app/` — Next.js routes (App Router)
- `src/components/ui/` — shadcn/ui primitives (do not modify generated components)
- `src/components/shared/` — reusable app components
- `src/hooks/` — custom React hooks
- `src/lib/` — shared utilities and constants
- `src/integrations/supabase/` — Supabase clients and auto-generated types

### UI

Components use **shadcn/ui** (Radix UI + Tailwind CSS). Icons use **Lucide React**. Forms use **React Hook Form + Zod**. Toasts use **sonner** (shadcn deprecated toast).

The UI is in **Portuguese (pt-BR)**. Visual layout follows the previous members area (repo `atacadoexponencial-maker/essenciademenina`): sticky header with logo + nav, hero banner on the catalog home, card grids with covers, 16:9 video player page.

## Workflow

Use always in this order: `/spec` → `/break` → `/plan` → `/execute`

Spec: `spec.md` (root, gitignored). Issues: `issues/` (gitignored).
