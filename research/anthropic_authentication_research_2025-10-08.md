# Anthropic Claude API Authentication Research
**Research Date:** October 8, 2025
**Focus:** Subscription-based login vs API Keys for web applications

---

## EXECUTIVE SUMMARY

### Feasibility Assessment: **NO** (with alternatives)

Anthropic **does not provide native OAuth 2.0 authentication** for end-user web applications to access the API using Claude Pro/Team/Max subscriptions. The two authentication systems are completely separate:

1. **Claude.ai Subscription** - Browser-based login (Pro/Team/Max plans) - $17-20/month
2. **Anthropic API** - API key authentication via Console - Pay-per-token pricing

**Key Finding:** Users cannot authenticate to the Anthropic API using their Claude subscription credentials via OAuth. The subscription and API access are separate products with separate billing.

**Confidence Level:** HIGH - Confirmed across official documentation, support articles, and community discussions.

---

## 1. AUTHENTICATION METHODS (October 2025)

### Official Anthropic API Authentication

#### ✅ API Key Authentication (Standard)
- **Method:** Static API key via `x-api-key` header
- **Source:** Anthropic Console (console.anthropic.com)
- **Format:** `x-api-key: sk-ant-xxxxx`
- **Billing:** Pay-per-token pricing
- **Use Case:** Production applications, developer tools

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY']
});
```

#### ✅ Dynamic API Keys with Helper Scripts
- **Method:** Rotate keys programmatically
- **Use Case:** Enterprise environments, vault integration
- **Implementation:** Shell script returns fresh API key

```bash
# Example: Fetch from vault
vault kv get -field=api_key secret/litellm/claude-code
```

#### ✅ Enterprise SSO (Console Access Only)
- **Method:** SAML/OIDC for console.anthropic.com
- **Feature:** Domain Capture, Single Sign-On, JIT Provisioning
- **Plan Required:** Enterprise plan only
- **Scope:** Console access, not API access
- **URL:** `console.anthropic.com/login?sso=true`

### OAuth Authentication (Limited Availability)

#### ⚠️ OAuth for Claude Code CLI Tool ONLY
- **Client ID:** `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- **Method:** OAuth 2.1 with PKCE
- **Use Case:** Claude Code CLI authentication for Pro/Max users
- **Storage:** OAuth tokens in `~/.claude/credentials.json`
- **Limitation:** Not available for third-party web applications

**Important:** This OAuth flow is ONLY for Anthropic's official Claude Code tool, not for general API access.

#### ❌ No OAuth for General Web Applications
- Anthropic does NOT offer "Sign in with Anthropic" for third-party apps
- No OAuth provider for end-user authentication
- No way to use subscription credentials for API access

---

## 2. SUBSCRIPTION VS API KEY - DETAILED COMPARISON

### Authentication & Access

| Aspect | Claude Subscription | Anthropic API |
|--------|-------------------|---------------|
| **Authentication** | Browser login (email/password) | API key (x-api-key header) |
| **Access Method** | claude.ai web interface | REST API programmatic access |
| **OAuth Support** | Only for Claude Code CLI | No (API keys only) |
| **Multi-user Auth** | Individual user accounts | Shared API keys or proxy pattern |

### Pricing Structure

| Aspect | Claude Subscription | Anthropic API |
|--------|-------------------|---------------|
| **Model** | Fixed monthly fee | Pay-per-token consumption |
| **Pro Plan** | $20/month (or $17/month annually) | ~$3 per million input tokens (Sonnet 4) |
| **Predictability** | 100% predictable costs | Variable based on usage |
| **Budget Control** | Automatic (monthly cap) | Requires tracking/limits |
| **Cost for High Usage** | Better for heavy users | Can be expensive at scale |

### Technical Capabilities

| Aspect | Claude Subscription | Anthropic API |
|--------|-------------------|---------------|
| **Context Window** | 200K tokens | 1M tokens (5x larger!) |
| **Model Access** | Sonnet 4 + multiple models | All API models + early access |
| **Rate Limits** | Shared with Claude Code usage | Dedicated API limits |
| **Integration** | Limited (web only) | Full programmatic access |
| **Streaming** | Web interface only | Full streaming API support |

