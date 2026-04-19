# Database Schema Files

This folder contains the database schema files for the LF.things Lost & Found system.

## Files

### `admin-schema.sql`
Complete schema for admin-related tables:
- `students` - Master list of CTU Daanbantayan students
- `admins` - Admin users and their roles
- `custody_log` - Physical item custody tracking
- `audit_log` - System audit trail
- `announcements` - Admin announcements
- `admin_passcodes` - Admin access codes (if migrated)

### `supabase-schema.sql`
Main application schema (if exists):
- User profiles
- Items (lost/found)
- Matches
- Messages/chat
- Notifications

## How to Use

These files are for reference only. The database has already been set up.

### To Reset Database (Caution!)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of schema file
3. Run the SQL

### To Update Schema
1. Make changes in Supabase Dashboard
2. Export schema: `supabase db dump -f database/schema-backup.sql`
3. Commit changes to git

## Notes
- Never commit sensitive data or credentials
- Always backup before running schema changes
- Test schema changes in development first
