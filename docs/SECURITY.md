# Security & Environment Variables

## Important Security Notice

**NEVER commit API keys, secrets, or credentials to Git!**

This project has been configured to use environment variables for all sensitive data.

## Setup Instructions

### 1. Create `.env` file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Fill in your credentials

Edit `.env` and replace the placeholder values with your actual credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
EXPO_PUBLIC_GEMINI_API_KEY=your_actual_gemini_key
EXPO_PUBLIC_GROQ_API_KEY=your_actual_groq_key
EXPO_PUBLIC_ADMIN_CODE=your_admin_code
EXPO_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. EAS Build Configuration

For EAS builds, set environment variables using EAS Secrets:

```bash
# Set secrets for EAS
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_SERVICE_KEY --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_ADMIN_CODE --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_APP_URL --value "your_value"
```

Then update `eas.json` to reference these secrets:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$EXPO_PUBLIC_SUPABASE_ANON_KEY"
      }
    }
  }
}
```

## What to Keep Secret

### Critical (NEVER expose):
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `EXPO_PUBLIC_GROQ_API_KEY` - AI API key
- `EXPO_PUBLIC_GEMINI_API_KEY` - AI API key
- `EXPO_PUBLIC_ADMIN_CODE` - Admin access code

### Public (Safe to expose in client):
- `EXPO_PUBLIC_SUPABASE_URL` - Public Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Anon key (protected by RLS)

## If Keys Were Exposed

If you accidentally committed secrets:

1. **Rotate all exposed keys immediately**:
   - Supabase: Generate new keys in project settings
   - Groq/Gemini: Revoke and create new API keys

2. **Remove from Git history**:
```bash
# Remove the commit with secrets
git reset --soft HEAD~1

# Or use git-filter-repo to remove from history
git filter-repo --path app.json --invert-paths
git filter-repo --path eas.json --invert-paths
```

3. **Force push** (if already pushed):
```bash
git push --force origin main
```

## Best Practices

1. Always use `.env` for local development
2. Use EAS Secrets for builds
3. Use Vercel Environment Variables for web deployment
4. Never hardcode secrets in source files
5. Add `.env` to `.gitignore` (already done)
6. Regularly rotate API keys
7. Use different keys for development and production

## Vercel Deployment

Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select appropriate environments (Production, Preview, Development)
