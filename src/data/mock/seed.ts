import { createRng, pick, randInt, id } from '@/lib/rng'
import { maleFirstNames, femaleFirstNames, lastNames } from './names'
import { percentageOf, gradeFor } from '@/lib/grading'
import type {
  School,
  Class,
  Subject,
  Teacher,
  Student,
  Parent,
  AttendanceRecord,
  Assessment,
  AssessmentScore,
  Result,
  Fee,
  Payment,
  Announcement,
  AppNotification,
  RecentActivity,
} from '@/types'

const rng = createRng(42)

// ---------------------------------------------------------------
// School
// ---------------------------------------------------------------
export const school: School = {
  id: 'school-1',
  name: 'Bright Horizon Academy',
  address: '14 Aminu Kano Crescent, Wuse 2, Abuja',
  phone: '+234 802 345 6789',
  email: 'info@brighthorizon.edu.ng',
  logoInitials: 'BHA',
  currentSession: '2025/2026',
  currentTerm: 'First Term',
}

// ---------------------------------------------------------------
// Classes
// ---------------------------------------------------------------
const classDefs: { name: string; level: string }[] = [
  { name: 'Nursery 1', level: 'Nursery' },
  { name: 'Nursery 2', level: 'Nursery' },
  { name: 'Primary 1', level: 'Primary' },
  { name: 'Primary 2', level: 'Primary' },
  { name: 'JSS 1', level: 'Junior Secondary' },
  { name: 'JSS 2', level: 'Junior Secondary' },
]

export const classes: Class[] = classDefs.map((c, i) => ({
  id: id('class', i + 1),
  name: c.name,
  level: c.level,
  classTeacherId: null,
  subjectIds: [],
  studentIds: [],
}))

// ---------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------
const subjectDefs = [
  { name: 'Mathematics', code: 'MTH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Basic Science', code: 'BSC' },
  { name: 'Social Studies', code: 'SOS' },
  { name: 'Computer Studies', code: 'CMP' },
  { name: 'Creative Arts', code: 'ART' },
  { name: 'Physical & Health Education', code: 'PHE' },
  { name: 'Civic Education', code: 'CIV' },
]

export const subjects: Subject[] = subjectDefs.map((s, i) => ({
  id: id('subj', i + 1),
  name: s.name,
  code: s.code,
  classIds: classes.map((c) => c.id),
  teacherIds: [],
}))

// Every class offers every subject in this V1 demo
classes.forEach((c) => {
  c.subjectIds = subjects.map((s) => s.id)
})

// ---------------------------------------------------------------
// Teachers (10)
// ---------------------------------------------------------------
export const teachers: Teacher[] = Array.from({ length: 10 }).map((_, i) => {
  const isMale = rng() > 0.45
  const first = isMale ? pick(rng, maleFirstNames) : pick(rng, femaleFirstNames)
  const last = pick(rng, lastNames)
  return {
    id: id('teacher', i + 1),
    firstName: first,
    lastName: last,
    email: `${first}.${last}`.toLowerCase() + '@brighthorizon.edu.ng',
    phone: `+234 8${randInt(rng, 10, 19)} ${randInt(rng, 100, 999)} ${randInt(rng, 1000, 9999)}`,
    subjectIds: [],
    classIds: [],
    status: 'Active',
  }
})

// Assign each class a class teacher, and spread subject-teaching assignments
classes.forEach((c, i) => {
  const t = teachers[i % teachers.length]
  c.classTeacherId = t.id
  if (!t.classIds.includes(c.id)) t.classIds.push(c.id)
})

subjects.forEach((s, i) => {
  // Assign 2-3 teachers per subject across classes
  const teacherPool = [teachers[i % teachers.length], teachers[(i + 3) % teachers.length]]
  teacherPool.forEach((t) => {
    if (!t.subjectIds.includes(s.id)) t.subjectIds.push(s.id)
    if (!s.teacherIds.includes(t.id)) s.teacherIds.push(t.id)
  })
})

// ---------------------------------------------------------------
// Parents + Students (50 students)
// ---------------------------------------------------------------
export const parents: Parent[] = []
export const students: Student[] = []

