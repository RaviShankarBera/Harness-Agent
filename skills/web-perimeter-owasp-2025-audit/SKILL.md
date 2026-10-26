---
name: web-perimeter-owasp-2025-audit
description: Passive, non-destructive web perimeter security auditing across OWASP Top 10:2025 ("The 10 Gates"), CDN Unkeyed Header Web Cache Poisoning (X-Forwarded-Host), supply chain manifest exposure, git object dumping prevention (/.git/HEAD), cryptographic headers, and AI crawler boundary governance (llms.txt, robots.txt, HTTP 402). Use when auditing production domains, configuring Cloudflare/Vercel/Nginx edge security, or preparing pre-launch security gates.
metadata:
  origin: ECC
---

# Web Perimeter & OWASP Top 10:2025 Audit

Conduct non-destructive, deterministic perimeter security audits against web applications, APIs, and CDN edges. Map every finding to **OWASP Top 10:2025 ("The 10 Gates")** and verify fixes with reproducible checks before shipping to production.

## Important

- Never send destructive payloads, brute-force traffic, or unisolated cache-poisoning probes against shared production cache keys.
- Always append a unique cache-buster query parameter (`?__cb=<random_hex>`) when testing CDN cache behavior so legitimate visitors are never served a probe response.
- Verify real HTTP responses rather than relying on framework defaults; reverse proxies and CDNs frequently strip or override upstream headers.
- Treat `403 Forbidden` on directory roots (such as `/.git/`) as insufficient unless direct object paths (`/.git/HEAD`, `/.git/config`) also return `404`/`403`.

## When to Activate

- Auditing a live domain or staging environment before launch
- Reviewing Cloudflare, Vercel, AWS CloudFront, Nginx, or Next.js middleware security configurations
- Investigating CDN Web Cache Poisoning (`X-Forwarded-Host`, `X-Forwarded-Scheme`) or CORS origin reflection
- Hardening supply chain artifacts (`package-lock.json`, `.npmrc`, source maps) and AI crawler boundaries (`llms.txt`, `robots.txt`, `security.txt`)

## Audit Workflow: The 10 Gates (OWASP Top 10:2025)

### Gate 1 & Gate 2: Broken Access Control & Security Misconfiguration (A01 / A02:2025)

1. **Direct Git Object & Env Exposure (`git-dumper` vector):**
   - Disabling directory indexing on `/.git/` (`403 Forbidden`) does **not** stop repository reconstruction if `/.git/HEAD` or `/.git/config` returns `200 OK` with `ref: refs/heads/...`.
   - Probe `/.git/HEAD`, `/.env`, `/.env.local`, and `/docker-compose.yml` and ensure the response is not `200 OK` with non-HTML content.
2. **CORS Arbitrary Origin Reflection:**
   - Send `Origin: https://evil-probe.invalid`.
   - Flag **CRITICAL** if the response reflects `Access-Control-Allow-Origin: https://evil-probe.invalid` together with `Access-Control-Allow-Credentials: true`.
3. **Unkeyed Header Web Cache Poisoning (DoS / Defacement Vector):**
   - Send an isolated request with a unique cache-buster:
     ```bash
     CB=$(openssl rand -hex 8)
     curl -sI "https://example.com/?__cb=${CB}" \
       -H "X-Forwarded-Host: cache-probe.invalid" \
       -H "X-Forwarded-Scheme: nothttps"
     ```
   - Flag **HIGH** if `cache-probe.invalid` is reflected in the `Location` header or HTML body, or if an error status (`4xx`/`5xx`) is cached by the CDN (`CF-Cache-Status: HIT/MISS`, `X-Cache: Miss from cloudfront`, or `Cache-Control: public, max-age=...`) without `X-Forwarded-Host` listed in `Vary`.

### Gate 3 & Gate 8: Software Supply Chain & Data Integrity Failures (A03 / A08:2025)

1. **Public Lockfile & Registry Config Exposure:**
   - Verify that `/package.json`, `/package-lock.json`, `/pnpm-lock.yaml`, `/yarn.lock`, and `/.npmrc` return `404` or `403` in production so attackers cannot harvest your exact dependency tree (SBOM) or registry tokens.
2. **Production Source Maps & Subresource Integrity (SRI):**
   - Check whether production JavaScript bundles expose `.js.map` files containing original TypeScript/business logic.
   - Require `integrity="sha384-..."` and `crossorigin="anonymous"` on third-party `<script>` tags loaded from external CDNs.

### Gate 4 & Gate 5: Cryptographic Failures & Injection Boundaries (A04 / A05:2025)

1. **Strict Transport Security (HSTS) & TLS Posture:**
   - Verify `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (`max-age >= 31536000`) and ensure plain `http://` redirects immediately (`301`/`308`) to `https://`.
2. **Content-Security-Policy (CSP) without `'unsafe-inline'`:**
   - Verify that `Content-Security-Policy` defines `default-src`, `script-src`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors`.
   - Flag policies that allow `script-src 'unsafe-inline'` or `'unsafe-eval'` without cryptographic nonces (`'nonce-...'`) or hashes.

### Gate 6 & Gate 7: Insecure Design, Bot Governance & Auth Hardening (A06 / A07:2025)

1. **AI Crawler & Agentic Boundary Governance:**
   - Verify whether `robots.txt` explicitly defines rules for AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`) and whether `/llms.txt` or `/.well-known/agent.json` declares machine-readable usage and licensing policies.
   - Note that attackers frequently spoof `User-Agent: ChatGPT-User` to bypass naive WAF rules while probing `/.env` and `/.git/HEAD`; require reverse-DNS or cryptographic signature verification (`@stealthmark/next` / `@stealthmark/express`) before whitelisting agent traffic.
2. **Session Cookie Hardening:**
   - Any `Set-Cookie` header issuing a session or auth token must include `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), and an explicit expiration (`Max-Age` or `Expires`).

### Gate 9 & Gate 10: Telemetry & Exceptional Conditions (A09 / A10:2025)

1. **Fail-Closed Error Handling (No Stack Trace Leaks):**
   - Request a non-existent route (`/api/__probe_404_<random>`) and verify that the server returns a clean, minimal JSON or HTML error without leaking stack traces (`java.sql.SQLException`, `PrismaClientKnownRequestError`, `Traceback`, `at Object.<anonymous>`, `/var/task/`, `node_modules/`).
2. **Vulnerability Disclosure Policy (`/.well-known/security.txt`):**
   - Verify RFC 9116 compliance (`Contact:` and non-expired `Expires:` fields) at `/.well-known/security.txt`.

## Automated Verification

To run all 28 passive checks against a live domain from the terminal or CI:

```bash
# Instant passive audit via CLI
npx @stealthmark/cli audit https://example.com

# Or query the JSON scorecard endpoint directly
curl -s "https://stealthmark.io/api/scan/audit?domain=example.com" | jq '{grade: .grade, score: .score, failed: [.checks[] | select(.status == "fail") | {id, title, severity, owaspGate}]}'
```

## Remediation Reference (Next.js / Edge)

```typescript
// next.config.ts — baseline perimeter headers & .git/.env/lockfile blocking
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Vary", value: "Accept-Encoding, Origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```
