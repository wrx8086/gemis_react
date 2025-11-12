import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { registerSessionGetter } from './shared/api/apiClient';
import { useEffect } from 'react';
import LoginPage from './modules/auth/LoginPage';
import FormDesigner from './modules/form-designer/FormDesigner';
import FormDesignerStandalone from './modules/form-designer/FormDesignerStandalone';
import Dashboard from './modules/dashboard/Dashboard';
import GenericPage from './modules/common/GenericPage';
import MenuDesigner from './modules/admin/MenuDesigner';
import UserManagement from './modules/admin/UserManagement';
import TabSystemDemo from './modules/demo/TabSystemDemo';

// Komponente um Session-Getter zu registrieren
const SessionRegistration = () => {
  const { session } = useSession();

  useEffect(() => {
    // Session-Getter im apiClient registrieren - GANZES Session-Objekt!
    registerSessionGetter(() => session);
  }, [session]);

  return null;
};

// App Content mit Routes
const AppContent = () => {
  return (
    <>
      <SessionRegistration />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin-Bereich */}
        {/* WICHTIG: menudesigner Route OHNE Bindestrich, wie im menu_link! */}
        <Route path="/menudesigner" element={<MenuDesigner />} />

        {/* Redirect von /menudesigner/config zu /menudesigner */}
        <Route path="/menudesigner/config" element={<Navigate to="/menudesigner" replace />} />

        <Route path="/users" element={<UserManagement />} />

        {/* FormDesigner mit Session (innerhalb des Systems) */}
        <Route path="/form-designer" element={<FormDesigner />} />

        {/* ⭐ STANDALONE FormDesigner OHNE Login/Session */}
        <Route path="/form-designer-standalone" element={<FormDesignerStandalone />} />

        {/* Generische Seite für dynamische Menü-Links - MUSS AM ENDE STEHEN! */}
        <Route path="/:page" element={<GenericPage />} />

        {/* SCHNELLTEST - direkt aufrufen */}
        <Route path="/test-tabs" element={<TabSystemDemo />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;
