-- Allow public leaderboard SELECT to join user rows for display name.
--
-- The previous _enable_rls migration only allowed app_user to read its OWN
-- user row (user_own_read policy: id = current_user_id()). leaderboardRepo
-- getTop() runs an unscoped SELECT that JOINs leaderboard_entry to user
-- to fetch user.name for pickDisplayName, so without this policy the JOIN
-- returns zero rows for everyone — the leaderboard always renders empty.
--
-- This second policy is additive: app_user can SELECT user rows where
-- isAnonymous = false (i.e. registered players who opted into the public
-- leaderboard). user_own_read still grants full read of one's own row
-- including isAnonymous=true (anon-only state during the linking window).
--
-- Defense against PII leak: column-level GRANTs restrict app_user from
-- reading email / emailVerified / image. Even though a row is selectable
-- via this policy, those three columns are simply not readable. Only the
-- columns we want public (id, name, isAnonymous, createdAt) are granted.

create policy "user_public_lookup" on "user"
  for select to app_user
  using ("isAnonymous" = false);

revoke select on "user" from app_user;
grant select (id, name, "isAnonymous", "createdAt", "updatedAt") on "user" to app_user;
