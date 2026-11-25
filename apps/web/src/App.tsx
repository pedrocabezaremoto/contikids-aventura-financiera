import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { RequireRole } from './auth/RequireRole';
import { queryClient } from './lib/queries';
import { TeacherHome } from './pages/Homes';
import { Status } from './pages/Status';
import { PinEntry, ProfilePicker, SectionCode } from './pages/StudentAccess';
import { TeacherLogin } from './pages/TeacherLogin';
import { Welcome } from './pages/Welcome';
import { LessonPage } from './student/LessonPage';
import { QuizPage } from './student/QuizPage';
import { MapPage } from './student/MapPage';
import { ModulePage } from './student/ModulePage';
import { StudentLayout } from './student/StudentLayout';
import { ProfilePage, RewardsPage } from './student/Tabs';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/docente/entrar" element={<TeacherLogin />} />
            <Route path="/estudiante" element={<SectionCode />} />
            <Route path="/estudiante/:code" element={<ProfilePicker />} />
            <Route path="/estudiante/:code/:studentId" element={<PinEntry />} />
            <Route
              element={
                <RequireRole role="STUDENT">
                  <StudentLayout />
                </RequireRole>
              }
            >
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/mapa/:code" element={<ModulePage />} />
              <Route path="/mapa/m1/leccion" element={<LessonPage />} />
              <Route path="/mapa/m1/quiz" element={<QuizPage />} />
              <Route path="/recompensas" element={<RewardsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
            <Route
              path="/docente"
              element={
                <RequireRole role="TEACHER">
                  <TeacherHome />
                </RequireRole>
              }
            />
            <Route path="/estado" element={<Status />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
