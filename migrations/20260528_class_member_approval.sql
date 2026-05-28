-- Existing members (grandfathered ~40 accounts) default to 'approved'.
-- New joins via invite link are inserted with status='pending' by application code.
ALTER TABLE public.class_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
  CONSTRAINT class_members_status_check CHECK (status IN ('pending', 'approved'));