### Privacy & Data Usage

| Aspect | Claude Subscription | Anthropic API |
|--------|-------------------|---------------|
| **Training Data** | May be used for training (as of Aug 2025) | NOT used for training |
| **Privacy Policy** | Consumer terms apply | Enterprise data protection |
| **Data Retention** | Per consumer policy | Per API policy (more protective) |
| **Compliance** | Standard consumer | Enterprise-grade options |

### Key Insights

**When to Use Subscription:**
- Predictable monthly costs preferred
- Primarily web-based usage
- Personal or small team use
- Don't need programmatic access
- Usage fits within plan limits

**When to Use API:**
- Need programmatic integration
- Require 1M token context window
- Privacy/compliance requirements
- Variable usage patterns
- Multi-provider architecture needed

---

## 3. WEB AUTH FLOW FEASIBILITY

### ❌ Direct Anthropic OAuth - NOT AVAILABLE

**Finding:** Anthropic does NOT provide OAuth 2.0 for third-party web applications.

**Evidence:**
- No OAuth documentation in Anthropic API docs
- Support article explicitly states: "I subscribe to a paid Claude.ai Plan. Why do I have to pay separately for API usage on Console?" - Answer confirms they are separate systems
- OAuth implementation only exists for Claude Code CLI (internal tool)
- No "Sign in with Anthropic" option for developers

### ⚠️ Reverse Engineering (Not Recommended)

**Unofficial Methods Found:**
- Session token extraction from claude.ai
- Proxy requests through `claude.ai/api/organizations/[org-id]/proxy/v1/messages`
- GitHub projects: "Claude-3-Opus-Free-Reverse-Engineered-API"

**Security & Legal Risks:**
- Violates Anthropic Terms of Service
- Session tokens can expire unpredictably
- No guarantee of stability
- Potential account suspension
- Security vulnerabilities

**Recommendation:** DO NOT USE for production applications

### ✅ Recommended Alternative: Backend Proxy Pattern

**Architecture:**
```
User → Your Web App → Your Backend Proxy → Anthropic API
     (OAuth/JWT)      (Your auth)        (API key)
```

**Implementation:**
1. User authenticates to YOUR application (OAuth, email/password, etc.)
2. Your backend manages Anthropic API keys securely
3. Backend proxy forwards requests to Anthropic with API key
4. You control access, track usage, enforce limits

---

## 4. IMPLEMENTATION PATTERNS

### Pattern 1: Simple Backend Proxy (Recommended for MVP)

**Architecture:**
```
┌─────────┐      ┌──────────────┐      ┌─────────────┐
│ Browser │─────▶│ Your Backend │─────▶│ Anthropic   │
│         │      │ (API Key)    │      │ API         │
└─────────┘      └──────────────┘      └─────────────┘
```

**Implementation (Node.js/Express):**

```typescript
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Your authentication middleware
app.use(authenticate); // JWT, session, etc.

app.post('/api/chat', async (req, res) => {
  // Verify user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Track usage per user
  await trackUsage(req.user.id, req.body.messages);

  // Forward to Anthropic
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: req.body.messages
  });

  res.json(message);
});
```

**Pros:**
- Full control over authentication
- Hide API keys from frontend
- Track usage per user
- Implement custom rate limiting
- Easy to implement

**Cons:**
- Backend becomes bottleneck
- You manage API key security
- Additional infrastructure costs

### Pattern 2: LLM Gateway/Proxy (Recommended for Production)

**Popular Solutions:**
- **LiteLLM Proxy** - Most popular, supports 100+ providers
- **API7/APISIX** - Enterprise-grade gateway
- **Custom Lambda Proxy** - AWS serverless

**LiteLLM Architecture:**

```typescript
// Setup LiteLLM with virtual keys
const litellmConfig = {
  masterKey: 'sk-litellm-master-key',
  virtualKeys: {
    user_123: {
      models: ['claude-sonnet-4-5'],
      maxBudget: 100,
      rateLimit: '10/minute'
    }
  }
};

// Client connects to LiteLLM, not Anthropic directly
const client = new Anthropic({
  baseURL: 'https://litellm-server:4000',
  apiKey: 'virtual-key-for-user-123'
});
```

