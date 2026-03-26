-- Helper: look up a profile's user ID by email address
-- Uses auth.users so only callable server-side (service role) or via RPC with security definer
create or replace function get_user_id_by_email(email text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users where lower(auth.users.email) = lower(email) limit 1;
$$;
