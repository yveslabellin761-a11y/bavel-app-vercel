# Canonical data contract

The numbered migrations in this directory define the only supported public
schema. Application code must use the following names:

| Resource | Identity/relationship | Canonical fields |
| --- | --- | --- |
| `profiles` | `id = auth.users.id` | `name`, `email`, `photos`, `onboarding_completed`, `created_at`, `updated_at` |
| `swipes` | `user_id -> profiles.id`, `target_id -> profiles.id` | `is_liked`, `is_super_like`, `created_at` |
| `matches` | `user_id -> profiles.id`, `matched_user_id -> profiles.id` | `is_archived`, `created_at`, `last_message_at` |
| `messages` | `match_id UUID -> matches.id`; `sender_id`/`receiver_id -> profiles.id` | `content`, `is_read`, `created_at`, `media_url`, `is_ephemeral`, `is_private_content`, `media_viewed_at`, `media_expires_at` |
| `blocks` | `user_id`/`blocked_user_id -> profiles.id` | `reason`, `created_at` |
| `auth_passkeys` | `user_id -> profiles.id` | `credential_id`, `public_key`, `counter`, `transports` |
| `passkey_challenges` | optional `user_id -> profiles.id` | `type`, `challenge`, `expires_at` |
| `notifications` | `user_id -> profiles.id` | `is_read`, `created_at` |
| `user_credits` | `user_id -> profiles.id` | `balance`, `updated_at` |
| `transactions` | `user_id -> profiles.id` | `amount`, `credits`, `status`, `created_at` |

Legacy aliases (`profile_id`, `target_user_id`, `text`, `read`, `timestamp`,
and `credits`) must not be used in new code. Existing deployments must apply
an explicit migration before the application is switched to this contract;
the client does not silently fall back to local data or alternate table names.
Profile synchronization uses the authenticated Supabase user ID and an upsert
on `profiles.id`; local profile IDs and emails are never accepted as identity
sources. Migration 10 removes a legacy duplicate only when exactly one profile
and one Auth user establish the same normalized email. It carries forward
non-duplicate likes, makes `id` the profile primary key, normalizes match
participant IDs, adds Auth/profile foreign keys, and enforces case-insensitive
email uniqueness. Unmappable legacy matches are removed only when no messages
or other match records depend on them; their orphan messages are removed, and
the canonical message-to-match foreign key prevents future orphans. Legacy
`profiles.user_id` and `matches.profile_id` columns are removed.

Chat images use the private `private-chat-media` Storage bucket. The server
checks match participation before issuing short-lived signed URLs. Ordinary
image objects are removed when their message row is deleted; ephemeral images
are readable only by the recipient, become unavailable immediately after their
first open, and are queued for physical deletion after viewing or expiry.
The cleanup trigger only queues object paths matching the private bucket's
`<match-uuid>/<message-uuid>.webp` naming scheme; legacy media URLs are left
untouched. For legacy deployments, apply migration 10 first and resolve any
unmappable profile rows, then apply `22_private_chat_media.sql` before deploying the server changes.
That migration also fills the canonical `messages.is_read` and
`messages.created_at` fields from legacy aliases when present.
Migration 10 removes only email duplicates it can map unambiguously to one
Auth user and aborts rather than guessing when identities are ambiguous. Run
`npm run check:migrations` to verify the remote schema without changing it.

Migration 23 requires message inserts to belong to a real match with no block
in either direction, limits authenticated message updates to marking a message
as read, and reserves profile verification, moderation and subscription fields
for trusted server operations. Discovery endpoints return an explicit public
profile allowlist; email addresses, exact coordinates and internal account
metadata are not included in profile responses. Direct clients cannot read
other profile rows; the authenticated `/api/profiles` endpoint supplies
privacy-filtered public profile data instead. The same migration normalizes
message participant IDs to UUIDs and adds profile foreign keys, aborting rather
than discarding malformed or orphaned message data. It also converts legacy
block participant names and IDs to the canonical UUID relationship.