**Features:**
- ✅ Virtual keys per user
- ✅ Budget limits and tracking
- ✅ Rate limiting
- ✅ Multi-provider support (OpenAI, Anthropic, etc.)
- ✅ Audit logging
- ✅ Failover and load balancing

**Setup (Docker):**

```yaml
# docker-compose.yml
services:
  litellm:
    image: ghcr.io/berriai/litellm:latest
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - LITELLM_MASTER_KEY=sk-master-key
    ports:
      - "4000:4000"
```

### Pattern 3: Edge Function with API Key Management

**Cloudflare Workers / Vercel Edge:**

```typescript
// app/api/chat/route.ts (Next.js Edge Route)
import { Anthropic } from '@anthropic-ai/sdk';

export const runtime = 'edge';

export async function POST(req: Request) {
  // Verify authentication (JWT from header)
  const token = req.headers.get('Authorization');
  const user = await verifyToken(token);

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get user's allocated API key from KV store
  const apiKey = await env.KV.get(`apikey:${user.id}`);

  const anthropic = new Anthropic({ apiKey });

  const body = await req.json();
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: body.messages
  });

  return Response.json(message);
}
```

**Pros:**
- Low latency (edge deployment)
- Scales automatically
- No server management
- Cost-effective

**Cons:**
- Environment variable limits
- Complex key rotation
- Cold start issues

### Pattern 4: Multi-Tenant with User API Keys

**Let users provide their own API keys:**

```typescript
// User stores their own Anthropic API key
const userApiKey = await getUserApiKey(userId); // Encrypted in DB

// Use user's key for requests
const anthropic = new Anthropic({
  apiKey: userApiKey
});

// User pays for their own usage
```

**Pros:**
- No cost to you
- Users control their usage
- Scales infinitely

**Cons:**
- Requires users to have API keys
- More complex UX
- Key management burden on users

---

## 5. SECURITY CONSIDERATIONS

### API Key Security

**Storage Best Practices:**
```typescript
// ❌ NEVER expose in frontend
const anthropic = new Anthropic({
  apiKey: 'sk-ant-xxxxx' // Visible in browser!
});

// ✅ Always use backend
// Frontend → Backend (with auth) → Anthropic
```

**Key Rotation:**
```bash
# Automate key rotation with helper script
export CLAUDE_CODE_API_KEY_HELPER_TTL_MS=3600000 # 1 hour

# Script fetches fresh key from vault
vault kv get -field=api_key secret/anthropic/api-key
```

**Environment Variables:**
```bash
# Production
export ANTHROPIC_API_KEY=sk-ant-production-key

# Development
export ANTHROPIC_API_KEY=sk-ant-dev-key
```

### OAuth Security (for reference, not available for Anthropic)

**PKCE Flow (used by Claude Code):**
```
1. Generate code_verifier (random string)
2. Create code_challenge = SHA256(code_verifier)
3. Authorization request with code_challenge
4. Exchange code with code_verifier
5. Receive access token
```

**Token Storage:**
```typescript
// ❌ NEVER in localStorage
localStorage.setItem('token', accessToken);

// ✅ httpOnly cookies (backend sets)
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

### Rate Limiting

**Per-User Limits:**
```typescript
// Redis-based rate limiting
const rateLimiter = new RateLimiter({
  redis: redisClient,
  points: 10, // requests
  duration: 60, // per minute
  keyPrefix: 'user'
});

await rateLimiter.consume(userId);
```

**Token-Based Limits:**
```typescript
// Track token usage
const usage = await getMonthlyUsage(userId);
const MAX_TOKENS_PER_MONTH = 1_000_000;

