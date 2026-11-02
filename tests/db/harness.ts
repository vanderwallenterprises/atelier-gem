/**
 * Runs the real migrations against PGlite (Postgres compiled to WASM) so schema,
 * constraints, triggers and RLS policies are tested without Docker or a hosted project.
 *
 * Supabase-provided pieces (auth schema, storage schema, API roles) are replaced by a
 * minimal shim that behaves the same way for policy purposes: `auth.uid()` reads the JWT
 * subject the same way PostgREST sets it, and API calls run as `anon` / `authenticated`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

-- Hosted Supabase defaults: API roles get everything on new public objects unless revoked.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
grant select on storage.objects to anon;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export type Db = PGlite;

export async function createTestDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SHIM);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export async function createUser(db: Db, email: string, displayName = email.split("@")[0]): Promise<string> {
  const r = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify({ display_name: displayName })],
  );
  return r.rows[0].id;
}

type Role = { kind: "anon" } | { kind: "user"; id: string } | { kind: "service" };

/**
 * Run `fn` inside a transaction as the given API role. Errors propagate after rollback;
 * successful work is committed so later steps can build on it.
 */
export async function as<T>(db: Db, role: Role, fn: (tx: Db) => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    if (role.kind === "anon") {
      await db.exec("set local role anon");
    } else if (role.kind === "service") {
      await db.exec("set local role service_role");
    } else {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [role.id]);
      await db.exec("set local role authenticated");
    }
    const out = await fn(db);
    await db.exec("commit");
    return out;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}

export const anon = { kind: "anon" } as const;
export const service = { kind: "service" } as const;
export const user = (id: string) => ({ kind: "user", id }) as const;

/** Approve a pending capability (what an administrator does in the review queue). */
export async function approve(db: Db, userId: string, capability: "seller" | "maker") {
  await db.query("update public.user_capabilities set approval_status = 'approved' where user_id = $1 and capability = $2", [userId, capability]);
}

/** Make a user an approved administrator (done directly as the database owner). */
export async function makeAdmin(db: Db, userId: string) {
  await db.query(
    "insert into public.user_capabilities (user_id, capability, approval_status) values ($1, 'admin', 'approved') on conflict (user_id, capability) do update set approval_status = 'approved'",
    [userId],
  );
}
