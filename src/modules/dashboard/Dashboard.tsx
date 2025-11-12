import React, { useEffect, useState } from 'react';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSession } from '../../contexts/SessionContext';
import { apiGet } from '../../shared/api/apiClient';
import type { MenuItem } from '../../contexts/SessionContext';

const Dashboard: React.FC = () => {
  const { session, setSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Nur laden wenn Session da ist und Menü fehlt
    if (session && (!session.menu || session.menu.length === 0)) {
      loadMenu();
    }
  }, [session?.session_token]);

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Lade Dashboard-Daten...');
      const params = new URLSearchParams({ function: 'init' });
      const data = await apiGet('/dashboard', params);
      
      console.log('✅ Dashboard-Antwort:', data);
      console.log('🔍 Response-Typ:', typeof data);
      console.log('🔍 Is Array?:', Array.isArray(data));

      let menuData: MenuItem[] | null = null;

      // Fall 1: Response ist direkt ein Array von Menu-Items
      if (Array.isArray(data) && data.length > 0 && data[0].menu_id) {
        console.log('📋 Format 1: Direkt als Array');
        menuData = data;
      }
      // Fall 2: Response hat menu-Property als Array
      else if (data.menu && Array.isArray(data.menu)) {
        console.log('📋 Format 2: data.menu Array');
        menuData = data.menu;
      }
      // Fall 3: Response hat dsResponse.menu
      else if (data.dsResponse?.menu && Array.isArray(data.dsResponse.menu)) {
        console.log('📋 Format 3: data.dsResponse.menu');
        menuData = data.dsResponse.menu;
      }
      // Fall 4: Response hat ttMenu als Array
      else if (data.ttMenu && Array.isArray(data.ttMenu)) {
        console.log('📋 Format 4: data.ttMenu');
        menuData = data.ttMenu;
      }
      // Fall 5: Irgendwo ist ein Array mit menu_id drin
      else {
        console.log('🔍 Suche nach Menu in Response...');
        console.log('Keys:', Object.keys(data));
        
        // Durchsuche alle Properties
        for (const key of Object.keys(data)) {
          const value = data[key];
          if (Array.isArray(value) && value.length > 0 && value[0].menu_id) {
            console.log(`📋 Format 5: Gefunden in data.${key}`);
            menuData = value;
            break;
          }
        }
      }

      if (menuData && menuData.length > 0) {
        console.log('✅ Menü gefunden:', menuData.length, 'Haupteinträge');
        console.log('📋 Menü-Struktur:', JSON.stringify(menuData, null, 2));
        
        if (session) {
          setSession({
            ...session,
            menu: menuData as MenuItem[]
          });
          console.log('💾 Menü in Session gespeichert');
        }
      } else {
        console.warn('⚠️ Kein Menü in Response gefunden');
        console.log('📄 Vollständige Response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseLayout
      title=" Ge_MIS Dashboard"
      showUserInfo={true}
      showLogout={true}
      showNavigation={true}
    >
      <div className="container-fluid">
        {isLoading && (
          <div className="alert alert-info">
            Lade Dashboard-Daten...
          </div>
        )}

        {/* Willkommen Card */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">Willkommen im GeMIS System</h3>
          </div>
          <div className="card-body">
            <p>Nutzen Sie die Navigation oben, um zu den verschiedenen Modulen zu gelangen.</p>
          </div>
        </div>

        {/* Statistik Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h4 className="card-title">Aufgaben</h4>
                <p className="display-4 text-primary">5</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h4 className="card-title">Bestellungen</h4>
                <p className="display-4 text-success">12</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h4 className="card-title">Lieferungen</h4>
                <p className="display-4 text-warning">8</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h4 className="card-title">Neue Kunden</h4>
                <p className="display-4 text-info">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System-Informationen</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p><strong>Benutzer:</strong> {session?.display_name || session?.user_name}</p>
                <p><strong>Firma:</strong> {session?.company}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Sprache:</strong> {session?.language_id}</p>
                <p><strong>Menü-Einträge:</strong> {session?.menu?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default Dashboard;