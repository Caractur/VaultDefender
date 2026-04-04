# Hackathon Rubric Mapping

## Security Model

| Criterion | Implementation |
|-----------|---------------|
| Explicit permission boundaries | Repo allowlist + path prefix restrictions + per-repo action rules |
| Protected credentials | Auth0 Token Vault + OAuth 2.0 Token Exchange (RFC 8693) — GitHub tokens never stored by the app |
| Scoped access | App-level policy narrows GitHub's fine-grained permissions |
| High-stakes action protection | Risk classification (Low/Medium/High) with automatic escalation |
| Step-up auth | High-risk actions create approval requests; must be approved before execution |
| Token exchange verification | Custom API Client credentials required; Auth0 validates the exchange before releasing any federated token |

**Where to look**: `src/lib/policy/engine.ts`, `src/lib/policy/risk.ts`, `src/lib/auth/token-vault.ts`

## User Control

| Criterion | Implementation |
|-----------|---------------|
| User understands permissions | Permissions dashboard shows repos, paths, actions in clear cards |
| Consent history | Audit log records every tool call, policy decision, and approval |
| Scopes visible | Risk matrix shows action classification; badges show policy outcomes in chat |
| Boundaries clear | Chat tool cards display "Allowed" / "Blocked" / "Needs Approval" in real time |
| Revoke access | Remove repos from allowlist, toggle active/inactive |

**Where to look**: `src/app/(dashboard)/permissions/page.tsx`, `src/components/permissions/`, `src/components/audit/`

## Technical Execution

| Criterion | Implementation |
|-----------|---------------|
| Real Token Vault integration | Access token exchange via Custom API Client — official OAuth 2.0 Token Exchange (RFC 8693) flow |
| GitHub sign-in via Auth0 | GitHub is the primary sign-in path; Auth0 stores the GitHub token in Token Vault automatically |
| Production-aware patterns | Prisma for persistence, Zod for validation, centralized error handling |
| Robust error handling | Graceful handling of: no session, token exchange failure, API errors, policy denials |
| Policy enforcement | Single `evaluatePolicy()` function that every tool invocation passes through |
| Strong typing | Full TypeScript, Zod schemas, Prisma-generated types |

**Where to look**: `src/lib/tools/executor.ts`, `src/lib/auth/token-vault.ts`, `src/lib/db.ts`, `src/app/api/`

## Design

| Criterion | Implementation |
|-----------|---------------|
| Polished frontend | Dark theme, shadcn/ui components, responsive sidebar, clean typography |
| Backend balance | API routes, policy engine, audit logger, tool executor — all server-side |
| Clear UX | Chat with inline tool cards, permission cards with badges, sortable audit table |
| Usable dashboards | Permissions page (CRUD), Audit page (sortable, filterable), Settings page |

**Where to look**: `src/app/(dashboard)/`, `src/components/`, `src/app/globals.css`

## Potential Impact

| Criterion | Implementation |
|-----------|---------------|
| Useful for AI developers | Pattern for any agent that needs finer access control than providers offer |
| Relevant beyond AI | Token Vault + policy engine pattern applies to any delegated API access |
| Generalizable | Replace GitHub with any third-party API; the architecture is the same |
| Real need | Enterprise AI adoption is blocked by lack of granular agent authorization |

## Insight Value

| Criterion | Implementation |
|-----------|---------------|
| Surfaces a real gap | GitHub permissions are repo/resource-level; AI workflows need path-level |
| Honest framing | Explicitly states that path restrictions are app-level policy, not native GitHub scopes |
| GitHub permissions documented | Settings page explains that GitHub permissions are set during authorization, not via Token Vault scopes |
| Pattern visible in UI | Settings page explains Token Vault exchange, GitHub vs app-level permissions; chat shows policy decisions |
| Clearly articulated | README, landing page, and Settings all communicate the insight |
| MVP-honest | Clearly states GitHub is the primary sign-in path; future version may support account linking |

**Key insight**: "GitHub permissions are still coarser than many safe AI workflows need, so VaultDefender overlays finer app-level path policies and approval rules."

**Where this appears**: Landing page quote, Settings > GitHub Permissions vs VaultDefender Policies card, README, this document.
