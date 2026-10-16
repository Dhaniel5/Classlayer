import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/services/auth/AuthContext'
import { StoreProvider } from '@/services/store'
import { ToastProvider } from '@/components/ui/toast'
import { AppShell } from '@/components/layout/AppShell'
import { ParentShell } from '@/components/layout/ParentShell'
import { ProtectedRoute, RequireFeature } from '@/components/layout/ProtectedRoute'
import { isSupabaseConfigured } from '@/lib/supabase'
import SetupRequired from '@/pages/auth/SetupRequired'
import type { Feature } from '@/lib/permissions'

import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import StudentsPage from '@/pages/admin/StudentsPage'
import StudentDetailPage from '@/pages/admin/StudentDetailPage'
import TeachersPage from '@/pages/admin/TeachersPage'
import ClassesPage from '@/pages/admin/ClassesPage'
import ClassDetailPage from '@/pages/admin/ClassDetailPage'
import SubjectsPage from '@/pages/admin/SubjectsPage'
import ParentsPage from '@/pages/admin/ParentsPage'
import AttendancePage from '@/pages/admin/AttendancePage'
import AssessmentsPage from '@/pages/admin/AssessmentsPage'
import AssessmentScoreEntryPage from '@/pages/admin/AssessmentScoreEntryPage'
import ResultsPage from '@/pages/admin/ResultsPage'
import FeesPage from '@/pages/admin/FeesPage'
import ReportsPage from '@/pages/admin/ReportsPage'
import AIInsightsPage from '@/pages/admin/AIInsightsPage'
import AnnouncementsPage from '@/pages/admin/AnnouncementsPage'
import SettingsPage from '@/pages/admin/SettingsPage'

import ParentHomePage from '@/pages/parent/ParentHomePage'
import ParentChildPage from '@/pages/parent/ParentChildPage'
import ParentAttendancePage from '@/pages/parent/ParentAttendancePage'
import ParentResultsPage from '@/pages/parent/ParentResultsPage'
import ParentFeesPage from '@/pages/parent/ParentFeesPage'
import ParentReportsPage from '@/pages/parent/ParentReportsPage'
import ParentAnnouncementsPage from '@/pages/parent/ParentAnnouncementsPage'

const guard = (feature: Feature, el: React.ReactNode) => <RequireFeature feature={feature}>{el}</RequireFeature>

function RootRedirect() {
  const { user, status } = useAuth()
  if (status === 'loading') return null
  if (status === 'no_role') return <Navigate to="/app/dashboard" replace />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'parent' ? '/parent/home' : '/app/dashboard'} replace />
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Staff workspace: school leadership, teachers, accountant */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute allow={['proprietor', 'head_of_school', 'head_of_academics', 'admin', 'teacher', 'accountant']}>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={guard('dashboard', <DashboardPage />)} />
                <Route path="students" element={guard('students', <StudentsPage />)} />
                <Route path="students/:studentId" element={guard('students', <StudentDetailPage />)} />
                <Route path="teachers" element={guard('teachers', <TeachersPage />)} />
                <Route path="classes" element={guard('classes', <ClassesPage />)} />
                <Route path="classes/:classId" element={guard('classes', <ClassDetailPage />)} />
                <Route path="subjects" element={guard('subjects', <SubjectsPage />)} />
                <Route path="parents" element={guard('parents', <ParentsPage />)} />
                <Route path="attendance" element={guard('attendance', <AttendancePage />)} />
                <Route path="assessments" element={guard('assessments', <AssessmentsPage />)} />
                <Route path="assessments/:assessmentId" element={guard('assessments', <AssessmentScoreEntryPage />)} />
                <Route path="results" element={guard('results', <ResultsPage />)} />
                <Route path="fees" element={guard('fees', <FeesPage />)} />
                <Route path="reports" element={guard('reports', <ReportsPage />)} />
                <Route path="ai-insights" element={guard('ai-insights', <AIInsightsPage />)} />
                <Route path="announcements" element={guard('announcements', <AnnouncementsPage />)} />
                <Route path="settings" element={guard('settings', <SettingsPage />)} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>

              {/* Parent portal */}
              <Route
                path="/parent"
                element={
                  <ProtectedRoute allow={['parent']}>
                    <ParentShell />
                  </ProtectedRoute>
                }
              >
                <Route path="home" element={<ParentHomePage />} />
                <Route path="child" element={<ParentChildPage />} />
                <Route path="attendance" element={<ParentAttendancePage />} />
                <Route path="results" element={<ParentResultsPage />} />
                <Route path="fees" element={<ParentFeesPage />} />
                <Route path="reports" element={<ParentReportsPage />} />
                <Route path="announcements" element={<ParentAnnouncementsPage />} />
                <Route index element={<Navigate to="home" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
