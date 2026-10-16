import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { supabase, friendlyError } from '@/lib/supabase'
import { useAuth } from '@/services/auth/AuthContext'
import { buildResults } from '@/lib/results'
import type {
  Class, Subject, Teacher, Student, Parent, AttendanceRecord, Assessment, AssessmentScore,
  Result, Fee, Payment, Announcement, AppNotification, RecentActivity, AttendanceStatus,
  AssessmentType, AnnouncementAudience, School, Gender,
} from '@/types'

// -----------------------------------------------------------------------------
// CLASSLAYER data layer — backed by Supabase (Postgres).
// Every read below is filtered by the database's row-level security for the
// signed-in user, so a teacher only ever receives their own classes' students.
// -----------------------------------------------------------------------------

type Row = Record<string, any>
type TableKey =
  | 'school' | 'classes' | 'subjects' | 'teachers' | 'teacher_classes' | 'teacher_subjects'
  | 'students' | 'parents' | 'student_parents' | 'attendance' | 'assessments'
  | 'assessment_scores' | 'fees' | 'payments' | 'announcements'
type Raw = Record<TableKey, Row[]>

const ALL_KEYS: TableKey[] = [
  'school', 'classes', 'subjects', 'teachers', 'teacher_classes', 'teacher_subjects', 'students',
  'parents', 'student_parents', 'attendance', 'assessments', 'assessment_scores', 'fees',
  'payments', 'announcements',
]
const emptyRaw = (): Raw => Object.fromEntries(ALL_KEYS.map((k) => [k, [] as Row[]])) as Raw

const SPECS: Record<TableKey, { table: string; order: string[] }> = {
  school: { table: 'school_settings', order: ['id'] },
  classes: { table: 'classes', order: ['name', 'id'] },
  subjects: { table: 'subjects', order: ['name', 'id'] },
  teachers: { table: 'teachers', order: ['last_name', 'id'] },
  teacher_classes: { table: 'teacher_classes', order: ['teacher_id', 'class_id'] },
  teacher_subjects: { table: 'teacher_subjects', order: ['teacher_id', 'subject_id'] },
  students: { table: 'students', order: ['last_name', 'first_name', 'id'] },
  parents: { table: 'parents', order: ['last_name', 'first_name', 'id'] },
  student_parents: { table: 'student_parents', order: ['student_id', 'parent_id'] },
  attendance: { table: 'attendance', order: ['date', 'id'] },
  assessments: { table: 'assessments', order: ['date', 'id'] },
  assessment_scores: { table: 'assessment_scores', order: ['id'] },
  fees: { table: 'fees', order: ['id'] },
  payments: { table: 'payments', order: ['created_at', 'id'] },
  announcements: { table: 'announcements', order: ['created_at', 'id'] },
}

/** Attendance older than this is not loaded into the app (keeps the app fast). */
const ATTENDANCE_WINDOW_DAYS = 120

