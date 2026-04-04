# Security Model

## Authorization Layers

VaultDefender implements defense-in-depth through multiple authorization layers:

### Layer 1: Authentication (Auth0)

- Users authenticate through Auth0
- Session management via Auth0 middleware (encrypted cookies)
- No custom session token handling

### Layer 2: Token Vault (OAuth 2.0 Token Exchange via Custom API Client)

- GitHub tokens are stored by Auth0 Token Vault, not by VaultDefender
- When GitHub access is needed, the backend performs an **access token exchange** (RFC 8693):
  1. Retrieves the user's Auth0 access token from the session (scoped to VaultDefender's Custom API audience)
  2. Sends a `POST /oauth/token` request with the Custom API Client's credentials and the user's Auth0 access token as the `subject_token`
  3. Auth0 validates the Custom API Client, verifies the user's connected GitHub account, and returns a federated GitHub access token from Token Vault
- The app never persists, logs, or exposes raw GitHub tokens — they exist only for the duration of a single request
- If the user did not sign in via GitHub (the primary MVP path), the exchange fails gracefully

### Layer 3: Provider-Level Permissions (GitHub App)

- GitHub App permissions are set in **GitHub Developer Settings** when creating the GitHub App, not via Token Vault scopes
- GitHub Apps use fine-grained permissions; Token Vault does not set or override them
- VaultDefender does not and cannot expand these permissions
- The app is transparent: if GitHub blocks an operation, the error is surfaced clearly

### Layer 4: App-Level Policy Engine (VaultDefender)

This is the core authorization innovation. On top of GitHub's permissions, VaultDefender enforces:

1. **Repository allowlist** — Only repos explicitly added by the user are accessible to the agent
2. **Path prefix restrictions** — Within an allowed repo, only specified path prefixes are accessible
3. **Action restrictions** — Specific tool actions can be restricted per-repo
4. **Risk-based escalation** — Actions touching sensitive paths or protected branches are automatically elevated to high risk
5. **Approval gates** — High-risk actions require explicit human approval before execution

### Layer 5: Audit Trail

- Every tool invocation is logged with: action, repo, path, risk level, policy decision, reason, timestamp
- Logs are immutable (append-only in the database)
- Both allowed and blocked actions are recorded
- Approval decisions are logged separately

## Token Exchange Flow

```
Browser ──login──▶ Auth0  ──session cookie──▶ Next.js middleware
                                                       │
                                              getAccessToken()
                                                       │
                                                       ▼
                                              Auth0 /oauth/token
                                              ┌────────────────────────────────────┐
                                              │ grant_type:  token-exchange        │
                                              │ client_id:   Custom API Client ID  │
                                              │ client_secret:  …                  │
                                              │ subject_token:  Auth0 access token │
                                              │ connection:  github                │
                                              └────────────────────────────────────┘
                                                       │
                                                       ▼
                                              GitHub access token (short-lived)
                                                       │
                                                       ▼
                                              Octokit API call
```

## Threat Model

### What VaultDefender Protects Against

| Threat | Mitigation |
|--------|------------|
| Agent accessing unauthorized repos | Repo allowlist in policy engine |
| Agent reading sensitive files | Path prefix restrictions |
| Agent modifying CI/CD without consent | Sensitive path detection + high-risk escalation |
| Agent merging PRs without review | High-risk action requires approval |
| Token leakage through app storage | Token Vault + token exchange — no local storage |
| Unauthorized token exchange | Custom API Client credentials required; Auth0 validates the exchange |
| Unauthorized API calls | Central policy guard checks every invocation |
| Invisible agent actions | Full audit trail for all operations |

### What VaultDefender Does NOT Protect Against

| Limitation | Reason |
|-----------|--------|
| Auth0 account compromise | Outside app scope — Auth0 manages authentication |
| GitHub token revocation timing | Exchanged tokens are short-lived; Token Vault handles refresh |
| LLM prompt injection | The AI model could theoretically craft tool calls that appear legitimate; policy engine mitigates but cannot prevent all attacks |
| SQLite concurrency under heavy load | MVP uses SQLite; production should use PostgreSQL |

## Key Security Decisions

1. **Server-side only**: All GitHub API calls happen server-side. The frontend never sees GitHub tokens.
2. **No token caching in app**: Each tool execution performs a fresh token exchange with Auth0.
3. **Custom API Client verification**: Auth0 verifies the Custom API Client is the authorized entity for the API audience before releasing any federated token.
4. **Policy-first execution**: The policy engine runs before any token exchange or API call. If policy denies the action, no external API is ever contacted.
5. **Zod validation**: All API inputs are validated with Zod schemas before processing.
6. **Time-boxed approvals**: Approval grants expire after 10 minutes to limit the window of elevated access.

## GitHub Permissions — Honest Framing

VaultDefender does not claim that GitHub natively supports folder-level permissions. The system is explicitly designed as:

- **GitHub provides**: Fine-grained permissions set in the GitHub App configuration
- **Token Vault provides**: Secure credential storage and token exchange — the app never handles raw GitHub tokens
- **VaultDefender provides**: Finer-grained app-level path and action policies enforced before any tool executes
- **The gap**: Real agent authorization often needs boundaries that upstream providers don't expose. VaultDefender demonstrates how to bridge this gap honestly and transparently.

GitHub Apps use fine-grained permissions configured in GitHub Developer Settings. Token Vault does not set or override these permissions via scopes — it securely stores and exchanges the tokens that carry those permissions.
