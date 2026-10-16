\set ON_ERROR_STOP off
-- ---- fixture (as superuser) ----
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000001','teacher.a@x.com',now()),
 ('00000000-0000-0000-0000-000000000002','teacher.b@x.com',now()),
 ('00000000-0000-0000-0000-000000000003','parent.a@x.com',now()),
 ('00000000-0000-0000-0000-000000000004','head@x.com',now()),
 ('00000000-0000-0000-0000-000000000005','acct@x.com',now()),
 ('00000000-0000-0000-0000-000000000006','owner@x.com',now()),
 ('00000000-0000-0000-0000-000000000007','academics@x.com',now()),
 ('00000000-0000-0000-0000-000000000008','teacher.a.unconfirmed@x.com',null),
 ('00000000-0000-0000-0000-000000000009','stranger@x.com',now());
insert into user_roles(email,full_name,role) values
 ('head@x.com','Head','head_of_school'),('acct@x.com','Acct','accountant'),
 ('owner@x.com','Owner','proprietor'),('academics@x.com','Acad','head_of_academics');
insert into teachers(id,first_name,last_name,email) values
 ('a0000000-0000-0000-0000-00000000000a','Ada','A','teacher.a@x.com'),
 ('b0000000-0000-0000-0000-00000000000b','Bayo','B','teacher.b@x.com'),
 ('c0000000-0000-0000-0000-00000000000c','Cee','C','teacher.a.unconfirmed@x.com');
insert into classes(id,name,class_teacher_id,term_fee) values
 ('10000000-0000-0000-0000-000000000001','JSS 1','a0000000-0000-0000-0000-00000000000a',100000),
 ('10000000-0000-0000-0000-000000000002','JSS 2','b0000000-0000-0000-0000-00000000000b',120000),
 ('10000000-0000-0000-0000-000000000003','JSS 3',null,150000);
insert into teacher_classes values ('a0000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000003'); -- A also assigned JSS 3
insert into subjects(id,name,code) values ('50000000-0000-0000-0000-000000000001','Maths','MTH');
insert into students(id,student_code,first_name,last_name,gender,date_of_birth,class_id) values
 ('20000000-0000-0000-0000-000000000001','S1','Kemi','One','Female','2013-01-01','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','S2','Tayo','Two','Male','2013-01-01','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','S3','Uche','Three','Male','2012-01-01','10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000004','S4','Femi','Four','Male','2011-01-01','10000000-0000-0000-0000-000000000003');
insert into parents(id,first_name,last_name,email) values
 ('30000000-0000-0000-0000-000000000001','Pa','Rent','parent.a@x.com'),
 ('30000000-0000-0000-0000-000000000002','Other','Parent','other@x.com');
insert into student_parents values
 ('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002');
insert into assessments(id,class_id,subject_id,name,type,max_score,date,term,session) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','JSS1 Test','Test',20,current_date,'First Term','2026/2027'),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','JSS2 Test','Test',20,current_date,'First Term','2026/2027');
insert into announcements(title,message,audience,class_id) values
 ('To all parents','x','All Parents',null),
 ('Teachers only','x','Teachers',null),
 ('JSS2 parents','x','Specific Class','10000000-0000-0000-0000-000000000002'),
 ('JSS1 parents','x','Specific Class','10000000-0000-0000-0000-000000000001');

create or replace function as_user(uid text, mail text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',mail)::text, false);
end $$;

\echo '=== 1. Students visible per user (total in DB = 4) ==='
\echo 'expect: teacher A=3 (JSS1 + JSS3), teacher B=1, owner/head/academics=4, accountant=4, parent=1, stranger=0, unconfirmed teacher=0'
set role authenticated;
select 'teacher A', count(*) from (select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com')) x, students group by 1 ;
select as_user('00000000-0000-0000-0000-000000000002','teacher.b@x.com'); select 'teacher B', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000006','owner@x.com');      select 'proprietor', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000004','head@x.com');       select 'head of school', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000007','academics@x.com');  select 'head of academics', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000005','acct@x.com');       select 'accountant', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000003','parent.a@x.com');   select 'parent A', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000009','stranger@x.com');   select 'stranger (no role)', count(*) from students;
select as_user('00000000-0000-0000-0000-000000000008','teacher.a.unconfirmed@x.com'); select 'unconfirmed-email teacher', count(*) from students;