if (usage.tokens > MAX_TOKENS_PER_MONTH) {
  throw new Error('Monthly token limit exceeded');
}
```

---

## 6. ALTERNATIVE SOLUTIONS

### Option 1: LiteLLM Proxy (Recommended)

**Why:** Industry-standard LLM gateway with built-in auth

```bash
# Install
docker run -p 4000:4000 \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  -e LITELLM_MASTER_KEY=sk-master \
  ghcr.io/berriai/litellm:latest
```

**Virtual Key Management:**
```bash
# Create virtual key for user
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer sk-master" \
  -d '{
    "user_id": "user_123",
    "max_budget": 100,
    "models": ["claude-sonnet-4-5"]
  }'

# Response: { "key": "sk-litellm-user123-xxx" }
```

**Frontend Usage:**
```typescript
// User gets their own virtual key
const client = new Anthropic({
  baseURL: 'http://localhost:4000',
  apiKey: userVirtualKey // Specific to this user
});
```

### Option 2: Custom Lambda Authorizer

**AWS API Gateway + Lambda:**

```typescript
// Lambda Authorizer
export const handler = async (event) => {
  const token = event.authorizationToken;

  // Verify JWT/session
  const user = await verifyAuth(token);

  // Return policy
  return {
    principalId: user.id,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: event.methodArn
      }]
    },
    context: {
      userId: user.id,
      apiKey: await getApiKey(user.id)
    }
  };
};
```

**Integration:**
```typescript
// API Gateway passes context to backend
const apiKey = event.requestContext.authorizer.apiKey;
const anthropic = new Anthropic({ apiKey });
```

### Option 3: User-Provided API Keys

**UI Flow:**
```typescript
// User settings page
<form onSubmit={saveApiKey}>
  <input
    type="password"
    placeholder="Enter your Anthropic API key"
    value={apiKey}
  />
  <button>Save</button>
</form>

// Encrypt and store
const encrypted = await encrypt(apiKey, user.id);
await db.userSettings.update({
  userId: user.id,
  encryptedApiKey: encrypted
});
```

**Usage:**
```typescript
// Decrypt and use
const apiKey = await decrypt(user.encryptedApiKey);
const anthropic = new Anthropic({ apiKey });
```

### Option 4: Hybrid Approach

**Free tier + Paid upgrades:**

```typescript
// Default: Your API key (limited)
let apiKey = process.env.ANTHROPIC_API_KEY;
let maxTokens = 1000; // Limited for free users

// Premium: User's API key (unlimited)
if (user.isPremium && user.customApiKey) {
  apiKey = await decrypt(user.customApiKey);
  maxTokens = 100000; // Higher limit
}

const anthropic = new Anthropic({ apiKey });
```

---

## 7. PROS/CONS COMPARISON

### Backend Proxy Pattern

**Pros:**
- ✅ Complete control over authentication
- ✅ Hide API keys from frontend
- ✅ Custom rate limiting and budgets
- ✅ Track usage per user
- ✅ Easy to implement
- ✅ Works with any auth system (OAuth, JWT, etc.)

**Cons:**
- ❌ Backend becomes single point of failure
- ❌ Additional infrastructure costs
- ❌ You manage API key security
- ❌ Scaling complexity
- ❌ Latency (extra hop)

### LLM Gateway (LiteLLM)

**Pros:**
- ✅ Enterprise-grade features
- ✅ Multi-provider support (OpenAI, Anthropic, etc.)
- ✅ Built-in virtual keys
- ✅ Budget tracking and alerts
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Failover and load balancing

**Cons:**
- ❌ Additional service to maintain
- ❌ Learning curve
- ❌ Potential vendor lock-in
- ❌ Infrastructure overhead

### User-Provided API Keys

**Pros:**
- ✅ No cost to platform owner
- ✅ Users control their spend
- ✅ Infinite scalability
- ✅ No API key management burden

**Cons:**
- ❌ Complex UX (users need keys)
- ❌ Friction in onboarding
- ❌ Support burden (key issues)
- ❌ Security risks if not encrypted properly

### Reverse Engineering (AVOID)

**Pros:**
- ✅ Use subscription instead of API
- ✅ No separate API costs

**Cons:**
- ❌ Violates Terms of Service
- ❌ Risk of account suspension
- ❌ Unstable (can break anytime)
- ❌ Security vulnerabilities
- ❌ Legal liability
- ❌ No support

---

## 8. RECOMMENDATION FOR PROMPT FLOW BUILDER

### Recommended Architecture: **Backend Proxy with Optional User Keys**

**Phase 1: MVP (Backend Proxy)**
```
User Authentication (Your OAuth/JWT)
         ↓
   Your Backend
         ↓
   Anthropic API (Your Key)
