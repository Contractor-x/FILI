-- =============================================================================
-- Phase 4.5 — Customer account/profile fields
-- =============================================================================
-- Paste this into the Supabase SQL Editor and run. Safe to re-run.
--
-- Adds the profile fields customers manage on their account page. The Phase 1
-- "Own profile update" RLS policy already covers these columns.

alter table profiles
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text default 'Nigeria';
