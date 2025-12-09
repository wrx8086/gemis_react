import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { registerSessionGetter } from './shared/api/apiClient';
import { useEffect } from 'react';
import LoginPage from './modules/auth/LoginPage';
import FormDesigner from './modules/admin/FormDesigner';
import FormDesignerStandalone from './modules/form-designer/FormDesignerStandalone';
import Dashboard from './modules/dashboard/Dashboard';
import GenericPage from './modules/common/GenericPage';
import MenuDesigner from './modules/admin/MenuDesigner';
// import UserManagement from './modules/admin/_UserManagement';
import FormProgram from './modules/admin/FormProgram';
import TabSystemDemo from './modules/demo/TabSystemDemo';
import ProgramGenerator from './modules/admin/ProgramGenerator';
import DynamicProgramLoader from './modules/admin/DynamicProgramLoader';

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

        <Route path="/program-generator" element={<ProgramGenerator />} />
        
        {/* Dynamic Programs - Query Parameter Version */}
        <Route path="/dynamic" element={<DynamicProgramLoader />} />

        {/* FormDesigner mit Session (innerhalb des Systems) */}
        <Route path="/formdesigner" element={<FormDesigner />} />

        {/* ⭐ STANDALONE FormDesigner OHNE Login/Session */}
        <Route path="/form-designer-standalone" element={<FormDesignerStandalone />} />

        {/* Dynamic Form Program - CRUD basierend auf Form-Definition */}
        <Route path="/formprogram" element={<FormProgram />} />

        {/* Generische Seite für dynamische Menü-Links - MUSS AM ENDE STEHEN! */}
        <Route path="/:page" element={<GenericPage />} />

        {/* SCHNELLTEST - direkt aufrufen */}
        <Route path="/test-tabs" element={<TabSystemDemo />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
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