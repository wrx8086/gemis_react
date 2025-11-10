import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import BaseLayout from '../../components/layout/BaseLayout';
import MainMenu from '../dashboard/MainMenu';
import type { MenuItem } from '../dashboard/MainMenu';
import { apiGet } from '../../shared/api/apiClient';

interface PageData {
  menu?: {
    webmenu?: MenuItem[];
  };
  title?: string;
  content?: any;
  [key: string]: any;
}

const GenericPage: React.FC = () => {
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const { session, isAuthenticated } = useSession();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    if (page) {
      loadPageData();
    }
  }, [page, session]);

  const loadPageData = async () => {
    if (!page) return;
    
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('function', 'init');

      const data: PageData = await apiGet(`/${page}`, params);

      setPageData(data);
      
      if (data.menu && data.menu.webmenu && Array.isArray(data.menu.webmenu)) {
        setMenuItems(data.menu.webmenu);
      } else if (data.menu && Array.isArray(data.menu)) {
        setMenuItems(data.menu as any);
      } else {
        setMenuItems([]);
      }
      
    } catch (error) {
      console.error(`Fehler beim Laden von ${page}:`, error);
      setError(`Fehler beim Laden der Seite "${page}".`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <BaseLayout
      title={pageData?.title || `GeMIS - ${page}`}
      footerCenter="© 2024 AnalytikData PRIME GmbH"
      showUserInfo={true}
      showLogout={true}
    >
      {/* Menü anzeigen wenn verfügbar */}
      {menuItems.length > 0 && (
        <div className="mb-6">
          <MainMenu menuItems={menuItems} />
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="spinner mx-auto mb-4 w-12 h-12"></div>
              <p className="text-gray-500">Lade {page}...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                {pageData?.title || page}
              </h1>
              
              <p className="text-gray-600 mb-4">
                Seite: <strong>{page}</strong>
              </p>
              
              <div className="alert-info">
                <h3 className="font-semibold text-blue-800 mb-2">💡 Hinweis</h3>
                <p className="text-blue-700 text-sm">
                  Diese Seite wird dynamisch geladen basierend auf der URL und API-Response.
                  Hier können spezifische Komponenten basierend auf dem Seitennamen gerendert werden.
                </p>
              </div>
            </div>

            {/* Debug: API Response anzeigen */}
            {pageData && Object.keys(pageData).length > 0 && (
              <div className="card">
                <h2 className="card-header">
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
