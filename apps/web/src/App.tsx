import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { RequireRole } from './auth/RequireRole';
import { StudentHome, TeacherHome } from './pages/Homes';
import { Status } from './pages/Status';
import { PinEntry, ProfilePicker, SectionCode } from './pages/StudentAccess';
import { TeacherLogin } from './pages/TeacherLogin';
import { Welcome } from './pages/Welcome';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/docente/entrar" element={<TeacherLogin />} />
          <Route path="/estudiante" element={<SectionCode />} />
          <Route path="/estudiante/:code" element={<ProfilePicker />} />
          <Route path="/estudiante/:code/:studentId" element={<PinEntry />} />
          <Route
            path="/mapa"
            element={
              <RequireRole role="STUDENT">
                <StudentHome />
              </RequireRole>
            }
          />
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
  );
}
