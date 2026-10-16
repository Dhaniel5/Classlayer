-- ============================================================
-- CLASSLAYER — initial schema, access rules (RLS) and triggers
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Single-school deployment. No demo data is inserted.
-- ============================================================

-- ---------- Tables ----------
create table public.school_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'My School',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  current_session text not null default '2026/2027',
  current_term text not null default 'First Term'
    check (current_term in ('First Term','Second Term','Third Term')),
  updated_at timestamptz not null default now()
);
insert into public.school_settings (id) values (1);

-- Staff roles (teachers and parents are recognised by their email on the
-- teachers / parents tables, so they do not need a row here).
create table public.user_roles (
  email text primary key check (email = lower(email)),
  full_name text not null default '',
  role text not null check (role in
    ('proprietor','head_of_school','head_of_academics','admin','accountant')),
  created_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null check (email = lower(email)),
  phone text not null default '',
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);
create unique index teachers_email_key on public.teachers (email);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level text not null default '',
  class_teacher_id uuid references public.teachers(id) on delete set null,
  term_fee numeric(12,2) not null default 0 check (term_fee >= 0),
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.teacher_classes (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);
create table public.teacher_subjects (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (teacher_id, subject_id)
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null default '',
  email text check (email is null or email = lower(email)),
  created_at timestamptz not null default now()
);
create unique index parents_email_key on public.parents (email) where email is not null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  first_name text not null,
  last_name text not null,
  gender text not null check (gender in ('Male','Female')),
  date_of_birth date not null,
  class_id uuid not null references public.classes(id) on delete restrict,
  address text not null default '',
  admission_date date not null default current_date,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);
create index students_class_idx on public.students (class_id);

create table public.student_parents (
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  primary key (student_id, parent_id)
);
create index student_parents_parent_idx on public.student_parents (parent_id);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  status text not null check (status in ('Present','Absent','Late')),
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
create index attendance_class_date_idx on public.attendance (class_id, date);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  type text not null check (type in ('Test','Assignment','Mid-term','Examination')),
  max_score numeric(6,2) not null check (max_score > 0),
  date date not null,
  term text not null,
  session text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index assessments_class_idx on public.assessments (class_id, subject_id);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  term text not null,
  session text not null,
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'Outstanding'
    check (status in ('Paid','Partially Paid','Outstanding')),
  unique (student_id, term, session)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT: a student or fee that has payments can never be deleted (financial audit trail).
  fee_id uuid not null references public.fees(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null check (method in ('Cash','Bank Transfer','Card','Cheque')),
  reference text not null,
  note text,
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null check (audience in ('All Parents','Specific Class','Teachers','Staff')),
  class_id uuid references public.classes(id) on delete cascade,
  created_by uuid default auth.uid(),
  created_by_name text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now(),
  check (audience <> 'Specific Class' or class_id is not null)
);

-- ---------- Identity helpers (SECURITY DEFINER: they bypass RLS on purpose) ----------
create function public.jwt_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create function public.email_confirmed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u
                 where u.id = auth.uid() and u.email_confirmed_at is not null)
$$;

create function public.current_teacher_id() returns uuid
language sql stable security definer set search_path = public as $$
  select t.id from public.teachers t
  where t.email = public.jwt_email() and t.status = 'Active' and public.email_confirmed()
$$;

create function public.current_parent_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.parents p
  where p.email = public.jwt_email() and public.email_confirmed()
$$;

create function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select case when not public.email_confirmed() then null else coalesce(
    (select ur.role from public.user_roles ur where ur.email = public.jwt_email()),
    case when public.current_teacher_id() is not null then 'teacher' end,
    case when public.current_parent_id() is not null then 'parent' end
  ) end
$$;

-- Who may see EVERY student in the school.
create function public.sees_all() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in
    ('proprietor','head_of_school','head_of_academics','admin'), false)
$$;

create function public.is_finance() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in
    ('proprietor','head_of_school','admin','accountant'), false)
$$;

create function public.my_class_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.classes c where c.class_teacher_id = public.current_teacher_id()
  union
  select tc.class_id from public.teacher_classes tc where tc.teacher_id = public.current_teacher_id()
$$;

create function public.my_class_student_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.students s where s.class_id in (select public.my_class_ids())
$$;

create function public.my_children() returns setof uuid
language sql stable security definer set search_path = public as $$
  select sp.student_id from public.student_parents sp where sp.parent_id = public.current_parent_id()
$$;

create function public.my_children_classes() returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.class_id from public.students s where s.id in (select public.my_children())
$$;

create function public.my_students_parent_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select sp.parent_id from public.student_parents sp
  where sp.student_id in (select public.my_class_student_ids())
