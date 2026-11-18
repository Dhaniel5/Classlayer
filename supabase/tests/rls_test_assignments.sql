-- Run AFTER 001, 002 and rls_test.sql (it reuses that file's users and students).
\set ON_ERROR_STOP off
reset role;
\echo '=== 7. Assignments: who can post and mark ==='
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
set role authenticated;
insert into assignments(id,class_id,subject_id,title,due_date,mode,term,session) values
 ('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Copy notes','2026-12-01','done','First Term','2026/2027');
\echo '^ expect success (teacher A posts to own class, done/not-done mode)'
insert into assignments(id,class_id,subject_id,title,due_date,mode,max_score,term,session) values
 ('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Exercise 3','2026-12-02','score',10,'First Term','2026/2027');
\echo '^ expect success (score mode with a maximum)'
insert into assignments(class_id,subject_id,title,due_date,mode,term,session) values
 ('10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','Sneaky','2026-12-01','done','First Term','2026/2027');
\echo '^ expect RLS error (teacher A posting to JSS 2, not their class)'
insert into assignments(class_id,subject_id,title,due_date,mode,term,session) values
 ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Bad','2026-12-01','score','First Term','2026/2027');
\echo '^ expect error (score mode needs a maximum)'

insert into assignment_records(assignment_id,student_id,status) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','done');
\echo '^ expect success (S1 done)'
insert into assignment_records(assignment_id,student_id,status) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','not_done');
\echo '^ expect success (S2 not done)'
insert into assignment_records(assignment_id,student_id,status) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','done');
\echo '^ expect error (S3 is in JSS 2, not this assignment''s class)'
insert into assignment_records(assignment_id,student_id,status,score) values ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','done',null);
\echo '^ expect error (score mode: done needs a score)'
insert into assignment_records(assignment_id,student_id,status,score) values ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','done',12);
\echo '^ expect error (above max 10)'
insert into assignment_records(assignment_id,student_id,status,score) values ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','done',8);
\echo '^ expect success (8/10)'
insert into assignment_records(assignment_id,student_id,status,score) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','done',5);
\echo '^ expect error (done/not-done assignments cannot carry a score)'
update assignment_records set status='not_done', score=9 where assignment_id='70000000-0000-0000-0000-000000000002';
select 'not_done clears the score', status, score from assignment_records where assignment_id='70000000-0000-0000-0000-000000000002'; -- not_done, null
update assignment_records set status='done', score=7 where assignment_id='70000000-0000-0000-0000-000000000002';

\echo '=== 8. Who can see assignments (expected: B=0, parent=2 / 1 child only, acct=0, academics=2) ==='
select as_user('00000000-0000-0000-0000-000000000002','teacher.b@x.com');
select 'teacher B (other class) assignments', count(*) from assignments;      -- 0
select 'teacher B records', count(*) from assignment_records;                 -- 0
insert into assignment_records(assignment_id,student_id,status) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','not_done');
\echo '^ expect RLS error (B marking JSS 1)'
select as_user('00000000-0000-0000-0000-000000000003','parent.a@x.com');
select 'parent A assignments', count(*) from assignments;                     -- 2 (child''s class)
select 'parent A records (own child only)', count(*) from assignment_records; -- 2
select 'parent A sees other kids'' records', count(*) from assignment_records where student_id <> '20000000-0000-0000-0000-000000000001'; -- 0
insert into assignments(class_id,subject_id,title,due_date,mode,term,session) values
 ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Parent post','2026-12-01','done','First Term','2026/2027');
\echo '^ expect RLS error (parents cannot post)'
update assignment_records set status='done' where student_id='20000000-0000-0000-0000-000000000001'; \echo '^ expect 0 rows (parents cannot edit)'
select as_user('00000000-0000-0000-0000-000000000005','acct@x.com');
select 'accountant assignments', count(*) from assignments;                   -- 0
select as_user('00000000-0000-0000-0000-000000000007','academics@x.com');
select 'head of academics assignments', count(*) from assignments;            -- 2

\echo '=== 9. School feature switch ==='
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
update school_settings set features = '{}'::jsonb; \echo '^ expect 0 rows (teacher cannot change settings)'
select as_user('00000000-0000-0000-0000-000000000006','owner@x.com');
update school_settings set features = features || '{"assignments": false}'::jsonb;
select 'switch is off', feature_on('assignments');                           -- f
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
select 'teacher A sees assignments while OFF', count(*) from assignments;     -- 0
insert into assignments(class_id,subject_id,title,due_date,mode,term,session) values
 ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','While off','2026-12-01','done','First Term','2026/2027');
\echo '^ expect RLS error (module is switched off)'
select as_user('00000000-0000-0000-0000-000000000003','parent.a@x.com');
select 'parent sees assignments while OFF', count(*) from assignments;        -- 0
select as_user('00000000-0000-0000-0000-000000000006','owner@x.com');
update school_settings set features = features || '{"assignments": true}'::jsonb;
select as_user('00000000-0000-0000-0000-000000000001','teacher.a@x.com');
select 'data is back after switching ON', count(*) from assignments;          -- 2
select 'unknown module defaults to off', feature_on('online_testing');        -- f
delete from assignments where id='70000000-0000-0000-0000-000000000002';
select 'delete cascades records', count(*) from assignment_records where assignment_id='70000000-0000-0000-0000-000000000002'; -- 0