```

**Implementation:**
1. Implement standard user authentication (Auth0, Clerk, NextAuth, etc.)
2. Create backend API route that proxies to Anthropic
3. Track usage per user in database
4. Implement rate limits (e.g., 100 requests/day for free tier)

**Phase 2: Scale (User API Keys)**
```
Premium Users → Their API Keys
Free Users → Your API Key (limited)
```

**Implementation:**
1. Add "API Key Settings" page
2. Encrypt and store user's API keys
3. Free tier uses your key with limits
4. Premium users use their keys (unlimited)

### Security Checklist

- [ ] Never expose API keys in frontend code
- [ ] Use environment variables for keys
- [ ] Implement proper user authentication (JWT/session)
- [ ] Encrypt user-provided API keys in database
- [ ] Add rate limiting per user
- [ ] Track token usage and enforce budgets
- [ ] Log all API requests for audit
- [ ] Use HTTPS only
- [ ] Implement CORS properly
- [ ] Rotate API keys regularly
- [ ] Monitor for abuse patterns

### Cost Management

**Estimate Costs:**
```
Sonnet 4: $3/million input tokens, $15/million output

Average conversation:
- Input: 1000 tokens
- Output: 500 tokens
- Cost: $0.003 + $0.0075 = $0.01 per conversation

1000 users × 10 conversations/day = 10,000 conversations
Daily cost: $100
Monthly cost: $3,000
```

**Mitigation:**
1. Start with free tier (your key, limited usage)
2. Offer premium tier (user's key, unlimited)
3. Implement aggressive caching
4. Use smaller models where appropriate
5. Add token limits per request

---

## 9. EXAMPLE IMPLEMENTATION

### Next.js App Router Example

**Backend Route (app/api/chat/route.ts):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth'; // Your auth library
import { trackUsage, checkRateLimit } from '@/lib/usage';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await auth(req);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check rate limit
  const allowed = await checkRateLimit(session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  const body = await req.json();

  try {
    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: body.messages
    });

    // Track usage
    await trackUsage({
      userId: session.user.id,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cost: calculateCost(message.usage)
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      { error: 'API request failed' },
      { status: 500 }
    );
  }
}

function calculateCost(usage: { input_tokens: number; output_tokens: number }) {
  const INPUT_COST = 3 / 1_000_000; // $3 per million
  const OUTPUT_COST = 15 / 1_000_000; // $15 per million

  return (
    usage.input_tokens * INPUT_COST +
    usage.output_tokens * OUTPUT_COST
  );
}
```

**Frontend Component:**

```typescript
'use client';

import { useState } from 'react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    setLoading(true);

    const newMessages = [
      ...messages,
      { role: 'user', content: input }
    ];

    setMessages(newMessages);

    try {
      // Call YOUR backend, not Anthropic directly
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Your auth token is sent automatically via cookies
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!res.ok) {
        if (res.status === 429) {
          alert('Rate limit exceeded. Please try again later.');
          return;
        }
        throw new Error('Request failed');
      }

      const data = await res.json();

      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.content[0].text }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={loading}
        placeholder="Type a message..."
      />

      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

**Rate Limiting (lib/usage.ts):**

```typescript
import { redis } from './redis';

export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}:${Date.now() / 60000 | 0}`; // Per minute
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 60); // Expire after 1 minute
  }

  return current <= 10; // Max 10 requests per minute
}

export async function trackUsage(data: {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}) {
  await db.usage.create({
    data: {
      userId: data.userId,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost,
      timestamp: new Date()
    }
  });
}
```

---

## 10. REFERENCES & SOURCES

