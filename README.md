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
4. **Authentication → URL Configuration**: set *Site URL* to your deployed address (e.g.
   `https://classlayer.netlify.app`) and add these under **Redirect URLs** (the `/**` matters):
   `https://YOUR-SITE-ADDRESS/**` and `http://localhost:5173/**`.
   Invitation and password-reset links won't work without this.
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

## 4. Adding people and inviting them

A person's **role is decided by their email**. The flow is always: add them to the school, then invite them.

| Who | 1. Add them | 2. Invite them |
|---|---|---|
| Teacher | Teachers → Add Teacher (email + classes + subjects) | **Invitations** page |
| Parent | Students → Add Student (parent email) | **Invitations** page |
| Head of School, Head of Academics, Admin, Accountant | Settings → Users & Roles (Proprietor/Admin only) | **Invitations** page |

On the **Invitations** page you can invite selected people or "everyone not yet invited". Each person gets an
email with a link; they choose their own password and sign in. The page shows who is *Not invited*, *Invited
(not accepted yet)* or *Active*. Students have no login in V1 — parents see their child's information.

Who may invite whom: the Proprietor can invite anyone; the Head of School can invite teachers and parents;
the School Admin can invite teachers, parents, accountants and heads of academics. Nobody else can invite.

Forgot your password? **Forgot password?** on the login page emails a reset link to the same set-password page.
Signed-in users can change their password from the profile menu (the key icon for parents).

Typical order: Subjects → Classes (with the term fee) → Teachers → Students → Invitations.

## 5. Turn on invitations (one-time, about 10 minutes)

Invitations need a small server-side function, because sending them requires a secret key that must never be
in the website.

**a) Deploy the function** (dashboard method, no command line):
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `invite-users`. Delete any sample code, paste in the whole of
   `supabase/functions/invite-users/index.ts`, and deploy. Leave "Verify JWT" **on**.

   (Command-line alternative: `npx supabase login`, `npx supabase link --project-ref YOUR-PROJECT-REF`,
   `npx supabase functions deploy invite-users`.)

**b) Add one secret:** Edge Functions → **Secrets** (or "Manage secrets") → add
`SITE_URL` = your live address, with no slash at the end, e.g. `https://classlayer.netlify.app`.
Invitation links always point here. (The other keys the function needs are provided by Supabase automatically.)

**c) Set up real email sending — do this before inviting more than a few people.**
Supabase's built-in email sender allows only a handful of emails **per hour**, so a bulk invite will stop
part-way (the page tells you who didn't get one). Under **Authentication → Emails → SMTP Settings**, connect a
provider such as Resend, Brevo or Mailgun. Also edit **Authentication → Email Templates → Invite user** so the
email says CLASSLAYER and your school name rather than the generic text.

**d) Recommended:** Authentication → Policies/Passwords: set the minimum password length to 8 or more
(the set-password page already requires 8).

If you open the Invitations page before this is done, it shows a "not set up yet" notice instead of failing.

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
- **Tested (invitations):** the `invite-users` function type-checks in Deno and passes 21 checks against a fake
  Supabase (`supabase/tests/invite_function_test.mjs`): unknown emails can't be invited, the link always uses
  `SITE_URL`, each role can invite only who it should, rate limits stop cleanly. The set-password page and the
  Invitations page were run in a real browser against a fake backend.
- **Not tested:** anything against a live Supabase project (I had no access to one), including actual email
  delivery and how Supabase treats re-inviting someone who was invited but never accepted. Expect to spend your
  first session fixing small things; send me the errors and I'll fix them.

## Decisions you should confirm

- **School Admin sees all students** (they enrol students). Remove `'admin'` from `SCHOOL_WIDE_ROLES` in
  `src/lib/permissions.ts` **and** from `sees_all()` in the migration if you don't want that.
- **Head of Academics** is included as a school-wide role (you said "maybe"). Same two places to remove.
- **Accountant can read student names** because fee screens need them. They don't get the Students page.
- Single school per database. Supporting several schools later needs a `school_id` on every table.

## Known limits

- Invitation emails depend on your Supabase email setup (see section 5c). A person who opens their invite
  link but closes the page before choosing a password can use **Forgot password?** to set one.
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
