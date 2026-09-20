# DentalOS KSoR Deployment Guide

## Architecture

The DentalOS knowledge system has three deployed components:

1. **KSoR Static Site** — The human-readable documentation site (Fumadocs)
2. **KSoR MCP Server** — The agent-facing API (ksor serve)
3. **Admin Dashboard** — The knowledge management UI (Next.js + Clerk)

## Prerequisites

- Vercel account with project access
- NeonDB production database
- Gemini API key (for embeddings)
- Clerk publishable key (for admin auth)

## Environment Variables

### Production NeonDB

```bash
# Get connection string from Neon dashboard
KSOR_DB_URL=postgresql://neondb_owner:xxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Gemini API Key

```bash
GEMINI_API_KEY=your_gemini_api_key
```

### Clerk Authentication

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
```

## Deployment Steps

### 1. Initialize Git Repository

```bash
cd my-knowledge-sor
git init
git add .
git commit -m "Initial KSoR setup for DentalOS"
```

### 2. Deploy KSoR Static Site

#### Option A: Standalone Vercel Project

```bash
# From my-knowledge-sor/
npx vercel --prod
```

#### Option B: Route in Existing DentalOS App

Add to your existing Next.js app's `next.config.js`:

```javascript
// next.config.js
module.exports = {
  // ... existing config
  async rewrites() {
    return [
      {
        source: '/knowledge/:path*',
        destination: 'https://your-ksor-site.vercel.app/docs/:path*',
      },
    ];
  },
};
```

### 3. Deploy MCP Server

The MCP server runs as a separate container. Use the provided `Dockerfile`:

```bash
# Build the image
docker build -t dentalos-ksor-mcp .

# Test locally
docker run --rm -p 8080:80 \
  --env-file .env \
  -e KSOR_AUTH=disabled-public \
  dentalos-ksor-mcp

# Push to container registry
docker tag dentalos-ksor-mcp your-registry/dentalos-ksor-mcp:latest
docker push your-registry/dentalos-ksor-mcp:latest
```

Deploy to your preferred container platform (Cloud Run, Fly.io, etc.).

### 4. Deploy Admin Dashboard

```bash
cd admin-dashboard
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_KSOR_MCP_URL` (your MCP server URL)
- `PLATFORM_ADMIN_IDS` (comma-separated Clerk user IDs)

### 5. Production Database Setup

```bash
# Connect to production database
export KSOR_DB_URL="your_production_db_url"

# Apply schema
npm run provision

# Ingest knowledge corpus
npm run refresh

# Calibrate abstention floor
npx ksor calibrate --instance instance.md
```

### 6. Smoke Tests

After deployment, verify:

1. **Static site loads**: Visit your Vercel URL
2. **MCP server responds**: `curl -X POST https://your-mcp-url/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"cancellation policy","k":3}}}'`
3. **Admin dashboard works**: Sign in with Clerk and verify document list

## Updating Knowledge

### Edit Documents

1. Edit files in `knowledge/<clinic-slug>/`
2. Run locally: `npm run refresh`
3. Commit and push to trigger deployment

### Publish Changes

```bash
# Build with production hashes
npm run build

# Commit build.lock.json
git add build.lock.json
git commit -m "Update knowledge corpus"
git push
```

## Monitoring

### Abstention Floor Check

```bash
npx ksor calibrate --instance instance.md --check
```

### Generation Status

```bash
# Check current generation
npx ksor serve --instance instance.md 2>&1 | grep generation
```

## Rollback

If a knowledge update causes issues:

```bash
# Check out previous build.lock.json
git checkout HEAD~1 build.lock.json

# Re-deploy
npm run build
git add build.lock.json
git commit -m "Rollback knowledge corpus"
git push
```

## Troubleshooting

### "ksor-refused" errors

- Check `KSOR_DB_URL` is set and accessible
- Verify pgvector extension is enabled
- Run `npm run provision` to apply schema

### Abstention too aggressive

- Recalibrate: `npx ksor calibrate --instance instance.md`
- Check floor isn't too high for your corpus

### Admin dashboard can't connect

- Verify `NEXT_PUBLIC_KSOR_MCP_URL` points to your MCP server
- Check CORS settings if needed
- Ensure Clerk is configured correctly
