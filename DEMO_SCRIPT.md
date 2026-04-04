# Demo Script

## Setup (before demo)

1. Auth0 configured with GitHub social connection + Token Vault
2. Custom API + Custom API Client created in Auth0 (Token Exchange enabled)
3. At least one GitHub repo accessible
4. OpenRouter API key configured
5. Database initialized (`npm run db:push`)

## Demo Flow (5 minutes)

### 1. Landing Page (30s)

- Show the landing page with the value proposition
- Highlight the key message: "AI agent authorization done right"
- Point out the insight quote about GitHub permissions being coarser than AI workflows need
- Note the prominent "Continue with GitHub" call to action

### 2. Authentication (30s)

- Click "Continue with GitHub" → Auth0 login → GitHub OAuth
- Show that authentication goes through Auth0 (not custom)
- Explain: "By signing in with GitHub through Auth0, the user's GitHub token is stored in Auth0's Token Vault — the app never sees or stores it"
- After login, show automatic redirect to the chat interface

### 3. Settings — Token Vault Status (30s)

- Navigate to Settings
- Show GitHub Token Vault Status — Active, signed in as `<username>`
- Point out the "How Token Vault Works" card: explain the **access token exchange** flow — Auth0 access token is exchanged for a GitHub token via the Custom API Client using RFC 8693
- Highlight: "VaultDefender never stores raw GitHub tokens. Every GitHub call uses a fresh token obtained through Token Vault's token exchange."
- Show the GitHub Permissions vs VaultDefender Policies card: "GitHub permissions are set during OAuth authorization — Token Vault doesn't set scopes. VaultDefender adds its own path/action restrictions on top."

### 4. Permissions — Configure Boundaries (1m)

- Navigate to Permissions page
- Add a repository: `your-username/demo-repo`
- Set path prefixes: `src/`, `docs/`
- Show the risk classification matrix (Low / Medium / High)
- Point out: "These app-level policies are enforced ON TOP of GitHub's provider-level permissions"

### 5. Chat — Allowed Actions (1.5m)

- Navigate to Chat
- Ask: "List my accessible repositories"
  - Show tool card with green "Allowed" badge
- Ask: "Read the README from your-username/demo-repo"
  - Show successful file read within allowed paths
- Ask: "Read the file at src/index.ts in your-username/demo-repo"
  - Show successful read within allowed path prefix

### 6. Chat — Blocked Action (30s)

- Ask: "Read the file at .github/workflows/ci.yml in your-username/demo-repo"
  - Show red "Blocked" badge
  - Show clear explanation: path is outside allowed prefixes OR is security-sensitive
  - Show this was logged in the audit trail

### 7. Audit Log (30s)

- Navigate to Audit Log
- Show the history of all actions: allowed and blocked
- Point out risk levels, decision badges, and timestamps
- Highlight: "Every single tool invocation is logged, whether it succeeded or was blocked"

### 8. Closing (30s)

- Return to Permissions page to show the complete picture
- Summarize: "VaultDefender demonstrates that real agent authorization needs finer boundaries than upstream providers expose. This pattern — Token Vault for credential management via token exchange, plus an app-level policy engine for enforcement — is applicable far beyond GitHub."

## Key Points to Hit

- GitHub is the primary sign-in path — signing in through Auth0 stores the GitHub token in Token Vault
- Auth0 Token Vault handles credentials via **access token exchange** (RFC 8693) — the app never stores tokens
- **Custom API Client** proves the backend is authorized before any GitHub token is released
- **GitHub permissions** are set during OAuth authorization, not via Token Vault scopes
- Policy engine is the central guard — every tool call passes through it
- GitHub gives repo-level permissions; VaultDefender adds path-level restrictions on top
- High-risk actions require human approval
- Full audit trail for compliance and transparency
- The pattern is generalizable to any third-party API, not just GitHub
