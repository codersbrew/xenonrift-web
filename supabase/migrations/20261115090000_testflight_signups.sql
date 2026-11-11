-- TestFlight waitlist signups from xenonrift.com/#play.
--
-- Rows live in `private` (never exposed through PostgREST to anon or authenticated). Only the
-- testflight-signup Edge Function (service_role) calls the RPCs below.
--
-- Duplicate submissions update `platforms` and return the same success shape so callers cannot
-- enumerate who is on the list, while `confirmation_sent_at` guarantees at most one confirmation
-- email is ever sent per address.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.testflight_signups (
    email                 text primary key check (
                              char_length(email) between 3 and 254
                              and email = lower(btrim(email))
                              and email !~ '[<>[:cntrl:][:space:]]'
                              and email ~ '^[^@]+@[^@]+\.[^@]+$'
                          ),
    platforms             text[] not null check (
                              coalesce(array_length(platforms, 1), 0) between 1 and 4
                              and platforms <@ array['iphone', 'ipad', 'apple_tv', 'mac']::text[]
                          ),
    status                text not null default 'pending' check (status in ('pending', 'invited', 'unsubscribed')),
    resend_contact_id     text,
    confirmation_sent_at  timestamptz,
    invited_at            timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index testflight_signups_pending_idx
    on private.testflight_signups (created_at)
    where status = 'pending';

revoke all on private.testflight_signups from public, anon, authenticated;

-- Hourly rate-limit buckets keyed by SHA-256(client IP). Expired windows are swept on write.
create table private.testflight_signup_limits (
    ip_hash       text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
    window_start  timestamptz not null,
    attempts      integer not null default 1 check (attempts >= 1),
    primary key (ip_hash, window_start)
);

create index testflight_signup_limits_window_idx
    on private.testflight_signup_limits (window_start);

revoke all on private.testflight_signup_limits from public, anon, authenticated;

-- Records or updates one TestFlight waitlist request. Callable only by service_role.
create function public.record_testflight_signup(
    p_email     text,
    p_platforms text[],
    p_ip_hash   text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_bucket            timestamptz := date_trunc('hour', now());
    v_attempts          integer;
    v_global_attempts   bigint;
    v_email             text := lower(btrim(coalesce(p_email, '')));
    v_platforms         text[];
    v_send_confirmation boolean;
begin
    if coalesce(p_ip_hash, '') !~ '^[0-9a-f]{64}$' then
        raise exception 'invalid ip_hash';
    end if;

    delete from private.testflight_signup_limits
     where window_start < now() - interval '2 hours';

    select coalesce(sum(attempts), 0)
      into v_global_attempts
      from private.testflight_signup_limits
     where window_start = v_bucket;

    if v_global_attempts >= 2000 then
        return jsonb_build_object('rate_limited', true);
    end if;

    insert into private.testflight_signup_limits (ip_hash, window_start, attempts)
    values (p_ip_hash, v_bucket, 1)
    on conflict (ip_hash, window_start)
    do update set attempts = private.testflight_signup_limits.attempts + 1
    returning attempts into v_attempts;

    if v_attempts > 8 then
        return jsonb_build_object('rate_limited', true);
    end if;

    select coalesce(
               array_agg(p order by array_position(array['iphone', 'ipad', 'apple_tv', 'mac']::text[], p)),
               '{}'::text[]
           )
      into v_platforms
      from (select distinct unnest(coalesce(p_platforms, '{}'::text[])) as p) chosen
     where p = any(array['iphone', 'ipad', 'apple_tv', 'mac']::text[]);

    if coalesce(array_length(v_platforms, 1), 0) = 0 then
        raise exception 'at least one valid platform is required';
    end if;

    insert into private.testflight_signups (email, platforms)
    values (v_email, v_platforms)
    on conflict (email) do update
       set platforms  = excluded.platforms,
           status     = case
                            when private.testflight_signups.status = 'unsubscribed' then 'pending'
                            else private.testflight_signups.status
                        end,
           updated_at = now()
    returning (confirmation_sent_at is null) into v_send_confirmation;

    return jsonb_build_object(
        'rate_limited', false,
        'send_confirmation', v_send_confirmation
    );
end;
$$;

revoke execute on function public.record_testflight_signup(text, text[], text) from public, anon, authenticated;
grant execute on function public.record_testflight_signup(text, text[], text) to service_role;

-- Records Resend contact sync / one-time confirmation delivery metadata. Callable only by service_role.
create function public.mark_testflight_signup_emailed(
    p_email             text,
    p_resend_contact_id text,
    p_confirmation_sent boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update private.testflight_signups
       set resend_contact_id    = coalesce(nullif(btrim(p_resend_contact_id), ''), resend_contact_id),
           confirmation_sent_at = case
                                      when p_confirmation_sent then coalesce(confirmation_sent_at, now())
                                      else confirmation_sent_at
                                  end,
           updated_at           = now()
     where email = lower(btrim(coalesce(p_email, '')));
end;
$$;

revoke execute on function public.mark_testflight_signup_emailed(text, text, boolean) from public, anon, authenticated;
grant execute on function public.mark_testflight_signup_emailed(text, text, boolean) to service_role;