$$;

create function public.get_my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', public.app_role(),
    'email', public.jwt_email(),
    'linked_id', coalesce(public.current_teacher_id(), public.current_parent_id()),
    'full_name', coalesce(
      (select ur.full_name from public.user_roles ur where ur.email = public.jwt_email()),
      (select t.first_name || ' ' || t.last_name from public.teachers t where t.id = public.current_teacher_id()),
      (select p.first_name || ' ' || p.last_name from public.parents p where p.id = public.current_parent_id()),
      ''))
$$;

create function public.fee_status(due numeric, paid numeric) returns text
language sql immutable as $$
  select case when paid >= due then 'Paid' when paid > 0 then 'Partially Paid' else 'Outstanding' end
$$;

-- ---------- Triggers ----------
create function public.trg_student_fee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.fees (student_id, term, session, amount_due, amount_paid, status)
  select new.id, s.current_term, s.current_session, c.term_fee, 0, public.fee_status(c.term_fee, 0)
  from public.school_settings s join public.classes c on c.id = new.class_id
  on conflict (student_id, term, session) do nothing;
  return new;
end $$;
create trigger student_fee after insert on public.students
  for each row execute function public.trg_student_fee();

create function public.trg_payment_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.fees f where f.id = new.fee_id and f.student_id = new.student_id) then
    raise exception 'Payment does not match the student''s fee record';
  end if;
  return new;
end $$;
create trigger payment_check before insert on public.payments
  for each row execute function public.trg_payment_check();

create function public.trg_payment_apply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.fees
     set amount_paid = amount_paid + new.amount,
         status = public.fee_status(amount_due, amount_paid + new.amount)
   where id = new.fee_id;
  return new;
end $$;
create trigger payment_apply after insert on public.payments
  for each row execute function public.trg_payment_apply();

create function public.trg_class_fee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.term_fee is distinct from old.term_fee then
    update public.fees f
       set amount_due = new.term_fee, status = public.fee_status(new.term_fee, f.amount_paid)
      from public.students st, public.school_settings s
     where st.id = f.student_id and st.class_id = new.id
       and f.term = s.current_term and f.session = s.current_session;
  end if;
  return new;
end $$;
create trigger class_fee after update on public.classes
  for each row execute function public.trg_class_fee();

create function public.trg_school_term() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if new.current_term <> old.current_term or new.current_session <> old.current_session then
    insert into public.fees (student_id, term, session, amount_due, amount_paid, status)
    select st.id, new.current_term, new.current_session, c.term_fee, 0, public.fee_status(c.term_fee, 0)
    from public.students st join public.classes c on c.id = st.class_id
    where st.status = 'Active'
    on conflict (student_id, term, session) do nothing;
  end if;
  return new;
end $$;
create trigger school_term before update on public.school_settings
  for each row execute function public.trg_school_term();

create function public.trg_score_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.assessments%rowtype; sclass uuid;
begin
  select * into a from public.assessments where id = new.assessment_id;
  if new.score > a.max_score then
    raise exception 'Score % is above the maximum of %', new.score, a.max_score;
  end if;
  select class_id into sclass from public.students where id = new.student_id;
  if sclass is distinct from a.class_id then
    raise exception 'Student is not in this assessment''s class';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger score_check before insert or update on public.assessment_scores
  for each row execute function public.trg_score_check();

create function public.trg_attendance_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select class_id from public.students where id = new.student_id) is distinct from new.class_id then
    raise exception 'Student is not in this class';
  end if;
  return new;
end $$;
create trigger attendance_check before insert or update on public.attendance
  for each row execute function public.trg_attendance_check();

-- ---------- Row level security ----------
alter table public.school_settings   enable row level security;
alter table public.user_roles        enable row level security;
alter table public.teachers          enable row level security;
alter table public.classes           enable row level security;
alter table public.subjects          enable row level security;
alter table public.teacher_classes   enable row level security;
alter table public.teacher_subjects  enable row level security;
alter table public.parents           enable row level security;
alter table public.students          enable row level security;
alter table public.student_parents   enable row level security;
alter table public.attendance        enable row level security;
alter table public.assessments       enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.fees              enable row level security;
alter table public.payments          enable row level security;
alter table public.announcements     enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- school settings
create policy school_read on public.school_settings for select to authenticated
  using (public.app_role() is not null);
create policy school_update on public.school_settings for update to authenticated
  using (public.app_role() in ('proprietor','head_of_school','admin'))
  with check (public.app_role() in ('proprietor','head_of_school','admin'));

