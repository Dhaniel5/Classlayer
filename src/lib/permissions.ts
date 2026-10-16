import type { ComponentType } from 'react'
import type { Role } from '@/types'
import {
  LayoutDashboard, Users, GraduationCap, School2, BookOpen, UserRound,
  CalendarCheck, ClipboardList, Award, Wallet, FileBarChart, Sparkles,
  Settings, Megaphone,
} from 'lucide-react'

export type Feature =
  | 'dashboard' | 'students' | 'teachers' | 'classes' | 'subjects' | 'parents'
  | 'attendance' | 'assessments' | 'results' | 'fees' | 'reports'
  | 'ai-insights' | 'announcements' | 'settings'

export interface NavItem {
  label: string
  path: string
  feature?: Feature
  icon: ComponentType<{ className?: string }>
}

/** Roles that may see EVERY student in the school. The database enforces the same list. */
export const SCHOOL_WIDE_ROLES: Role[] = ['proprietor', 'head_of_school', 'head_of_academics', 'admin']
/** Roles that may see and record fees/payments. */
export const FINANCE_ROLES: Role[] = ['proprietor', 'head_of_school', 'admin', 'accountant']

export const canSeeAllStudents = (r: Role) => SCHOOL_WIDE_ROLES.includes(r)
export const canManageSchool = canSeeAllStudents // add/edit students, teachers, classes, subjects, announcements
export const canSeeFinance = (r: Role) => FINANCE_ROLES.includes(r)

const ALL: Feature[] = [
  'dashboard', 'students', 'teachers', 'classes', 'subjects', 'parents', 'attendance',
  'assessments', 'results', 'fees', 'reports', 'ai-insights', 'announcements', 'settings',
]

const featuresByRole: Record<Role, Feature[]> = {
  proprietor: ALL,
  head_of_school: ALL,
  admin: ALL,
  head_of_academics: [
    'dashboard', 'students', 'teachers', 'classes', 'subjects', 'parents', 'attendance',
    'assessments', 'results', 'reports', 'ai-insights', 'announcements',
  ],
  teacher: ['dashboard', 'students', 'classes', 'attendance', 'assessments', 'results', 'ai-insights', 'announcements'],
  accountant: ['dashboard', 'fees', 'reports', 'announcements'],
  parent: [],
}

export function canAccess(role: Role, feature: Feature): boolean {
  return featuresByRole[role].includes(feature)
}

const allNav: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', feature: 'dashboard', icon: LayoutDashboard },
  { label: 'Students', path: '/app/students', feature: 'students', icon: GraduationCap },
  { label: 'Teachers', path: '/app/teachers', feature: 'teachers', icon: Users },
  { label: 'Classes', path: '/app/classes', feature: 'classes', icon: School2 },
  { label: 'Subjects', path: '/app/subjects', feature: 'subjects', icon: BookOpen },
  { label: 'Parents', path: '/app/parents', feature: 'parents', icon: UserRound },
  { label: 'Attendance', path: '/app/attendance', feature: 'attendance', icon: CalendarCheck },
  { label: 'Assessments', path: '/app/assessments', feature: 'assessments', icon: ClipboardList },
  { label: 'Results', path: '/app/results', feature: 'results', icon: Award },
  { label: 'Fees', path: '/app/fees', feature: 'fees', icon: Wallet },
  { label: 'Reports', path: '/app/reports', feature: 'reports', icon: FileBarChart },
  { label: 'AI Insights', path: '/app/ai-insights', feature: 'ai-insights', icon: Sparkles },
  { label: 'Announcements', path: '/app/announcements', feature: 'announcements', icon: Megaphone },
  { label: 'Settings', path: '/app/settings', feature: 'settings', icon: Settings },
]

export function getNavForRole(role: Role): NavItem[] {
  return allNav.filter((n) => n.feature && canAccess(role, n.feature))
}

export const parentNav: NavItem[] = [
  { label: 'Home', path: '/parent/home', icon: LayoutDashboard },
  { label: 'My Child', path: '/parent/child', icon: GraduationCap },
  { label: 'Attendance', path: '/parent/attendance', icon: CalendarCheck },
  { label: 'Results', path: '/parent/results', icon: Award },
  { label: 'Fees', path: '/parent/fees', icon: Wallet },
  { label: 'Reports', path: '/parent/reports', icon: FileBarChart },
  { label: 'Announcements', path: '/parent/announcements', icon: Megaphone },
]

export const roleLabels: Record<Role, string> = {
  proprietor: 'Proprietor',
  head_of_school: 'Head of School',
  head_of_academics: 'Head of Academics',
  admin: 'School Admin',
  teacher: 'Teacher',
  accountant: 'Accountant',
  parent: 'Parent',
}
