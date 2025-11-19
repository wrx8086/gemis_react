import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MenuItem {
  menu_id: string;
  menu_text: string;
  menu_link?: string;
  openMode?: 'simple' | 'new' | 'complex';
  admin?: boolean;
  children?: MenuItem[];
}

export interface SessionData {
  session_token?: string;
  company?: string;
  user_name?: string;
  display_name?: string;
  language_id?: number;
  menu?: MenuItem[];
  labels?: {
    btn_new: string;
    btn_edit: string;
    btn_copy: string;
    btn_delete: string;
    btn_save: string;
    btn_cancel: string;
    btn_first: string;
    btn_previous: string;
    btn_next: string;
    btn_last: string;
    form_load: string;
  };
}

interface SessionContextType {
  session: SessionData | null;
  setSession: (data: SessionData | null) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSessionState] = useState<SessionData | null>(null);

  // Session aus sessionStorage laden beim Start
  useEffect(() => {
    const loadSession = () => {
      const session_token = sessionStorage.getItem('X-SESSION-TOKEN');
      const company = sessionStorage.getItem('X-COMPANY');
      const user_name = sessionStorage.getItem('X-USER-NAME');
      const display_name = sessionStorage.getItem('X-DISPLAY-NAME');
      const language_id = sessionStorage.getItem('X-LANGUAGE-ID');
      const menuStr = sessionStorage.getItem('X-MENU');
      const labelsStr = sessionStorage.getItem('X-LABELS');

      if (company && user_name) {
        const sessionData: SessionData = {
          session_token: session_token || '',
          company: company,
          user_name: user_name,
          display_name: display_name || user_name,
          language_id: language_id ? parseInt(language_id) : undefined
        };

        // Menu aus sessionStorage laden wenn vorhanden
        if (menuStr) {
          try {
            sessionData.menu = JSON.parse(menuStr);
          } catch (error) {
            console.error('Fehler beim Parsen des Menüs:', error);
          }
        }

        // Labels aus sessionStorage laden wenn vorhanden
        if (labelsStr) {
          try {
            sessionData.labels = JSON.parse(labelsStr);
          } catch (error) {
            console.error('Fehler beim Parsen der Labels:', error);
          }
        }

        setSessionState(sessionData);
      }
    };

    loadSession();
  }, []);

  // Session setzen und in sessionStorage speichern
  const setSession = (data: SessionData | null) => {
    if (data) {
      // In State speichern
      setSessionState(data);

      // In sessionStorage speichern
      sessionStorage.setItem('X-SESSION-TOKEN', data.session_token || '');
      
      if (data.company) {
        sessionStorage.setItem('X-COMPANY', data.company);
      }
      if (data.user_name) {
        sessionStorage.setItem('X-USER-NAME', data.user_name);
      }
      if (data.display_name) {
        sessionStorage.setItem('X-DISPLAY-NAME', data.display_name);
      }
      if (data.language_id !== undefined) {
        sessionStorage.setItem('X-LANGUAGE-ID', String(data.language_id));
      }
      if (data.menu) {
        sessionStorage.setItem('X-MENU', JSON.stringify(data.menu));
      }
      if (data.labels) {
        sessionStorage.setItem('X-LABELS', JSON.stringify(data.labels));
      }
    } else {
      clearSession();
    }
  };

  // Session komplett löschen
  const clearSession = () => {
    setSessionState(null);
    sessionStorage.removeItem('X-SESSION-TOKEN');
    sessionStorage.removeItem('X-COMPANY');
    sessionStorage.removeItem('X-USER-NAME');
    sessionStorage.removeItem('X-DISPLAY-NAME');
    sessionStorage.removeItem('X-LANGUAGE-ID');
    sessionStorage.removeItem('X-MENU');
    sessionStorage.removeItem('X-LABELS');
  };

  // Prüfen ob Benutzer authentifiziert ist
  const isAuthenticated = (): boolean => {
    return !!(session?.company && session?.user_name);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        clearSession,
        isAuthenticated
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// Hook zum Verwenden des SessionContext
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};