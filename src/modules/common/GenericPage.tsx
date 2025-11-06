import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import BaseLayout from '../../components/layout/BaseLayout';
import MainMenu from '../dashboard/MainMenu';
import { apiGet } from '../../shared/api/apiClient';

interface MenuItem {
  stufe1: number;
  stufe2: number;
  stufe3: number;
  menutext: string;
  menulink: string;
}

interface PageData {
  menu?: {
    webmenu?: MenuItem[];
  };
  title?: string;
  content?: any;
  [key: string]: any;
}

/**
 * GenericPage - Dynamische Seite für alle Menu-Links
 * 
 * Lädt Daten von /web/{page}?function=init
 * Zeigt Menü und Page-Content basierend auf API-Response
 */
const GenericPage: React.FC = () => {
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const { session, isAuthenticated } = useSession();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Session-Check
    if (!isAuthenticated()) {
      console.log('❌ Nicht authentifiziert - Redirect zu /login');
      navigate('/login');
      return;
    }
    
    loadPageData();
  }, [page, session]);

  const loadPageData = async () => {
    if (!page) return;
    
    try {
      setIsLoading(true);
      setError('');

      console.log(`📄 Lade Seite: ${page} mit /${page}?function=init`);

      const params = new URLSearchParams();
      params.append('function', 'init');

      // API-Call: /web/{page}?function=init
      const data: PageData = await apiGet(`/${page}`, params);

      console.log(`✅ Seiten-Daten geladen für ${page}:`, data);

      setPageData(data);
      
      // Menü aus Response laden (wenn vorhanden)
      // Backend liefert: { menu: { webmenu: [...] } }
      if (data.menu && data.menu.webmenu && Array.isArray(data.menu.webmenu)) {
        console.log('📋 Menü geladen:', data.menu.webmenu.length, 'Items');
        setMenuItems(data.menu.webmenu);
      } else if (data.menu && Array.isArray(data.menu)) {
        // Fallback: Wenn menu direkt ein Array ist
        console.log('📋 Menü geladen (Fallback):', data.menu.length, 'Items');
        setMenuItems(data.menu as any);
      } else {
        console.log('⚠️ Kein Menü in Response');
        setMenuItems([]);
      }
      
    } catch (error) {
      console.error(`❌ Fehler beim Laden von ${page}:`, error);
      setError(`Fehler beim Laden der Seite "${page}".`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null; // Redirect zu Login läuft
  }

  return (
    <BaseLayout
      title={pageData?.title || `GeMIS - ${page}`}
      footerLeft="Footer Teil 1"
      footerCenter="Footer Teil 2"
      footerRight="Footer Teil 3"
      showUserInfo={true}
      showLogout={true}
    >
      {/* Menü anzeigen wenn verfügbar */}
      {menuItems.length > 0 && (
        <div className="mb-6">
          <MainMenu items={menuItems} />
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Lade {page}...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                {pageData?.title || page}
              </h1>
              
              {/* Hier würde der eigentliche Page-Content gerendert */}
              <p className="text-gray-600 mb-4">
                Seite: <strong>{page}</strong>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">💡 Hinweis</h3>
                <p className="text-blue-700 text-sm">
                  Diese Seite wird dynamisch geladen basierend auf der URL und API-Response.
                  Hier können spezifische Komponenten basierend auf dem Seitennamen gerendert werden.
                </p>
              </div>
            </div>

            {/* Debug: API Response anzeigen */}
            {pageData && Object.keys(pageData).length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  🔍 Debug: API Response
                </h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
                  {JSON.stringify(pageData, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default GenericPage;
