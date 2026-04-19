# Admin Migration to Database - Deployment Guide

## Overview
You're migrating the admin authentication from a hardcoded passcode in `.env` to a database-driven system. This allows you to:
1. Manage multiple admin passcodes
2. Enable/disable passcodes
3. Track passcode usage
4. Deploy admin side live with database-backed authentication

## Step 1: Run Database Migration

### Option A: Simple Migration (Recommended)
Run this SQL in your Supabase SQL Editor:

```sql
-- 1. Create admin_passcodes table
CREATE TABLE IF NOT EXISTS admin_passcodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert current passcode from .env
INSERT INTO admin_passcodes (passcode, name, description, is_active)
VALUES ('ctu-admin-2025', 'Main Admin Passcode', 'Default admin portal access code', true)
ON CONFLICT (passcode) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE admin_passcodes ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone to validate passcodes (read-only)
CREATE POLICY "Anyone can validate passcodes"
  ON admin_passcodes FOR SELECT
  USING (true);

-- 5. Only superadmin can manage passcodes
CREATE POLICY "Superadmin can manage passcodes"
  ON admin_passcodes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  );
```

### Option B: Advanced Migration (with RPC functions)
Use `migrate-admin-to-db.sql` for more advanced features.

## Step 2: Update Environment Variables

Remove or comment out the hardcoded admin code from `.env`:

```env
# Old: EXPO_PUBLIC_ADMIN_CODE=ctu-admin-2025
# New: Admin code is now in database
# EXPO_PUBLIC_ADMIN_CODE=ctu-admin-2025
```

## Step 3: Test the Migration

1. **Test admin login**: Go to `/admin` and enter `ctu-admin-2025`
2. **Check database**: Verify the passcode exists in `admin_passcodes` table
3. **Test new features**: 
   - Go to `/admin/passcodes` to manage passcodes
   - Try adding a new passcode
   - Test login with new passcode

## Step 4: Deploy to Web

```bash
# Build web version
npx expo export --platform web

# Deploy to Vercel
vercel --prod
```

## Step 5: Post-Deployment Tasks

1. **Change default passcode**: After deployment, change the default passcode
2. **Add admin users**: Create actual admin users in the `admins` table
3. **Set up monitoring**: Check audit logs for admin access
4. **Backup passcodes**: Export passcodes for safekeeping

## Security Considerations

1. **Rotate passcodes regularly**: Change admin passcodes every 90 days
2. **Use strong passcodes**: Minimum 12 characters, mix of characters
3. **Limit active passcodes**: Only keep necessary passcodes active
4. **Monitor usage**: Check audit logs for suspicious activity
5. **IP restrictions**: Consider adding IP whitelisting for admin portal

## Troubleshooting

### Issue: "Error validating passcode"
- Check if `admin_passcodes` table exists
- Verify passcode is in the database and `is_active = true`
- Check Supabase connection in `lib/supabaseAdmin.js`

### Issue: Can't access `/admin/passcodes`
- Make sure you're logged in as superadmin
- Check RLS policies on `admin_passcodes` table
- Verify user exists in `admins` table with `role = 'superadmin'`

### Issue: Web deployment fails
- Check Vercel project settings
- Verify environment variables are set
- Check build logs for errors

## Rollback Plan

If something goes wrong:

1. **Revert code changes**: Restore `app/admin/_layout.js` to original
2. **Re-enable .env passcode**: Uncomment `EXPO_PUBLIC_ADMIN_CODE` in `.env`
3. **Keep database**: The `admin_passcodes` table won't break anything

## Support
For issues, check:
1. Supabase logs in Dashboard → Logs
2. Vercel deployment logs
3. Browser console for web errors