# AGENTS.md — System-Wide Engineering & Architecture Rules

> **Single Source of Truth (SSOT)** for all AI Coding Assistants (Antigravity, Cursor, Copilot, Windsurf, Claude Code) contributing to the `e-vote` codebase.
> This document defines the **invariant engineering standards, architectural tiers, data flow contracts, security postures, and quality gates** governing the entire project.

---

## 1. 🧭 Tech Stack & Runtime Ground Truth

- **Runtime & Framework**: Next.js 16 (App Router + Turbopack), React 19.
- **Language**: TypeScript 5 (Strict Mode enabled: `tsc --noEmit`).
- **Database & Data Access**: PostgreSQL via Prisma ORM 7 (`@prisma/adapter-pg`).
- **Authentication & Identity**: Better-Auth (Server & Client integration).
- **Validation Engine**: Zod (Explicit schema parsing with FormData coercion).
- **Linter & Formatter**: Biome JS (`biome check`, `biome format`) — *ESLint/Prettier are strictly disabled*.
- **Test Runner**: Vitest (`vitest run`).
- **Package Manager**: `pnpm` exclusively — *never invoke npm or yarn*.

---

## 2. 🏛️ Core Architectural Invariants (4-Tier Separation)

Every domain feature in `src/features/[domain]/` must strictly implement the 4-tier separation of concerns without crossing abstraction boundaries:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tier 1] ROUTING & PRESENTATION LAYER (`src/app/`)                                     │
│ - Pure Server Components (`page.tsx`, `layout.tsx`).                                   │
│ - Responsibilities: Route segmentation, page metadata, initial SSR data resolution.   │
│ - Invariant: ZERO raw database queries, mutations, or complex business logic.          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ orchestrates
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tier 2] TRANSPORT & MUTATION LAYER (`src/features/[domain]/actions.ts` + `schemas.ts`)│
│ - Next.js Server Actions (`"use server"`) and Zod schema contracts.                   │
│ - Responsibilities: Authentication check, payload validation, ActionState formatting. │
│ - Output Contract: `Promise<ActionState<T>>` (`{ ok: boolean, message?, errors?, data? }`).│
│ - Invariant: NEVER execute raw Prisma/SQL queries directly. Delegate to Tier 3.        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ calls
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tier 3] DOMAIN & BUSINESS LOGIC LAYER (`src/features/[domain]/service.ts`)            │
│ - Pure async TypeScript functions, isolated and testable without HTTP/framework mocks. │
│ - Responsibilities: Business rules, atomic `$transactions`, concurrency control.       │
│ - Invariant: NEVER accept `FormData`, access Cookies, or call `revalidatePath()`.      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ executes
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Tier 4] DATA & INFRASTRUCTURE LAYER (`prisma/schema.prisma` & `src/lib/db.ts`)        │
│ - Prisma ORM 7 Client Singleton and PostgreSQL database.                               │
│ - Responsibilities: Foreign key constraints, unique indexing, transactional rollback.  │
│ - Invariant: Historical voting records (`Vote`) MUST be immutable (`onDelete: Restrict`).│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 🛡️ Data Modeling, Concurrency & Transactional Integrity

1. **Audit Trail & Vote Immutability**:
   - Foreign key relationships to immutable transactions (`Vote`, audit tables) **MUST** specify `onDelete: Restrict`.
   - `onDelete: Cascade` is forbidden on any model representing a user's submitted choice or historical audit log.
2. **Atomic Batch Operations**:
   - Any bulk insertion or file processing (e.g. CSV/Excel imports) **MUST** execute inside an atomic `db.$transaction`.
   - Never suppress unique constraint violations with `skipDuplicates: true` when full data consistency is required. A duplicate must trigger an immediate, complete transaction rollback.
3. **Concurrency & Double-Mutation Defense**:
   - Token redemption and single-use assets **MUST** utilize conditional atomic database updates (e.g., `updateMany({ where: { id, is_used: false } })`) to guarantee single-use enforcement under race conditions.

---

## 4. ⚡ State Management & Mutation Contracts

1. **Standardized Action Contract**:
   All Server Actions must adhere to the standardized result type:
   ```typescript
   export type ActionState<T = unknown> = {
     ok: boolean;
     message?: string;
     errors?: Record<string, string[]>;
     data?: T;
   };
   ```
2. **Predictable Action Dispatchers**:
   - In React 19 `useActionState`, maintain a single, stable dispatcher function. Never swap action function references conditionally at runtime.
