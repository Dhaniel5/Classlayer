// ============================================================
// CLASSLAYER — Core Data Models
// ============================================================

export type Role =
  | 'proprietor'
  | 'head_of_school'
  | 'head_of_academics'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'parent'

export type Gender = 'Male' | 'Female'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarColor?: string
  phone?: string
  linkedId?: string // teacherId / parentId / studentId depending on role
}

export interface School {
  id: string
  name: string
  address: string
  phone: string
  email: string
  logoInitials: string
  currentSession: string
  currentTerm: 'First Term' | 'Second Term' | 'Third Term'
}

export interface GradeBand {
  id: string
  label: string // e.g. "A"
  min: number
  max: number
  remark: string
}

export interface Subject {
  id: string
  name: string
  code: string
  classIds: string[]
  teacherIds: string[]
}

export interface Class {
  id: string
  name: string // e.g. "JSS 1"
  level: string // Nursery, Primary, Junior Secondary
  classTeacherId: string | null
  subjectIds: string[]
  studentIds: string[]
  termFee: number
}

export interface Parent {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  studentIds: string[]
}

export interface Student {
  id: string
  studentCode: string
  firstName: string
  lastName: string
  gender: Gender
  dateOfBirth: string
  classId: string
  parentIds: string[]
  address: string
  admissionDate: string
  status: 'Active' | 'Inactive'
  photoColor: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  subjectIds: string[]
  classIds: string[]
  status: 'Active' | 'Inactive'
}

export interface Accountant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late'

export interface AttendanceRecord {
  id: string
  classId: string
  date: string // ISO date
  entries: {
    studentId: string
    status: AttendanceStatus
  }[]
  submittedBy: string
}

export type AssessmentType = 'Test' | 'Assignment' | 'Mid-term' | 'Examination'

export interface Assessment {
  id: string
  classId: string
  subjectId: string
  name: string
  type: AssessmentType
  maxScore: number
  date: string
  term: string
  session: string
  createdBy: string
}

export interface AssessmentScore {
  id: string
  assessmentId: string
  studentId: string
  score: number
}

export interface Result {
  studentId: string
  classId: string
  subjectId: string
  term: string
  session: string
  totalScore: number
  maxPossible: number
  percentage: number
  grade: string
  remark: string
}

export type FeeStatus = 'Paid' | 'Partially Paid' | 'Outstanding'

export interface Fee {
  id: string
  studentId: string
  classId: string
  term: string
  session: string
  amountDue: number
  amountPaid: number
  status: FeeStatus
}

export interface Payment {
  id: string
  studentId: string
  feeId: string
  amount: number
  date: string
  method: 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque'
  reference: string
  note?: string
}

export type AnnouncementAudience = 'All Parents' | 'Specific Class' | 'Teachers' | 'Staff'

export interface Announcement {
  id: string
  title: string
  message: string
  audience: AnnouncementAudience
  classId?: string
  date: string
  createdBy: string
}

export type NotificationType =
  | 'announcement'
  | 'assessment'
  | 'payment'
  | 'report'
  | 'attendance'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  date: string
  read: boolean
}

export type AIInsightLevel = 'positive' | 'warning' | 'critical' | 'neutral'

export interface AIInsight {
  id: string
  scope: 'school' | 'class' | 'student'
  scopeId?: string
  title: string
  observation: string
  supportingData: string
  suggestedAction: string
  level: AIInsightLevel
  generatedAt: string
}

export interface RecentActivity {
  id: string
  type: 'student' | 'teacher' | 'attendance' | 'assessment' | 'payment'
  message: string
  timestamp: string
}