const COLORS = ['#0EA5A0', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#059669', '#4F46E5']
const colorFor = (id: string) => {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase() || 'SCH'

async function fetchAll(key: TableKey, school?: Row): Promise<Row[]> {
  const spec = SPECS[key]
  const size = 1000 // Supabase returns at most 1000 rows per request — page through.
  const out: Row[] = []
  for (let from = 0; ; from += size) {
    let q: any = supabase.from(spec.table).select('*')
    if (key === 'attendance') {
      const since = new Date(Date.now() - ATTENDANCE_WINDOW_DAYS * 864e5).toLocaleDateString('en-CA')
      q = q.gte('date', since)
    }
    if (key === 'fees' && school) q = q.eq('term', school.current_term).eq('session', school.current_session)
    spec.order.forEach((o) => { q = q.order(o) })
    const { data, error } = await q.range(from, from + size - 1)
    if (error) throw new Error(`${spec.table}: ${friendlyError(error)}`)
    out.push(...(data ?? []))
    if (!data || data.length < size) break
  }
  return out
}

// ---- action input types ----
export interface StudentInput {
  firstName: string; lastName: string; studentCode: string; dateOfBirth: string
  gender: Gender; classId: string; address: string; admissionDate: string
}
export interface NewStudentInput extends StudentInput {
  parentName: string; parentPhone: string; parentEmail: string
}

export interface StoreActions {
  refresh: (keys?: TableKey[]) => Promise<void>
  addStudent: (i: NewStudentInput) => Promise<void>
  updateStudent: (id: string, i: StudentInput & { status: 'Active' | 'Inactive' }) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
  addTeacher: (i: { firstName: string; lastName: string; email: string; phone: string; classIds: string[]; subjectIds: string[] }) => Promise<void>
  setTeacherAssignments: (teacherId: string, classIds: string[], subjectIds: string[]) => Promise<void>
  addClass: (i: { name: string; level: string; termFee: number; classTeacherId: string | null }) => Promise<void>
  setClassTeacher: (classId: string, teacherId: string | null) => Promise<void>
  setClassFee: (classId: string, termFee: number) => Promise<void>
  addSubject: (i: { name: string; code: string }) => Promise<void>
  saveAttendance: (classId: string, date: string, entries: { studentId: string; status: AttendanceStatus }[]) => Promise<void>
  createAssessment: (i: { classId: string; subjectId: string; name: string; type: AssessmentType; maxScore: number; date: string }) => Promise<string>
  submitScores: (assessmentId: string, scores: { studentId: string; score: number }[]) => Promise<void>
  recordPayment: (i: { studentId: string; feeId: string; amount: number; date: string; method: Payment['method']; reference: string; note?: string }) => Promise<void>
  addAnnouncement: (i: { title: string; message: string; audience: AnnouncementAudience; classId?: string }) => Promise<void>
  updateSchool: (i: { name: string; address: string; phone: string; email: string; currentSession: string; currentTerm: School['currentTerm'] }) => Promise<void>
  markNotificationRead: (id: string) => void
}

interface StoreValue {
  loading: boolean
  error: string | null
  school: School
  classes: Class[]
  subjects: Subject[]
  teachers: Teacher[]
  students: Student[]
  parents: Parent[]
  attendanceRecords: AttendanceRecord[]
  assessments: Assessment[]
  assessmentScores: AssessmentScore[]
  results: Result[]
  fees: Fee[]
  payments: Payment[]
  announcements: Announcement[]
  notifications: AppNotification[]
  recentActivity: RecentActivity[]
  actions: StoreActions
}

const StoreContext = createContext<StoreValue | null>(null)

// Unwraps a Supabase response: throws a readable error, otherwise returns the data.
const must = (res: { data: any; error: any }): any => {
  if (res.error) throw new Error(friendlyError(res.error))
  return res.data
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const [raw, setRaw] = useState<Raw>(emptyRaw)
  const rawRef = useRef(raw)
  rawRef.current = raw
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<string[]>([])

  const refresh = useCallback(async (keys: TableKey[] = ALL_KEYS) => {
    // Fees depend on the school's current term, so make sure we have the school row first.
    let schoolRow = rawRef.current.school[0]
    const next: Partial<Raw> = {}
    if (keys.includes('school') || !schoolRow) {
      next.school = await fetchAll('school')
      schoolRow = next.school[0]
    }
    const rest = keys.filter((k) => k !== 'school')
    const loaded = await Promise.all(rest.map((k) => fetchAll(k, schoolRow)))
    rest.forEach((k, i) => { next[k] = loaded[i] })
    setRaw((prev) => ({ ...prev, ...next }))
  }, [])

  // Load everything once the user is signed in; clear it on sign-out.
  useEffect(() => {
    if (status !== 'ready' || !user) {
      setRaw(emptyRaw()); setLoading(status === 'loading'); return
    }
    let cancelled = false
    setLoading(true); setError(null)
    refresh()
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    try {
      setReadIds(JSON.parse(localStorage.getItem(`cl_read_${user.id}`) ?? '[]'))
    } catch { setReadIds([]) }
    return () => { cancelled = true }
  }, [status, user, refresh])

  // ------------------------------- derived data -------------------------------
  const derived = useMemo(() => {
    const sRow = raw.school[0]
    const school: School = {
      id: 'school',
      name: sRow?.name ?? 'My School',
      address: sRow?.address ?? '',
      phone: sRow?.phone ?? '',
      email: sRow?.email ?? '',
      logoInitials: initialsOf(sRow?.name ?? 'My School'),
      currentSession: sRow?.current_session ?? '',
      currentTerm: (sRow?.current_term ?? 'First Term') as School['currentTerm'],
    }

    const subjectIds = raw.subjects.map((s) => s.id as string)
    const classIdsAll = raw.classes.map((c) => c.id as string)

    const students: Student[] = raw.students.map((s) => ({
      id: s.id, studentCode: s.student_code, firstName: s.first_name, lastName: s.last_name,
      gender: s.gender, dateOfBirth: s.date_of_birth, classId: s.class_id,
      parentIds: raw.student_parents.filter((sp) => sp.student_id === s.id).map((sp) => sp.parent_id),
      address: s.address ?? '', admissionDate: s.admission_date, status: s.status,
      photoColor: colorFor(s.id),
    }))

    const classes: Class[] = raw.classes.map((c) => ({
      id: c.id, name: c.name, level: c.level ?? '', classTeacherId: c.class_teacher_id ?? null,
      subjectIds, // every class offers every subject in V1
      studentIds: students.filter((s) => s.classId === c.id).map((s) => s.id),
      termFee: Number(c.term_fee ?? 0),
    }))

    const teachers: Teacher[] = raw.teachers.map((t) => ({
      id: t.id, firstName: t.first_name, lastName: t.last_name, email: t.email, phone: t.phone ?? '',
      status: t.status,
      subjectIds: raw.teacher_subjects.filter((x) => x.teacher_id === t.id).map((x) => x.subject_id),
      classIds: Array.from(new Set([
        ...raw.teacher_classes.filter((x) => x.teacher_id === t.id).map((x) => x.class_id as string),
        ...raw.classes.filter((c) => c.class_teacher_id === t.id).map((c) => c.id as string),
      ])),
    }))

    const subjects: Subject[] = raw.subjects.map((s) => ({
      id: s.id, name: s.name, code: s.code, classIds: classIdsAll,
      teacherIds: raw.teacher_subjects.filter((x) => x.subject_id === s.id).map((x) => x.teacher_id),
    }))

    const parents: Parent[] = raw.parents.map((p) => ({
      id: p.id, firstName: p.first_name, lastName: p.last_name, phone: p.phone ?? '', email: p.email ?? '',
      studentIds: raw.student_parents.filter((sp) => sp.parent_id === p.id).map((sp) => sp.student_id),
    }))

    // attendance: flat rows -> one record per class per date
    const groups = new Map<string, AttendanceRecord>()
    raw.attendance.forEach((a) => {
      const key = `${a.class_id}:${a.date}`
      const rec: AttendanceRecord = groups.get(key) ?? { id: key, classId: a.class_id, date: a.date, entries: [], submittedBy: a.recorded_by ?? '' }
      rec.entries.push({ studentId: a.student_id, status: a.status })
      groups.set(key, rec)
    })
    const attendanceRecords = Array.from(groups.values())

    const assessments: Assessment[] = raw.assessments.map((a) => ({
      id: a.id, classId: a.class_id, subjectId: a.subject_id, name: a.name, type: a.type,
      maxScore: Number(a.max_score), date: a.date, term: a.term, session: a.session, createdBy: a.created_by ?? '',
    }))
    const assessmentScores: AssessmentScore[] = raw.assessment_scores.map((s) => ({
      id: s.id, assessmentId: s.assessment_id, studentId: s.student_id, score: Number(s.score),
    }))

    const classOfStudent = new Map(students.map((s) => [s.id, s.classId]))
    const fees: Fee[] = raw.fees.map((f) => ({
      id: f.id, studentId: f.student_id, classId: classOfStudent.get(f.student_id) ?? '',
      term: f.term, session: f.session, amountDue: Number(f.amount_due), amountPaid: Number(f.amount_paid), status: f.status,
    }))
    const feeIds = new Set(fees.map((f) => f.id))
    const payments: Payment[] = raw.payments
      .filter((p) => feeIds.has(p.fee_id))
      .map((p) => ({
        id: p.id, studentId: p.student_id, feeId: p.fee_id, amount: Number(p.amount), date: p.paid_on,
        method: p.method, reference: p.reference, note: p.note ?? undefined,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    const announcements: Announcement[] = raw.announcements
      .map((a) => ({
        id: a.id, title: a.title, message: a.message, audience: a.audience, classId: a.class_id ?? undefined,
        date: a.date, createdBy: a.created_by_name || 'School',
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    const results = buildResults(students, assessments, assessmentScores, school)

    // ---- recent activity, built from real records ----
    const nameOf = (id: string) => students.find((s) => s.id === id)?.firstName ?? 'a student'
    const className = (id: string) => classes.find((c) => c.id === id)?.name ?? 'a class'
    const activity: RecentActivity[] = []
    raw.students.forEach((s) => activity.push({ id: `st-${s.id}`, type: 'student', message: `New student added: ${s.first_name} ${s.last_name}`, timestamp: s.created_at }))
    raw.teachers.forEach((t) => activity.push({ id: `te-${t.id}`, type: 'teacher', message: `New teacher added: ${t.first_name} ${t.last_name}`, timestamp: t.created_at }))
    raw.assessments.forEach((a) => activity.push({ id: `as-${a.id}`, type: 'assessment', message: `Assessment created: ${a.name} (${className(a.class_id)})`, timestamp: a.created_at }))
    raw.payments.forEach((p) => activity.push({ id: `pa-${p.id}`, type: 'payment', message: `Fee payment recorded for ${nameOf(p.student_id)}`, timestamp: p.created_at }))
    const attLatest = new Map<string, { classId: string; date: string; ts: string }>()
    raw.attendance.forEach((a) => {
      const k = `${a.class_id}:${a.date}`
      const cur = attLatest.get(k)
      if (!cur || a.created_at > cur.ts) attLatest.set(k, { classId: a.class_id, date: a.date, ts: a.created_at })
    })
    attLatest.forEach((v, k) => activity.push({ id: `at-${k}`, type: 'attendance', message: `Attendance submitted for ${className(v.classId)} (${v.date})`, timestamp: v.ts }))
    const recentActivity = activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12)

    // ---- notifications, derived from real records the user is allowed to see ----
    const notes: Omit<AppNotification, 'read'>[] = []
    raw.announcements.forEach((a) => notes.push({ id: `n-ann-${a.id}`, type: 'announcement', title: 'New announcement', description: a.title, date: a.created_at }))
    raw.assessments.forEach((a) => notes.push({ id: `n-as-${a.id}`, type: 'assessment', title: 'Assessment posted', description: `${a.name} — ${className(a.class_id)}`, date: a.created_at }))
    raw.payments.forEach((p) => notes.push({ id: `n-pa-${p.id}`, type: 'payment', title: 'Fee payment recorded', description: `${nameOf(p.student_id)}`, date: p.created_at }))

    return { school, classes, subjects, teachers, students, parents, attendanceRecords, assessments, assessmentScores, results, fees, payments, announcements, recentActivity, notes }
  }, [raw])

  const notifications: AppNotification[] = useMemo(
    () => derived.notes
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)
      .map((n) => ({ ...n, read: readIds.includes(n.id) })),
    [derived.notes, readIds]
  )

  // --------------------------------- actions ---------------------------------
  const actions: StoreActions = useMemo(() => {
    const r = () => rawRef.current
    const splitName = (full: string, fallbackLast: string) => {
      const parts = full.trim().split(/\s+/)
      return { first: parts[0] ?? '', last: parts.slice(1).join(' ') || fallbackLast }
    }

    return {
      refresh,

      async addStudent(i) {
        const email = i.parentEmail.trim().toLowerCase() || null
        const phone = i.parentPhone.trim()
        const { first, last } = splitName(i.parentName, i.lastName)
        let parentId: string | undefined =
          (email && r().parents.find((p) => p.email === email)?.id) ||
          r().parents.find((p) =>
            p.phone === phone && `${p.first_name} ${p.last_name}`.toLowerCase() === `${first} ${last}`.toLowerCase())?.id
        if (!parentId) {
          const p = must(await supabase.from('parents')
            .insert({ first_name: first, last_name: last, phone, email }).select('id').single())
          parentId = p.id as string
        }
        const st = must(await supabase.from('students').insert({
          student_code: i.studentCode.trim(), first_name: i.firstName.trim(), last_name: i.lastName.trim(),
          gender: i.gender, date_of_birth: i.dateOfBirth, class_id: i.classId, address: i.address.trim(),
          admission_date: i.admissionDate,
        }).select('id').single())
        const link = await supabase.from('student_parents').insert({ student_id: st.id, parent_id: parentId })
        if (link.error) {
          await supabase.from('students').delete().eq('id', st.id) // don't leave a student with no guardian
          throw new Error(friendlyError(link.error))
        }
        await refresh(['students', 'parents', 'student_parents', 'fees'])
      },

      async updateStudent(id, i) {
        must(await supabase.from('students').update({
          student_code: i.studentCode.trim(), first_name: i.firstName.trim(), last_name: i.lastName.trim(),
          gender: i.gender, date_of_birth: i.dateOfBirth, class_id: i.classId, address: i.address.trim(),
          admission_date: i.admissionDate, status: i.status,
        }).eq('id', id).select('id').single())
        await refresh(['students'])
      },

      async deleteStudent(id) {
        const { error } = await supabase.from('students').delete().eq('id', id)
        if (error) {
          if (error.code === '23503')
            throw new Error('This student has payment records, so they cannot be deleted. Set their status to Inactive instead.')
          throw new Error(friendlyError(error))
        }
        await refresh(['students', 'student_parents', 'attendance', 'assessment_scores', 'fees'])
      },

      async addTeacher(i) {
        const t = must(await supabase.from('teachers').insert({
          first_name: i.firstName.trim(), last_name: i.lastName.trim(),
          email: i.email.trim().toLowerCase(), phone: i.phone.trim(),
        }).select('id').single())
        if (i.classIds.length)
          must(await supabase.from('teacher_classes').insert(i.classIds.map((c) => ({ teacher_id: t.id, class_id: c }))).select())
        if (i.subjectIds.length)
          must(await supabase.from('teacher_subjects').insert(i.subjectIds.map((s) => ({ teacher_id: t.id, subject_id: s }))).select())
        await refresh(['teachers', 'teacher_classes', 'teacher_subjects'])
      },

      async setTeacherAssignments(teacherId, classIds, subjectIds) {
        const curC = r().teacher_classes.filter((x) => x.teacher_id === teacherId).map((x) => x.class_id as string)
        const curS = r().teacher_subjects.filter((x) => x.teacher_id === teacherId).map((x) => x.subject_id as string)
        const addC = classIds.filter((c) => !curC.includes(c)), delC = curC.filter((c) => !classIds.includes(c))
        const addS = subjectIds.filter((s) => !curS.includes(s)), delS = curS.filter((s) => !subjectIds.includes(s))
        if (addC.length) must(await supabase.from('teacher_classes').insert(addC.map((c) => ({ teacher_id: teacherId, class_id: c }))).select())
        if (addS.length) must(await supabase.from('teacher_subjects').insert(addS.map((s) => ({ teacher_id: teacherId, subject_id: s }))).select())
        if (delC.length) { const { error } = await supabase.from('teacher_classes').delete().eq('teacher_id', teacherId).in('class_id', delC); if (error) throw new Error(friendlyError(error)) }
        if (delS.length) { const { error } = await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId).in('subject_id', delS); if (error) throw new Error(friendlyError(error)) }
        await refresh(['teacher_classes', 'teacher_subjects'])
      },

      async addClass(i) {
        must(await supabase.from('classes').insert({
          name: i.name.trim(), level: i.level.trim(), term_fee: i.termFee, class_teacher_id: i.classTeacherId,
        }).select('id').single())
        await refresh(['classes'])
      },
      async setClassTeacher(classId, teacherId) {
        must(await supabase.from('classes').update({ class_teacher_id: teacherId }).eq('id', classId).select('id').single())
        await refresh(['classes'])
      },
      async setClassFee(classId, termFee) {
        must(await supabase.from('classes').update({ term_fee: termFee }).eq('id', classId).select('id').single())
        await refresh(['classes', 'fees'])
      },
      async addSubject(i) {
        must(await supabase.from('subjects').insert({ name: i.name.trim(), code: i.code.trim().toUpperCase() }).select('id').single())
        await refresh(['subjects'])
      },

      async saveAttendance(classId, date, entries) {
        const rows = entries.map((e) => ({ student_id: e.studentId, class_id: classId, date, status: e.status }))
        const saved = must(await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' }).select())
        setRaw((prev) => ({
          ...prev,
          attendance: [
            ...prev.attendance.filter((a) => !(a.class_id === classId && a.date === date)),
            ...(saved as Row[]),
          ],
        }))
      },

      async createAssessment(i) {
        const school = r().school[0]
        const a = must(await supabase.from('assessments').insert({
          class_id: i.classId, subject_id: i.subjectId, name: i.name.trim(), type: i.type,
          max_score: i.maxScore, date: i.date, term: school.current_term, session: school.current_session,
        }).select('id').single())
        await refresh(['assessments'])
        return a.id as string
      },

      async submitScores(assessmentId, scores) {
        const rows = scores.map((s) => ({ assessment_id: assessmentId, student_id: s.studentId, score: s.score }))
        must(await supabase.from('assessment_scores').upsert(rows, { onConflict: 'assessment_id,student_id' }).select())
        await refresh(['assessment_scores'])
      },

      async recordPayment(i) {
        must(await supabase.from('payments').insert({
          fee_id: i.feeId, student_id: i.studentId, amount: i.amount, paid_on: i.date,
          method: i.method, reference: i.reference.trim(), note: i.note ?? null,
        }).select('id').single())
        await refresh(['fees', 'payments'])
      },

      async addAnnouncement(i) {
        must(await supabase.from('announcements').insert({
          title: i.title.trim(), message: i.message.trim(), audience: i.audience,
          class_id: i.audience === 'Specific Class' ? i.classId : null,
          created_by_name: user?.name ?? '',
        }).select('id').single())
        await refresh(['announcements'])
      },

      async updateSchool(i) {
        must(await supabase.from('school_settings').update({
          name: i.name.trim(), address: i.address.trim(), phone: i.phone.trim(), email: i.email.trim().toLowerCase(),
          current_session: i.currentSession.trim(), current_term: i.currentTerm,
        }).eq('id', 1).select('id').single())
        await refresh()
      },

      markNotificationRead(id) {
        setReadIds((prev) => {
          if (prev.includes(id)) return prev
          const next = [...prev, id]
          if (user) localStorage.setItem(`cl_read_${user.id}`, JSON.stringify(next))
          return next
        })
      },
    }
  }, [refresh, user])

  const { notes: _notes, ...rest } = derived
  const value: StoreValue = { loading, error, ...rest, notifications, actions }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
