-- People are Google accounts, not phones (SERVER.md, "Identity", level 3): an account, its
-- sessions on any device, and the member of each group it holds. Append-only.
-- The old per-device tokens are no longer read: groups made before this had no accounts.

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  -- Google's own stable id for the person: the email can change, this does not.
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  -- The session token's SHA-256 hash: the token itself is never stored.
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_account ON sessions (account_id);

-- A sign-in in progress: the state sent to Google and back, once, within minutes.
CREATE TABLE sign_ins (
  state_hash TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- A finished sign-in waiting for the site to collect it, once, within a minute or two: the
-- session token never travels in an address, only this code does.
CREATE TABLE login_codes (
  code_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

ALTER TABLE members ADD COLUMN account_id TEXT REFERENCES accounts (id) ON DELETE SET NULL;
-- A name waiting for its person: the first account with this verified email takes it (the
-- seeded archive group's owner). Lower case; never shown.
ALTER TABLE members ADD COLUMN claim_email TEXT;
-- One member per account in a group.
CREATE UNIQUE INDEX members_account ON members (group_id, account_id) WHERE account_id IS NOT NULL;
