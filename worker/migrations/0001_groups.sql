-- Groups, their members, the devices that hold the members' names, the audit log, and the
-- counters behind the rate limits (SERVER.md, part 2). Append-only: a change is a new file.

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Only the hash of the invite secret is kept; the secret travels after # in the link.
  invite_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at INTEGER NOT NULL,
  UNIQUE (group_id, name)
);

CREATE TABLE devices (
  -- The device token's SHA-256 hash: the token itself is never stored.
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);
CREATE INDEX devices_member ON devices (member_id);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  at INTEGER NOT NULL,
  -- Names as they were at the time: a member who leaves stays readable in the log.
  actor TEXT,
  action TEXT NOT NULL,
  subject TEXT
);
CREATE INDEX audit_group ON audit (group_id, at);

CREATE TABLE counters (
  key TEXT PRIMARY KEY,
  until INTEGER NOT NULL,
  count INTEGER NOT NULL
);
