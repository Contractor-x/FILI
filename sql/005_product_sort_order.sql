-- =============================================================================
-- Phase 5 — Deterministic product order (admin list == storefront grid)
-- =============================================================================
-- Paste this into the Supabase SQL Editor and run. Safe to re-run.
--
-- Adds a sort_order column and assigns 1..10 to the real products so the
-- homepage grid and the admin list always show the identical order.

alter table products
  add column if not exists sort_order integer not null default 0;

update products set sort_order = 1  where slug = 'black-up-and-down-set';
update products set sort_order = 2  where slug = 'white-up-and-down-set';
update products set sort_order = 3  where slug = 'black-hoodie';
update products set sort_order = 4  where slug = 'white-hoodie';
update products set sort_order = 5  where slug = 'fili-black-hoodie';
update products set sort_order = 6  where slug = 'fili-white-hoodie';
update products set sort_order = 7  where slug = 'black-jacket';
update products set sort_order = 8  where slug = 'white-jacket';
update products set sort_order = 9  where slug = 'black-jacket-front';
update products set sort_order = 10 where slug = 'white-jacket-front';