-- user roles (staff access list)
create policy roles_read on public.user_roles for select to authenticated
  using (email = public.jwt_email() or public.app_role() in ('proprietor','admin'));
create policy roles_insert on public.user_roles for insert to authenticated
  with check (public.app_role() = 'proprietor'
    or (public.app_role() = 'admin' and role in ('head_of_academics','accountant')));
create policy roles_delete on public.user_roles for delete to authenticated
  using (email <> public.jwt_email() and (public.app_role() = 'proprietor'
    or (public.app_role() = 'admin' and role in ('head_of_academics','accountant'))));

-- teachers
create policy teachers_read on public.teachers for select to authenticated
  using (public.sees_all() or public.app_role() = 'teacher');
create policy teachers_write on public.teachers for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- classes
create policy classes_read on public.classes for select to authenticated
  using (public.sees_all() or public.app_role() = 'accountant'
         or id in (select public.my_class_ids())
         or id in (select public.my_children_classes()));
create policy classes_write on public.classes for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- subjects
create policy subjects_read on public.subjects for select to authenticated
  using (public.app_role() is not null);
create policy subjects_write on public.subjects for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- teacher assignments
create policy tc_read on public.teacher_classes for select to authenticated
  using (public.sees_all() or teacher_id = public.current_teacher_id());
create policy tc_write on public.teacher_classes for all to authenticated
  using (public.sees_all()) with check (public.sees_all());
create policy ts_read on public.teacher_subjects for select to authenticated
  using (public.sees_all() or teacher_id = public.current_teacher_id());
create policy ts_write on public.teacher_subjects for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- parents
create policy parents_read on public.parents for select to authenticated
  using (public.sees_all() or id = public.current_parent_id()
         or id in (select public.my_students_parent_ids()));
create policy parents_write on public.parents for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- students  (THE rule: only school-wide roles see every student)
create policy students_read on public.students for select to authenticated
  using (public.sees_all()
         or public.app_role() = 'accountant'
         or id in (select public.my_class_student_ids())
         or id in (select public.my_children()));
create policy students_write on public.students for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

create policy sp_read on public.student_parents for select to authenticated
  using (public.sees_all()
         or parent_id = public.current_parent_id()
         or student_id in (select public.my_class_student_ids()));
create policy sp_write on public.student_parents for all to authenticated
  using (public.sees_all()) with check (public.sees_all());

-- attendance
create policy att_write on public.attendance for all to authenticated
  using (public.sees_all() or class_id in (select public.my_class_ids()))
  with check (public.sees_all() or class_id in (select public.my_class_ids()));
create policy att_parent_read on public.attendance for select to authenticated
  using (student_id in (select public.my_children()));

-- assessments
create policy assess_write on public.assessments for all to authenticated
  using (public.sees_all() or class_id in (select public.my_class_ids()))
  with check (public.sees_all() or class_id in (select public.my_class_ids()));
create policy assess_parent_read on public.assessments for select to authenticated
  using (class_id in (select public.my_children_classes()));

-- scores
create policy scores_write on public.assessment_scores for all to authenticated
  using (public.sees_all()
         or assessment_id in (select id from public.assessments
                              where class_id in (select public.my_class_ids())))
  with check (public.sees_all()
         or assessment_id in (select id from public.assessments
                              where class_id in (select public.my_class_ids())));
create policy scores_parent_read on public.assessment_scores for select to authenticated
  using (student_id in (select public.my_children()));

-- fees and payments (not visible to teachers or the head of academics)
create policy fees_read on public.fees for select to authenticated
  using (public.is_finance() or student_id in (select public.my_children()));
create policy fees_write on public.fees for all to authenticated
  using (public.is_finance()) with check (public.is_finance());
create policy pay_read on public.payments for select to authenticated
  using (public.is_finance() or student_id in (select public.my_children()));
create policy pay_insert on public.payments for insert to authenticated
  with check (public.is_finance());
-- no update/delete policy on payments: they are append-only

-- announcements
create policy ann_read on public.announcements for select to authenticated
  using (public.app_role() is not null and (
    public.sees_all()
    or (audience = 'Staff'       and public.app_role() in ('teacher','accountant'))
    or (audience = 'Teachers'    and public.app_role() = 'teacher')
    or (audience = 'All Parents' and public.app_role() in ('teacher','accountant','parent'))
    or (audience = 'Specific Class' and (
         (public.app_role() = 'parent'  and class_id in (select public.my_children_classes()))
      or (public.app_role() = 'teacher' and class_id in (select public.my_class_ids()))))
  ));
create policy ann_write on public.announcements for all to authenticated
  using (public.sees_all()) with check (public.sees_all());
