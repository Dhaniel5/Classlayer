-- ============================================================
-- CLASSLAYER — migration 002: per-school feature switches + Assignments
-- Run AFTER 001_init.sql. Safe to run once; it only adds things.
-- ============================================================

-- ---------- Per-school feature switches ----------
alter table public.school_settings
  add column features jsonb not null default '{"assignments": true}'::jsonb;

-- Is an optional module switched on for this school? (unknown modules are off)
create function public.feature_on(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (features ->> f)::boolean from public.school_settings where id = 1), false)
$$;

-- ---------- Assignments (homework done in notebooks) ----------
-- The teacher posts the task; students do it in their notebooks; the teacher then records either
-- a score or done / not done. Parents see the result. Assignments are NOT part of term results.
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date not null,
  mode text not null check (mode in ('score','done')),
  max_score numeric(6,2) check (max_score is null or max_score > 0),
  term text not null,
  session text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check ((mode = 'score') = (max_score is not null))
);
create index assignments_class_due_idx on public.assignments (class_id, due_date);

create table public.assignment_records (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('done','not_done')),
  score numeric(6,2) check (score is null or score >= 0),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assignment_records_student_idx on public.assignment_records (student_id);

create function public.trg_assignment_record_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.assignments%rowtype; sclass uuid;
begin
  select * into a from public.assignments where id = new.assignment_id;
  select class_id into sclass from public.students where id = new.student_id;
  if sclass is distinct from a.class_id then
    raise exception 'Student is not in this assignment''s class';
  end if;
  if new.status = 'not_done' then
    new.score := null;
  elsif a.mode = 'done' then
    if new.score is not null then raise exception 'This assignment is marked done / not done, not scored'; end if;
  else
    if new.score is null then raise exception 'Enter a score, or mark the student as not done'; end if;
    if new.score > a.max_score then raise exception 'Score % is above the maximum of %', new.score, a.max_score; end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger assignment_record_check before insert or update on public.assignment_records
  for each row execute function public.trg_assignment_record_check();

alter table public.assignments        enable row level security;
alter table public.assignment_records enable row level security;
grant select, insert, update, delete on public.assignments, public.assignment_records to authenticated;
grant execute on function public.feature_on(text) to authenticated;

-- Everything below also requires the module to be switched on for the school.
create policy asg_read on public.assignments for select to authenticated
  using (public.feature_on('assignments') and (
    public.sees_all()
    or class_id in (select public.my_class_ids())
    or class_id in (select public.my_children_classes())));
create policy asg_write on public.assignments for all to authenticated
  using (public.feature_on('assignments') and (public.sees_all() or class_id in (select public.my_class_ids())))
  with check (public.feature_on('assignments') and (public.sees_all() or class_id in (select public.my_class_ids())));

create policy asgr_read on public.assignment_records for select to authenticated
  using (public.feature_on('assignments') and (
    public.sees_all()
    or assignment_id in (select id from public.assignments where class_id in (select public.my_class_ids()))
    or student_id in (select public.my_children())));
create policy asgr_write on public.assignment_records for all to authenticated
  using (public.feature_on('assignments') and (public.sees_all()
    or assignment_id in (select id from public.assignments where class_id in (select public.my_class_ids()))))
  with check (public.feature_on('assignments') and (public.sees_all()
    or assignment_id in (select id from public.assignments where class_id in (select public.my_class_ids()))));
