# CLASSLAYER

A lightweight school administration platform. React + TypeScript + Vite + Tailwind on the front,
**Supabase (Postgres + Auth)** as the real backend. There is no demo or seeded data: you start
with an empty school.

## 1. Set up the backend (about 15 minutes)

1. Create a project at https://supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/001_init.sql`. (Run it once.)
3. **Authentication → Providers → Email**: keep "Confirm email" **on**. Under
   **Authentication → Sign In / Providers**, **turn off "Allow new users to sign up"** — accounts are
   created by you, not by the public.
4. **Authentication → URL Configuration**: set *Site URL* to your deployed address
   (and add `http://localhost:5173` for local work). Needed for password-reset links.
5. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. Run the app

```bash
cp .env.example .env      # paste the URL and anon key
npm install
npm run dev
```

Never put the `service_role` key in this app or in `.env`.

## 3. Create the first user (the Proprietor)

1. Supabase → **Authentication → Users → Add user**: your email + a password, tick *Auto Confirm User*.
2. In the SQL editor:
   ```sql
   insert into user_roles (email, full_name, role)
   values ('you@yourschool.com', 'Your Name', 'proprietor');
   ```
3. Sign in to CLASSLAYER. Then go to **Settings** to set the school name, session and term.

## 4. Adding people

A person's **role is decided by their email**, and they can only sign in once a login exists
(Supabase → Authentication → Users → Add user, *Auto Confirm* ticked, or send an invite).

| Who | Where you add them in CLASSLAYER | Then |
|---|---|---|
| Teacher | Teachers → Add Teacher (email + classes + subjects) | create a login with the same email |
| Parent | Students → Add Student (parent email) | create a login with the parent's email |
| Head of School, Head of Academics, Admin, Accountant | Settings → Users & Roles (Proprietor/Admin only) | create a login with the same email |

Typical order: Subjects → Classes (with the term fee) → Teachers → Students.

## Who can see what (enforced in the database, not just the screens)

| Role | Students | Fees & payments | Other |
|---|---|---|---|
| Proprietor, Head of School | all | yes | everything; only the Proprietor can grant any role |
| Head of Academics | all | no | academics, reports, announcements |
| School Admin | all | yes | everything except granting senior roles |
| Teacher | **only students in their assigned classes** (class teacher or assigned class) | no | attendance, assessments, results for those classes |
| Accountant | read-only names (needed to record fees) | yes | fees, finance reports |
| Parent | only their own child/children | their own child's | announcements for them |

A teacher's app never receives other classes' data at all — Postgres row-level security filters it.

## What has and hasn't been tested

- **Tested:** the migration runs on PostgreSQL 16, and `supabase/tests/rls_test.sql` verifies the table above
  (teacher A sees only their classes, teacher B only theirs, parents see only their child, unconfirmed or
  role-less emails see nothing, fee/payment triggers, append-only payments, score and attendance
  validation, role-granting limits). TypeScript compiles, the production build succeeds, and the login /
  route protection renders in a browser.
- **Not tested:** the app against a live Supabase project (I had no access to one). Expect to spend your
  first session in the app fixing small things; send me the errors and I'll fix them.

## Decisions you should confirm

- **School Admin sees all students** (they enrol students). Remove `'admin'` from `SCHOOL_WIDE_ROLES` in
  `src/lib/permissions.ts` **and** from `sees_all()` in the migration if you don't want that.
- **Head of Academics** is included as a school-wide role (you said "maybe"). Same two places to remove.
- **Accountant can read student names** because fee screens need them. They don't get the Students page.
- Single school per database. Supporting several schools later needs a `school_id` on every table.

## Known limits

- Users aren't invited from inside the app yet (that needs a server-side function with the service key).
  For now you create logins in the Supabase dashboard as above.
- The "AI" is rule-based (no language model): it computes insights and fills templates from your recorded data.
  A real LLM should be called from a server-side function, never straight from the browser.
- Only the last 120 days of attendance are loaded into the app; only the current term's fees are shown.
- Payments can't be edited or deleted (by design — correct mistakes with a note and a new entry).
  Students with payments can't be deleted; set them Inactive.
- Grading scale is fixed in `src/lib/grading.ts` (not editable in Settings yet). All subjects are offered in every class.
- PDF download uses the browser's print-to-PDF.
- No automated backups beyond Supabase's plan defaults — check the backup policy of your Supabase plan before launch.

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages): build command `npm run build`, output `dist`,
and set the two `VITE_` environment variables. `vercel.json` and `public/_redirects` already handle SPA routing.