### Official Documentation
1. [Anthropic API Overview](https://docs.anthropic.com/en/api/overview) - Official API authentication methods
2. [Anthropic API Authentication](https://docs.claude.com/en/api/overview) - x-api-key header specification
3. [Claude Code Settings](https://docs.anthropic.com/en/docs/claude-code/settings) - OAuth token usage for CLI
4. [LLM Gateway Configuration](https://docs.anthropic.com/en/docs/claude-code/llm-gateway) - Proxy patterns
5. [Enterprise SSO Setup](https://support.anthropic.com/en/articles/10280258-setting-up-single-sign-on-on-the-api-console) - Console SSO

### Technical Resources
6. [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) - Official SDK with auth examples
7. [LiteLLM Documentation](https://docs.litellm.ai/docs/simple_proxy) - LLM gateway implementation
8. [API Gateway LLM Patterns](https://api7.ai/learning-center/api-gateway-guide/api-gateway-proxy-llm-requests) - Proxy architecture
9. [MCP OAuth Specification](https://modelcontextprotocol.io/specification/2025-03-26) - OAuth 2.1 for MCP servers
10. [Stytch MCP Auth Guide](https://stytch.com/blog/MCP-authentication-and-authorization-guide/) - Authentication patterns

### Community Discussions
11. [Stack Overflow: Claude Code with API Key](https://stackoverflow.com/questions/79629224/how-do-i-use-claude-code-with-an-existing-anthropic-api-key)
12. [GitHub Issue #6058: OAuth Not Supported](https://github.com/anthropics/claude-code/issues/6058)
13. [Subscription vs API Key](https://claudelog.com/faqs/what-is-the-difference-between-claude-api-and-subscription/)
14. [Support Article: Separate Billing](https://support.anthropic.com/en/articles/9876003-i-subscribe-to-a-paid-claude-ai-plan-why-do-i-have-to-pay-separately-for-api-usage-on-console)

### Security & Best Practices
15. [API Key Best Practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)
16. [Microsoft LLM Security Planning](https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/generative-ai/mlops-in-openai/security/security-plan-llm-application)
17. [GitGuardian LLM Gateway](https://blog.gitguardian.com/building-a-secure-llm-gateway/)

### Alternative Implementations (Educational Only)
18. [Reverse Engineering Claude](https://www.reidbarber.com/blog/reverse-engineering-claude-code) - Technical analysis
19. [Claude Code Deep Dive](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/) - Architecture study
20. [Simon Willison: Claude Updates](https://simonwillison.net/2025/Jul/31/updates-to-claude/) - API analysis

### Tools & Libraries
21. [LiteLLM Proxy Server](https://github.com/BerriAI/litellm) - Open source LLM gateway
22. [Kaiban LLM Proxy](https://github.com/kaiban-ai/kaiban-llm-proxy) - Multi-provider proxy
23. [Anthropic Quickstarts](https://github.com/anthropics/anthropic-quickstarts) - Official examples
24. [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) - Code snippets

---

## CONCLUSION

**For a web-based prompt flow builder:**

### What You CAN Do:
1. ✅ Implement your own OAuth/JWT user authentication
2. ✅ Use backend proxy pattern with Anthropic API keys
3. ✅ Create virtual keys per user (via LiteLLM or custom)
4. ✅ Track usage and enforce budgets
5. ✅ Let premium users provide their own API keys

### What You CANNOT Do:
1. ❌ Use "Sign in with Anthropic" for end users
2. ❌ Access API with Claude Pro subscription credentials
3. ❌ Implement OAuth flow directly to Anthropic
4. ❌ Share subscription usage via API

### Recommended Path:
1. **Start:** Backend proxy with your API key + basic auth
2. **Scale:** Add user-provided API keys for premium users
3. **Optimize:** Implement LiteLLM gateway for enterprise features
4. **Monitor:** Track costs and enforce limits aggressively

**Security is paramount:** Never expose API keys to frontend, always authenticate users through your system, and encrypt any stored credentials.

The separation between Claude subscriptions and API access is intentional and unlikely to change. Design your architecture accordingly.
