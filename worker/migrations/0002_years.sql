-- A group's years (SERVER.md, part 3): each stage of a year, its countries and its lock, and
-- each member's prediction of it. Append-only: a change is a new file.

CREATE TABLE stages (
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('final', 'semi-1', 'semi-2')),
  -- A JSON list of catalogue ids, checked by shared/years.ts before it is written.
  countries TEXT NOT NULL,
  lock_at INTEGER NOT NULL,
  joker INTEGER NOT NULL CHECK (joker IN (0, 1)),
  PRIMARY KEY (group_id, year, stage)
);

CREATE TABLE entries (
  group_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  stage TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  -- The prediction as JSON, checked against the stage by shared/years.ts.
  body TEXT NOT NULL,
  complete INTEGER NOT NULL CHECK (complete IN (0, 1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, year, stage, member_id),
  FOREIGN KEY (group_id, year, stage) REFERENCES stages (group_id, year, stage) ON DELETE CASCADE
);
