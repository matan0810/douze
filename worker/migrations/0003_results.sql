-- The official result of each stage (SERVER.md, part 4): set by a manager once the stage has
-- closed, as JSON checked by shared/years.ts; NULL until then. Append-only.

ALTER TABLE stages ADD COLUMN result TEXT;