const colors = ['#0EA5A0', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#059669', '#4F46E5']

let studentCounter = 1
let parentCounter = 1

const TOTAL_STUDENTS = 52

for (let i = 0; i < TOTAL_STUDENTS; i++) {
  const isMale = rng() > 0.5
  const first = isMale ? pick(rng, maleFirstNames) : pick(rng, femaleFirstNames)
  const last = pick(rng, lastNames)
  const cls = classes[i % classes.length]

  // Create (or reuse, ~20% of the time, a sibling) parent
  let parent: Parent
  if (parents.length > 3 && rng() < 0.18) {
    parent = pick(rng, parents)
  } else {
    const pFirst = pick(rng, rng() > 0.5 ? maleFirstNames : femaleFirstNames)
    parent = {
      id: id('parent', parentCounter++),
      firstName: pFirst,
      lastName: last,
      phone: `+234 7${randInt(rng, 10, 19)} ${randInt(rng, 100, 999)} ${randInt(rng, 1000, 9999)}`,
      email: `${pFirst}.${last}`.toLowerCase() + '@gmail.com',
      studentIds: [],
    }
    parents.push(parent)
  }

  const birthYear = 2026 - (cls.level === 'Nursery' ? randInt(rng, 3, 4) : cls.level === 'Primary' ? randInt(rng, 6, 10) : randInt(rng, 11, 14))
  const student: Student = {
    id: id('student', studentCounter),
    studentCode: `BHA/${birthYear}/${String(studentCounter).padStart(3, '0')}`,
    firstName: first,
    lastName: last,
    gender: isMale ? 'Male' : 'Female',
    dateOfBirth: `${birthYear}-${String(randInt(rng, 1, 12)).padStart(2, '0')}-${String(randInt(rng, 1, 28)).padStart(2, '0')}`,
    classId: cls.id,
    parentIds: [parent.id],
    address: `${randInt(rng, 1, 99)} ${pick(rng, ['Ahmadu Bello Way', 'Gwarinpa Estate', 'Jabi Road', 'Utako Street', 'Wuye Close', 'Life Camp Ave'])}, Abuja`,
    admissionDate: `2024-09-${String(randInt(rng, 1, 28)).padStart(2, '0')}`,
    status: 'Active',
    photoColor: pick(rng, colors),
  }
  studentCounter++
  students.push(student)
  cls.studentIds.push(student.id)
  if (!parent.studentIds.includes(student.id)) parent.studentIds.push(student.id)
}

// ---------------------------------------------------------------
// Attendance (last 20 school days per class)
// ---------------------------------------------------------------
export const attendanceRecords: AttendanceRecord[] = []

function schoolDaysBack(n: number): string[] {
  const dates: string[] = []
  const d = new Date('2026-09-18T00:00:00Z')
  while (dates.length < n) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().slice(0, 10))
    }
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return dates.reverse()
}

const attendanceDates = schoolDaysBack(20)

classes.forEach((c) => {
  attendanceDates.forEach((date, di) => {
    const entries = c.studentIds.map((sid) => {
      const roll = rng()
      let status: 'Present' | 'Absent' | 'Late' = 'Present'
      if (roll > 0.94) status = 'Absent'
      else if (roll > 0.86) status = 'Late'
      return { studentId: sid, status }
    })
    attendanceRecords.push({
      id: id('att', classes.indexOf(c) * 100 + di + 1),
      classId: c.id,
      date,
      entries,
      submittedBy: c.classTeacherId ?? teachers[0].id,
    })
  })
})

// ---------------------------------------------------------------
// Assessments + Scores (2 per subject per class: Test + Examination)
// ---------------------------------------------------------------
export const assessments: Assessment[] = []
export const assessmentScores: AssessmentScore[] = []

let assessCounter = 1
classes.forEach((c) => {
  subjects.forEach((s) => {
    const rounds: { name: string; type: Assessment['type']; max: number; date: string }[] = [
      { name: `${s.name} Test 1`, type: 'Test', max: 20, date: '2026-08-14' },
      { name: `${s.name} Mid-term`, type: 'Mid-term', max: 30, date: '2026-09-04' },
      { name: `${s.name} Examination`, type: 'Examination', max: 50, date: '2026-09-19' },
    ]
    rounds.forEach((r) => {
      const assessment: Assessment = {
        id: id('assess', assessCounter++),
        classId: c.id,
        subjectId: s.id,
        name: r.name,
        type: r.type,
        maxScore: r.max,
        date: r.date,
        term: school.currentTerm,
        session: school.currentSession,
        createdBy: c.classTeacherId ?? teachers[0].id,
      }
      assessments.push(assessment)

      c.studentIds.forEach((sid) => {
        // Give each student a "base ability" per subject so trends look coherent
        const abilitySeed = (sid.charCodeAt(sid.length - 1) + s.id.charCodeAt(s.id.length - 1)) % 40
        const base = 45 + abilitySeed + randInt(rng, -8, 12)
        const raw = Math.max(0, Math.min(100, base))
        const score = Math.round((raw / 100) * r.max)
        assessmentScores.push({
          id: id('score', assessCounter * 100 + c.studentIds.indexOf(sid)),
          assessmentId: assessment.id,
          studentId: sid,
          score,
        })
      })
    })
  })
})

// ---------------------------------------------------------------
// Results (aggregated per student/subject for current term)
// ---------------------------------------------------------------
export const results: Result[] = []

students.forEach((st) => {
  subjects.forEach((s) => {
    const relevantAssessments = assessments.filter((a) => a.classId === st.classId && a.subjectId === s.id)
    let total = 0
    let max = 0
    relevantAssessments.forEach((a) => {
      const sc = assessmentScores.find((x) => x.assessmentId === a.id && x.studentId === st.id)
      if (sc) {
        total += sc.score
        max += a.maxScore
      }
    })
    const pct = percentageOf(total, max)
    const band = gradeFor(pct)
    results.push({
      studentId: st.id,
      classId: st.classId,
      subjectId: s.id,
      term: school.currentTerm,
      session: school.currentSession,
      totalScore: total,
      maxPossible: max,
      percentage: pct,
      grade: band.label,
      remark: band.remark,
    })
  })
})