\echo '=== 2. Teacher B tries to reach other classes ==='
select as_user('00000000-0000-0000-0000-000000000002','teacher.b@x.com');
select 'B sees assessments', count(*) from assessments;            -- expect 1
select 'B sees parents (own class only)', count(*) from parents;   -- expect 1 (JSS2 student's parent)
insert into attendance(student_id,class_id,date,status) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',current_date,'Present');
\echo '^ expect RLS error (B marking JSS1 attendance)'
insert into attendance(student_id,class_id,date,status) values ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',current_date,'Present');
\echo '^ expect success (B marking own class)'
insert into attendance(student_id,class_id,date,status) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',current_date,'Present');
\echo '^ expect error (own class id but another class''s student)'
insert into assessment_scores(assessment_id,student_id,score) values ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',10);
\echo '^ expect RLS error (score on JSS1 assessment)'
insert into assessment_scores(assessment_id,student_id,score) values ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',25);
\echo '^ expect error (score above max 20)'
insert into assessment_scores(assessment_id,student_id,score) values ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',17);
\echo '^ expect success'
select 'B fees visible', count(*) from fees;                       -- expect 0
insert into students(student_code,first_name,last_name,gender,date_of_birth,class_id) values ('X','a','b','Male','2012-01-01','10000000-0000-0000-0000-000000000002');
\echo '^ expect RLS error (teacher cannot create students)'

\echo '=== 3. Parent ==='
select as_user('00000000-0000-0000-0000-000000000003','parent.a@x.com');
select 'parent sees students', count(*) from students;              -- 1
select 'parent sees own child fee only', count(*) from fees;        -- 1
select 'parent sees attendance of other kids', count(*) from attendance where student_id <> '20000000-0000-0000-0000-000000000001'; -- 0
select 'parent sees scores of other kids', count(*) from assessment_scores where student_id <> '20000000-0000-0000-0000-000000000001'; -- 0
select 'parent announcements', title from announcements order by title; -- All Parents + JSS1 parents only
select 'parent sees other parents', count(*) from parents where id <> '30000000-0000-0000-0000-000000000001'; -- 0
select 'parent sees teachers', count(*) from teachers;               -- 0

\echo '=== 4. Finance ==='
select as_user('00000000-0000-0000-0000-000000000005','acct@x.com');
select 'accountant fees', count(*), sum(amount_due) from fees;       -- 4, 470000
insert into payments(fee_id,student_id,amount,method,reference) select id, student_id, 40000, 'Cash','R1' from fees where student_id='20000000-0000-0000-0000-000000000001';
select 'after part-payment', amount_paid, status from fees where student_id='20000000-0000-0000-0000-000000000001'; -- 40000 Partially Paid
insert into payments(fee_id,student_id,amount,method,reference) select id, student_id, 60000, 'Cash','R2' from fees where student_id='20000000-0000-0000-0000-000000000001';
select 'after full payment', amount_paid, status from fees where student_id='20000000-0000-0000-0000-000000000001'; -- 100000 Paid
update payments set amount = 1; \echo '^ expect 0 rows (payments are append-only)'
delete from payments;           \echo '^ expect 0 rows'
select as_user('00000000-0000-0000-0000-000000000007','academics@x.com');
select 'head of academics fees', count(*) from fees;                 -- 0
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
select 'teacher A fees', count(*) from fees;                         -- 0
update classes set term_fee = 1 where id='10000000-0000-0000-0000-000000000001'; \echo '^ expect 0 rows updated (teacher cannot edit classes)'

\echo '=== 5. Role administration ==='
select as_user('00000000-0000-0000-0000-000000000004','head@x.com');
insert into user_roles(email,role) values ('new@x.com','accountant'); \echo '^ expect RLS error (head of school cannot grant roles)'
select as_user('00000000-0000-0000-0000-000000000006','owner@x.com');
insert into user_roles(email,role) values ('new@x.com','accountant'); \echo '^ expect success'
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
update school_settings set name='hacked'; \echo '^ expect 0 rows'
select 'teacher A role rows visible', count(*) from user_roles;      -- 0
reset role;
select as_user('00000000-0000-0000-0000-000000000004','head@x.com');
set role authenticated; select 'my profile', get_my_profile();

\echo '=== 6. Deleting a student with payments must fail ==='
reset role;
delete from students where id='20000000-0000-0000-0000-000000000001';
\echo '^ expect FK error'
delete from students where id='20000000-0000-0000-0000-000000000004';
\echo '^ expect success (no payments)'
select 'fees left', count(*) from fees;
