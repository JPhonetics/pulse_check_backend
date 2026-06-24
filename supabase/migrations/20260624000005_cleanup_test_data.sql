-- Remove orphaned test data before linking public.user to auth.users.
-- The test user id does not exist in auth.users, so it would violate the FK
-- constraint added in the next migration. Dependents are deleted first.
DELETE FROM saved_article WHERE user_id = '4ecef7b4-6ac7-4688-97cf-edeeadbb00a8';
DELETE FROM saved_search  WHERE user_id = '4ecef7b4-6ac7-4688-97cf-edeeadbb00a8';
DELETE FROM public.user   WHERE id      = '4ecef7b4-6ac7-4688-97cf-edeeadbb00a8';
