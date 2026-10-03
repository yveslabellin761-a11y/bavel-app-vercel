-- Runtime persistence for administrator controls.

DO $$
BEGIN
  IF to_regclass('public.moderation_queue') IS NOT NULL THEN
    ALTER TABLE public.moderation_queue
      DROP CONSTRAINT IF EXISTS moderation_queue_status_check;
    ALTER TABLE public.moderation_queue
      ADD CONSTRAINT moderation_queue_status_check
      CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'escalated', 'completed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_actions_created_at_desc_idx
  ON public.admin_actions(created_at DESC);
