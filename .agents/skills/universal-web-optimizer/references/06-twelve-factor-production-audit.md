# Twelve-Factor App & Production Readiness Checklist

This reference guide provides an audit checklist to ensure web applications maintain strict separation of configuration, security integrity, and artifact isolation before deploying to production.

---

## 1. Factor III: Config in Environment

> **Strict Rule**: *Zero hardcoded credentials, zero hardcoded domain names, and zero test datasets in the Git repository.*

### Audit Checklist
Item | Anti-Pattern | Production Standard
:--- | :--- | :---
**Super Admin Emails** | `const ADMINS = ["user@gmail.com"]` in `.ts` | Strictly read from `process.env.ADMIN_EMAILS` or database RBAC table
**Public Domain** | `new URL("/callback", "https://mysite.com")` | Strictly derived via `X-Forwarded-Host` or `process.env.APP_URL`
**Secret Keys** | Default fallback `"dev-secret-key-32-chars"` | Throw startup exception if `SECRET_KEY` is undefined in `production`
**Test Datasets** | `tokens_1500.json` tracked in Git | Add `*.json` test seeds to `.gitignore` and generate dynamically

---

## 2. Fail-Fast Environment Validation

Validate critical environment variables at process startup using schema validators (e.g. Zod, Joi, or custom assert):

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters in production"),
  APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

If an operator forgets to define a required database URL or secret on Railway/AWS, the container exits immediately with a clear error message during build/start rather than failing silently during customer transactions.

---

## 3. Test Artifact & Build Artifact Hygiene

Ensure that testing scripts, seed generators, and heavy local tools are excluded from production container builds:

```dockerignore
# .dockerignore
tests/
scripts/loadtest/
*.test.ts
*.spec.ts
coverage/
.git/
.env*
!package.json
```
