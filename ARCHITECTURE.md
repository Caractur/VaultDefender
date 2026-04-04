# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐   │
│  │ Chat UI  │  │ Permissions│  │ Audit   │  │ Settings │   │
│  │ (Agent)  │  │ Dashboard  │  │ Log     │  │ (GitHub) │   │
│  └────┬─────┘  └─────┬──────┘  └────┬────┘  └────┬─────┘   │
│       │              │              │             │          │
├───────┼──────────────┼──────────────┼─────────────┼──────────┤
│       ▼              ▼              ▼             ▼          │
│                    API Routes                                │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐   │
│  │ /api/chat│  │/api/perms  │  │/api/audit│ │/api/github│   │
│  └────┬─────┘  └────────────┘  └─────────┘  └──────────┘   │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AI SDK (streamText)                      │    │
│  │  ┌──────────────────────────────────────────────┐    │    │
│  │  │           Tool Definitions                     │    │    │
│  │  │  list_repos │ read_file │ review_pr │ ...     │    │    │
│  │  └───────────────────┬────────────────────────────┘    │    │
│  └──────────────────────┼────────────────────────────────┘    │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Tool Executor                             │    │
│  │  ┌────────────────────────────────────────────────┐   │    │
│  │  │         POLICY ENGINE (central guard)           │   │    │
│  │  │  1. Repo allowed?                               │   │    │
│  │  │  2. Path prefix allowed?                        │   │    │
│  │  │  3. Action allowed?                             │   │    │
│  │  │  4. Risk level → needs approval?                │   │    │
│  │  └────────────────────┬───────────────────────────┘   │    │
│  │                       │                                │    │
│  │  ┌────────────────────▼───────────────────────────┐   │    │
│  │  │            Audit Logger                         │   │    │
│  │  │  Records every invocation + policy decision     │   │    │
│  │  └────────────────────────────────────────────────┘   │    │
│  └──────────────────────┬────────────────────────────────┘    │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │      Token Vault — Access Token Exchange (RFC 8693)   │    │
│  │  Auth0 access token → Custom API Client → GitHub token│    │
│  └──────────────────────┬────────────────────────────────┘    │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              GitHub API (Octokit)                      │    │
│  │  Only called after policy + token exchange succeed    │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Central Policy Guard

Every tool invocation flows through `evaluatePolicy()` in `src/lib/policy/engine.ts`. This is the single enforcement point. No tool can bypass it — the executor function calls the policy engine before performing any token exchange or making any GitHub API call.

### 2. Token Vault — Access Token Exchange Pattern

VaultDefender never stores raw GitHub tokens. When a tool needs to call the GitHub API:

1. The API route retrieves the user's Auth0 access token from the session (scoped to VaultDefender's Custom API audience)
2. `getGitHubToken(auth0AccessToken)` performs an OAuth 2.0 Token Exchange (RFC 8693) with Auth0:
   - Sends the Auth0 access token as the `subject_token`
   - Authenticates using the Custom API Client credentials (`AUTH0_TOKEN_VAULT_CLIENT_ID` / `AUTH0_TOKEN_VAULT_CLIENT_SECRET`)
   - Auth0 validates the request and returns a GitHub access token from Token Vault
3. A fresh Octokit client is created with this token for the single operation
4. The GitHub token is not persisted in the app database or session

**Why Custom API Client?** The Custom API Client proves to Auth0 that the backend making the exchange request is the same entity registered as the API. This prevents unauthorized clients from stealing the Auth0 access token and using it to access GitHub on the user's behalf.

**GitHub Sign-In (MVP)**: The user signs in with GitHub through Auth0, which stores the GitHub access/refresh tokens in Token Vault. GitHub permissions are set during the OAuth authorization — Token Vault does not set scopes. A future version may support connecting GitHub to an existing non-GitHub Auth0 account.

### 3. Risk Classification

Actions are classified by their potential blast radius:

| Level | Actions | Requires Approval |
|-------|---------|-------------------|
| Low | list_repos, read_file, review_pr | No |
| Medium | create_branch, create_draft_pr | No |
| High | Any action touching sensitive paths, protected branches, or CI/CD | Yes |

Risk is elevated dynamically based on context (path sensitivity, branch protection patterns).

### 4. App-Level vs Provider-Level Permissions

This is the core insight. The app clearly distinguishes:

- **Provider-level** (GitHub App): Fine-grained permissions configured when creating the GitHub App in Developer Settings
- **Token Vault**: Securely stores and exchanges GitHub tokens — does not set or override GitHub permissions
- **App-level** (VaultDefender policy): Further restricts which repos, paths, and actions the agent is allowed to use

### 5. Approval Flow

High-risk actions create an `ApprovalRequest` record and return a "needs approval" response to the chat. The user can approve or deny from the Permissions page. The approval is time-boxed (10 minutes) and logged in the audit trail.

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Authenticated pages (chat, permissions, audit, settings)
│   ├── api/                # API routes (chat, permissions, audit, approval, github)
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # shadcn-style base components
│   ├── layout/             # Sidebar, AppShell
│   ├── chat/               # Chat messages, input, tool cards
│   ├── permissions/        # Repo permissions, risk matrix
│   ├── audit/              # Audit log table
│   ├── settings/           # GitHub connection status
│   └── approval/           # Approval queue
├── lib/
│   ├── auth/               # Auth0 client, Token Vault (token exchange), session helpers
│   ├── policy/             # Policy engine, risk classification, types
│   ├── tools/              # Tool implementations, executor, AI SDK definitions
│   ├── github/             # Octokit client factory
│   ├── audit/              # Audit logger
│   ├── db.ts               # Prisma client
│   ├── constants.ts        # App constants, risk levels, tool names
│   └── utils.ts            # Tailwind utility
└── generated/prisma/       # Generated Prisma client
```

## Data Model

- **User** — Auth0-linked user with GitHub connection status
- **Permission** — Per-repo policy rules (allowed paths, actions, active flag)
- **AuditLog** — Immutable record of every tool invocation and policy decision
- **ApprovalRequest** — Pending/resolved approval requests for high-risk actions
