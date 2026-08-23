// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';

// Public pages
import Landing         from './pages/Landing';
import Login           from './pages/auth/Login';
import Register        from './pages/auth/Register';

// Citizen pages
import CitizenDashboard  from './pages/citizen/CitizenDashboard';
import ReportComplaint   from './pages/citizen/ReportComplaint';
import ComplaintSuccess  from './pages/citizen/ComplaintSuccess';
import ComplaintDetail   from './pages/citizen/ComplaintDetail';
import MyComplaints      from './pages/citizen/MyComplaints';

// Admin pages
import AdminDashboard        from './pages/admin/AdminDashboard';
import AdminComplaints       from './pages/admin/AdminComplaints';
import AdminComplaintDetail  from './pages/admin/AdminComplaintDetail';
import AdminMap              from './pages/admin/AdminMap';
import AdminWorkers          from './pages/admin/AdminWorkers';

// Worker pages
import WorkerDashboard        from './pages/worker/WorkerDashboard';
import WorkerComplaintDetail  from './pages/worker/WorkerComplaintDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* ── Public ── */}
          <Route element={<PublicLayout />}>
            <Route path="/"         element={<Landing />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* ── Citizen ── */}
          <Route element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/citizen/dashboard"         element={<CitizenDashboard />} />
            <Route path="/citizen/report"            element={<ReportComplaint />} />
            <Route path="/citizen/verify/:id"        element={<ComplaintSuccess />} />
            <Route path="/citizen/complaint/:id"     element={<ComplaintDetail />} />
            <Route path="/citizen/complaints"        element={<MyComplaints />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin/dashboard"         element={<AdminDashboard />} />
            <Route path="/admin/complaints"        element={<AdminComplaints />} />
            <Route path="/admin/complaints/:id"    element={<AdminComplaintDetail />} />
            <Route path="/admin/map"               element={<AdminMap />} />
            <Route path="/admin/workers"           element={<AdminWorkers />} />
          </Route>

          {/* ── Field Worker ── */}
          <Route element={
            <ProtectedRoute allowedRoles={['field_worker']}>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/worker/dashboard"        element={<WorkerDashboard />} />
            <Route path="/worker/complaint/:id"    element={<WorkerComplaintDetail />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
