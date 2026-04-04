# VaultDefender — Least-Privilege GitHub Agent

**VaultDefender is a least-privilege GitHub agent that combines Auth0 Token Vault for delegated GitHub access with an app-level policy engine that restricts what the agent may do inside allowed repositories and path prefixes.**

Built for the Auth0 "Authorized to Act" Hackathon.

## The Problem

GitHub App permissions operate at the **repository level** with fine-grained controls. When an AI agent needs to interact with a repository, it typically gets access to the entire repo — every file, every branch.

But safe AI workflows often need **finer boundaries** than upstream providers natively expose. An agent helping with documentation should not be able to modify CI/CD workflows. An agent reviewing code should not be able to merge PRs.

## The Insight

> GitHub permissions are still coarser than many safe AI workflows need, so VaultDefender overlays finer app-level path policies and approval rules.

VaultDefender does **not** claim that GitHub natively supports folder-level permissions. Instead, it honestly models the system as:

1. **GitHub grants fine-grained permissions** configured in the GitHub App settings
2. **Auth0 Token Vault stores and exchanges credentials** — the app never handles raw GitHub tokens
3. **VaultDefender adds app-level policy enforcement** — path prefixes, action restrictions, and risk-based approval gates — on top
4. **Every tool invocation passes through a central policy guard** before any token exchange or GitHub API call is made

## Features

- **Auth0 Authentication** — Sign in with GitHub through Auth0; GitHub is the primary sign-in path for the MVP
- **Token Vault Integration** — OAuth 2.0 Token Exchange (RFC 8693) via Custom API Client; GitHub tokens never stored by the app
- **5 Policy-Guarded Tools** — List repos, read files, review PRs, create branches, open draft PRs
- **Central Policy Engine** — Every tool call is evaluated against user-defined repo + path + action rules
- **Risk Classification** — Low / Medium / High risk levels with automatic escalation
- **Human Approval Flow** — High-risk actions require explicit user approval before execution
- **Full Audit Trail** — Every action, decision, and approval logged and surfaced in the UI
- **Transparent Boundaries** — Users see exactly what the agent can and cannot do

## Quick Start

### Prerequisites

- Node.js 20+
- Auth0 account with Token Vault enabled
- GitHub OAuth App (created via Auth0 Social Connection)
- OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))

### Setup

```bash
# Clone and install
git clone https://github.com/Caractur/VaultDefender.git
cd VaultDefender
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Auth0, OpenRouter credentials
# Never commit .env or any secret snapshots; only .env.example belongs in Git

# Set up database
npm run db:push

# Run development server
npm run dev
```

### Auth0 Configuration

#### 1. Create a Regular Web Application

1. In Auth0 Dashboard → Applications → Applications → Create Application
2. Choose "Regular Web Application"
3. Set Allowed Callback URLs: `http://localhost:3000/auth/callback`
4. Set Allowed Logout URLs: `http://localhost:3000`
5. Note the **Client ID** and **Client Secret**

#### 2. Create a GitHub Social Connection

1. In Auth0 Dashboard → Authentication → Social → Create Connection → GitHub
2. Create an OAuth App at GitHub (Settings → Developer Settings → OAuth Apps)
3. Set the GitHub OAuth App Callback URL: `https://YOUR_AUTH0_DOMAIN/login/callback`
4. Enter the GitHub OAuth App Client ID and Client Secret in Auth0
5. Under **Purpose**, toggle on **Token Vault** (if available)
6. Click Create, then enable it for your application under the Applications tab

**MVP Note:** GitHub is the primary sign-in path. Users sign in via "Continue with GitHub" on the Auth0 login screen, which grants Auth0 access to store the GitHub token in Token Vault. A future version may support connecting GitHub to an existing non-GitHub Auth0 account.

#### 3. Create a Custom API + Custom API Client (for Token Exchange)

1. In Auth0 Dashboard → Applications → APIs → Create API
2. Set a unique **Identifier** (e.g., `https://vaultdefender.example.com/api`) — this is your `AUTH0_AUDIENCE`
3. Click Create
4. Select your new API → click **Add Application** → enter an application name → click **Add**
5. Click **Configure Application** — the Application Type should be "Custom API Client"
6. Under Advanced Settings → Grant Types, verify **Token Vault** is enabled
7. Note the Custom API Client's **Client ID** and **Client Secret** — these are your `AUTH0_TOKEN_VAULT_CLIENT_ID` / `AUTH0_TOKEN_VAULT_CLIENT_SECRET`

#### 4. Enable Token Vault on the Regular Web App

1. Navigate to Applications → Applications → your Regular Web App
2. Under Advanced Settings → Grant Types, enable the **Token Vault** grant type
3. Save Changes

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH0_SECRET` | Random secret for session encryption |
| `AUTH0_BASE_URL` | App URL (`http://localhost:3000`) |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Regular Web App client ID |
| `AUTH0_CLIENT_SECRET` | Regular Web App client secret |
| `AUTH0_AUDIENCE` | Custom API identifier (e.g., `https://vaultdefender.example.com/api`) |
| `AUTH0_TOKEN_VAULT_CLIENT_ID` | Custom API Client ID (for token exchange) |
| `AUTH0_TOKEN_VAULT_CLIENT_SECRET` | Custom API Client secret (for token exchange) |
| `OPENROUTER_API_KEY` | OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys)) |
| `DATABASE_URL` | SQLite database path |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

## Security Model

See [SECURITY_MODEL.md](./SECURITY_MODEL.md) for the authorization and threat model.

## GitHub Permissions

GitHub Apps use **fine-grained permissions** set during app creation in GitHub Developer Settings. Token Vault does not set or override these permissions via scopes — it securely stores and exchanges the tokens that carry those permissions.

VaultDefender's app-level policy engine adds **additional restrictions** on top: repository allowlists, path prefix rules, and risk-based approval gates.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Auth0** (Authentication, Token Vault)
- **Vercel AI SDK v6 + OpenRouter** (Chat, tool calling via `@openrouter/ai-sdk-provider`)
- **Octokit** (GitHub API)
- **Prisma v7 + SQLite** (Persistence)
- **Tailwind CSS v4 + shadcn/ui** (UI)
- **Zod** (Validation)

## License

MIT