3. **Search & Filter Synchronization**:
   - Client-side live search and filter controls **MUST** be debounced (300–350ms) and reflect state through URL search parameters (`useSearchParams` + `useRouter`) for shareability and SSR compatibility.

---

## 5. 🎨 UI/UX & Design System Principles

1. **Component Composition & Purity**:
   - Primitives in `src/components/ui/` must remain pure, headless/accessible wrappers (React Aria Components) with zero domain logic or server action dependencies.
   - Domain-specific views must be colocated in `src/features/[domain]/components/` and decomposed into single-responsibility sub-components.
2. **Semantic Elements & Accessibility (WAI-ARIA)**:
   - Always use standard semantic HTML elements where available. Interactive elements must support full keyboard navigation, explicit `aria-*` attributes, and appropriate focus indicators.
   - Modal and overlay dialogs must only be triggered through explicit user actions and provide proper focus traps.
3. **Micro-Interactions Standard**:
   - Interactive triggers (buttons, action cards) must provide tactile feedback using uniform easing and active-state spring transitions (`transition-all duration-200 ease-out active:scale-[0.98]`).

---

## 6. 🔒 Security & Boundary Defense

1. **Zero-Trust Server Action Authorization**:
   - Every protected server action **MUST** enforce session and authorization verification at the entry point prior to processing inputs or executing service logic.
2. **Secure Context & HTTPS Compatibility**:
   - Session resolution and middleware checks **MUST** support secure HTTPS environments (e.g., checking both `__Secure-` prefixed and standard session cookies).
3. **Header Injection & Response Hardening**:
   - Dynamic parameters injected into HTTP response headers (such as `Content-Disposition` attachment filenames) **MUST** be strictly sanitized against non-alphanumeric/control characters.
4. **Template & Content Sanitization**:
   - Dynamic user-generated or database content interpolated into HTML emails or external documents **MUST** be escaped against XSS and template injection attacks.

---

## 7. 🏷️ Naming Conventions & Project Structure

1. **File System Casing**:
   - All files and directories across the entire repository **MUST** use strict `kebab-case` (e.g., `use-debounce.ts`, `candidate-card.tsx`, `token-email.ts`).
2. **Standard File Structure within `features/[domain]/`**:
   - `actions.ts` — Server Actions entry point (`"use server"`).
   - `service.ts` — Business logic and Prisma database operations.
   - `schemas.ts` — Zod input validation schemas.
   - `types.ts` — Domain TypeScript interfaces and types.
   - `components/` — Domain-specific UI sub-components.

---

## 8. 🚫 System-Wide Anti-Patterns (Forbidden Traps)

| Category | Forbidden Anti-Pattern | Required Engineering Pattern |
| :--- | :--- | :--- |
| **Architecture** | Direct database queries inside `page.tsx`, `layout.tsx`, or `actions.ts` | Delegate all database access to domain `service.ts` |
| **Components** | Monolithic client components mixing data fetching, tables, and dialogs | Split into modular single-responsibility sub-components |
| **Type Safety** | Suppressing errors with `any`, `@ts-ignore`, or disabling Biome rules | Fix type contracts and satisfy static analysis rules |
| **Navigation** | Hard page reloads via `window.location.href` for internal routes | Use Next.js client routing (`useRouter()` or `<Link />`) |
| **Dependencies** | Introducing redundant external libraries into `package.json` | Utilize existing built-in utilities and stack primitives |
| **Semantics** | Using modal/overlay primitives as regular layout containers | Use semantic structural tags (`<div>`, `<section>`, `<main>`) |

---

## 9. 🧪 Mandatory Verification & Quality Gate Workflow

Before concluding any code modification or refactoring task, every AI agent **MUST** run the local quality gate pipeline:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Quality Gate Pass Criteria:
- [x] **Biome Check**: 0 lint errors, 0 warnings (`pnpm lint`).
- [x] **Biome Formatter**: All modified files cleanly formatted (`pnpm format`).
- [x] **TypeScript Strict Check**: `tsc --noEmit` exits with status code 0 (`pnpm typecheck`).
- [x] **Vitest Test Suite**: All unit and integration test suites pass 100% (`pnpm test`).
- [x] **Next.js Production Build**: Next.js compiles static and dynamic routes successfully (`pnpm build`).

> **If any step in the pipeline fails, you MUST resolve the root cause and rerun the verification before declaring the task complete.**