// ---------------------------------------------------------------
// Fees + Payments
// ---------------------------------------------------------------
export const fees: Fee[] = []
export const payments: Payment[] = []

const feeByLevel: Record<string, number> = {
  Nursery: 85000,
  Primary: 110000,
  'Junior Secondary': 145000,
}

let paymentCounter = 1
students.forEach((st, i) => {
  const cls = classes.find((c) => c.id === st.classId)!
  const amountDue = feeByLevel[cls.level]
  const payRoll = rng()
  let amountPaid = 0
  if (payRoll > 0.55) amountPaid = amountDue // fully paid
  else if (payRoll > 0.25) amountPaid = Math.round((amountDue * randInt(rng, 40, 85)) / 100) // partial
  // else outstanding (0 paid)

  const status: Fee['status'] =
    amountPaid >= amountDue ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Outstanding'

  const fee: Fee = {
    id: id('fee', i + 1),
    studentId: st.id,
    classId: st.classId,
    term: school.currentTerm,
    session: school.currentSession,
    amountDue,
    amountPaid,
    status,
  }
  fees.push(fee)

  if (amountPaid > 0) {
    payments.push({
      id: id('payment', paymentCounter++),
      studentId: st.id,
      feeId: fee.id,
      amount: amountPaid,
      date: `2026-09-${String(randInt(rng, 1, 20)).padStart(2, '0')}`,
      method: pick(rng, ['Cash', 'Bank Transfer', 'Card', 'Cheque']),
      reference: `PYT-${randInt(rng, 100000, 999999)}`,
      note: status === 'Partially Paid' ? 'First installment' : undefined,
    })
  }
})

// ---------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------
export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Mid-term Break Resumption',
    message:
      'All students are expected to resume for the second half of First Term on Monday, September 29th. Please ensure school uniforms are ready.',
    audience: 'All Parents',
    date: '2026-09-19',
    createdBy: 'School Admin',
  },
  {
    id: 'ann-2',
    title: 'JSS 2 Excursion Permission Slips',
    message: 'Parents of JSS 2 students should submit signed excursion permission slips by Friday.',
    audience: 'Specific Class',
    classId: classes.find((c) => c.name === 'JSS 2')?.id,
    date: '2026-09-17',
    createdBy: 'School Admin',
  },
  {
    id: 'ann-3',
    title: 'Staff Meeting — Assessment Moderation',
    message: 'All teaching staff should attend the assessment moderation meeting this Thursday at 3pm in the staff room.',
    audience: 'Teachers',
    date: '2026-09-16',
    createdBy: 'Headmaster',
  },
  {
    id: 'ann-4',
    title: 'Term Fee Reminder',
    message: 'Parents with outstanding First Term fees are kindly reminded to complete payment before the end of the month.',
    audience: 'All Parents',
    date: '2026-09-10',
    createdBy: 'Accounts Office',
  },
]

// ---------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------
export const notifications: AppNotification[] = [
  { id: 'notif-1', type: 'announcement', title: 'New announcement', description: 'Mid-term Break Resumption posted', date: '2026-09-19', read: false },
  { id: 'notif-2', type: 'assessment', title: 'Assessment submitted', description: 'JSS 1 Mathematics Examination scores entered', date: '2026-09-19', read: false },
  { id: 'notif-3', type: 'payment', title: 'Fee payment recorded', description: 'Payment received for a Primary 2 student', date: '2026-09-18', read: true },
  { id: 'notif-4', type: 'attendance', title: 'Attendance issue', description: '3 unexplained absences in JSS 2 this week', date: '2026-09-18', read: false },
  { id: 'notif-5', type: 'report', title: 'Report generated', description: 'Class performance report for Primary 1 is ready', date: '2026-09-17', read: true },
]

// ---------------------------------------------------------------
// Recent Activity (for dashboard feed)
// ---------------------------------------------------------------
export const recentActivity: RecentActivity[] = [
  { id: 'act-1', type: 'student', message: 'New student added to Primary 2', timestamp: '2026-09-19T09:12:00Z' },
  { id: 'act-2', type: 'attendance', message: 'Attendance submitted for JSS 1', timestamp: '2026-09-19T08:05:00Z' },
  { id: 'act-3', type: 'assessment', message: 'Examination scores entered for JSS 2 Mathematics', timestamp: '2026-09-18T14:40:00Z' },
  { id: 'act-4', type: 'payment', message: 'Fee payment recorded for a Nursery 1 student', timestamp: '2026-09-18T11:22:00Z' },
  { id: 'act-5', type: 'teacher', message: 'New teacher profile created', timestamp: '2026-09-17T10:00:00Z' },
]
