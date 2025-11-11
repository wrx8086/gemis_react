import React, { useEffect, useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import type { MenuItem } from '../../contexts/SessionContext';
import { apiGet } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';

// Backend Menu Item (flach mit levels)
interface BackendMenuItem {
  level1: number;
  level2: number;
  level3: number;
  menu_title: string;
  menu_link: string;
}

/**
 * Transformiert flaches Backend-Menu in hierarchische Struktur
 * Backend: [{level1: 10, level2: 0, level3: 0, menu_title: "Stammdaten", ...}]
 * Frontend: [{menu_id: "10", menu_text: "Stammdaten", children: [...]}]
 */
const transformMenuData = (backendItems: BackendMenuItem[]): MenuItem[] => {
  const result: MenuItem[] = [];
  
  // Gruppiere nach level1
  const level1Map = new Map<number, BackendMenuItem[]>();
  backendItems.forEach(item => {
    if (!level1Map.has(item.level1)) {
      level1Map.set(item.level1, []);
    }
    level1Map.get(item.level1)!.push(item);
  });
  
  // Baue Hierarchie auf
  level1Map.forEach((items, level1Key) => {
    // Finde Level 1 Haupteintrag (level2=0, level3=0)
    const level1Item = items.find(i => i.level2 === 0 && i.level3 === 0);
    if (!level1Item) return;
    
    const mainItem: MenuItem = {
      menu_id: String(level1Key),
      menu_text: level1Item.menu_title,
      menu_link: level1Item.menu_link 
        ? (level1Item.menu_link.startsWith('/') ? level1Item.menu_link : `/${level1Item.menu_link}`)
        : undefined,
      children: []
    };
    
    // Gruppiere Level 2 Items
    const level2Map = new Map<number, BackendMenuItem[]>();
    items
      .filter(i => i.level2 > 0)
      .forEach(item => {
        if (!level2Map.has(item.level2)) {
          level2Map.set(item.level2, []);
        }
        level2Map.get(item.level2)!.push(item);
      });
    
    // Baue Level 2 auf
    level2Map.forEach((level2Items, level2Key) => {
      // Finde Level 2 Eintrag (level3=0)
      const level2Item = level2Items.find(i => i.level3 === 0);
      if (!level2Item) return;
      
      const subItem: MenuItem = {
        menu_id: `${level1Key}-${level2Key}`,
        menu_text: level2Item.menu_title,
        menu_link: level2Item.menu_link 
          ? (level2Item.menu_link.startsWith('/') ? level2Item.menu_link : `/${level2Item.menu_link}`)
          : undefined,
        children: []
      };
      
      // Füge Level 3 Items hinzu
      level2Items
        .filter(i => i.level3 > 0)
        .forEach(level3Item => {
          const link = level3Item.menu_link 
            ? (level3Item.menu_link.startsWith('/') ? level3Item.menu_link : `/${level3Item.menu_link}`)
            : undefined;
          
          subItem.children!.push({
            menu_id: `${level1Key}-${level2Key}-${level3Item.level3}`,
            menu_text: level3Item.menu_title,
            menu_link: link
          });
        });
      
      mainItem.children!.push(subItem);
    });
    
    result.push(mainItem);
  });
  
  return result;
};

const Dashboard: React.FC = () => {
  const { session, setSession } = useSession();
  const [stats, setStats] = useState({
    openTasks: 5,
    newOrders: 12,
    openDeliveries: 8,
    newCustomers: 3
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Nur laden wenn Session vorhanden ist
    if (!session) {
      console.log('⏳ Dashboard wartet auf Session...');
      setIsLoading(true);
      return;
    }

    // Menu nur laden wenn noch nicht vorhanden (verhindert Infinite Loop!)
    if (!session.menu || session.menu.length === 0) {
      console.log('📊 Session vorhanden, lade Dashboard...');
      loadDashboard();
    } else {
      console.log('✅ Menu bereits geladen');
      setIsLoading(false);
    }
  }, [session?.session_token]); // Nur bei Token-Änderung, nicht bei jedem session Update!

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('📊 Lade Dashboard mit /dashboard?function=init');

      const params = new URLSearchParams({ function: 'init' });
      const data = await apiGet('/dashboard', params);

      console.log('✅ Dashboard-Daten geladen:', data);

      // Statistiken aus API-Response laden falls vorhanden
      if (data.stats) {
        setStats(data.stats);
      }

      // Menü-Daten laden und transformieren
      if (data.menu && data.menu.menuItems && Array.isArray(data.menu.menuItems)) {
        console.log('📋 Menü geladen:', data.menu.menuItems.length, 'Items (Backend-Format)');
        
        // Transformiere flaches Backend-Format in hierarchische Struktur
        const transformedMenu = transformMenuData(data.menu.menuItems);
        console.log('🔄 Menu transformiert:', transformedMenu.length, 'Haupteinträge');
        console.log('🔄 Hierarchisches Menu:', JSON.stringify(transformedMenu, null, 2));
        
        // Menu in SessionContext speichern damit BaseLayout es anzeigen kann
        if (session) {
          setSession({
            ...session,
            menu: transformedMenu
          });
          console.log('💾 Menu in Session gespeichert');
        }
      } else if (Array.isArray(data) && data.length > 0 && data[0].menu_id) {
        // Backend liefert bereits hierarchisches Format direkt als Array!
        console.log('📋 Menü bereits hierarchisch:', data.length, 'Haupteinträge');
        
        // Rekursive Funktion um menu_link zu fixen
        const fixMenuLinks = (item: any): any => {
          const fixedItem = { ...item };
          
          // Füge führenden Slash hinzu wenn nicht vorhanden
          if (fixedItem.menu_link && !fixedItem.menu_link.startsWith('/')) {
            fixedItem.menu_link = `/${fixedItem.menu_link}`;
          }
          
          // Fixe auch Children rekursiv
          if (fixedItem.children && Array.isArray(fixedItem.children)) {
            fixedItem.children = fixedItem.children.map(fixMenuLinks);
          }
          
          return fixedItem;
        };
        
        const fixedMenu = data.map(fixMenuLinks);
        
        // Menu direkt in SessionContext speichern
        if (session) {
          setSession({
            ...session,
            menu: fixedMenu as MenuItem[]
          });
          console.log('💾 Menu in Session gespeichert');
        }
      } else {
        console.warn('⚠️ Keine Menü-Daten in der Antwort gefunden');
        console.log('Response:', data);
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden des Dashboards:', err);
      setError('Fehler beim Laden des Dashboards');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseLayout
      title="GeMIS Dashboard"
      showUserInfo={true}
      showLogout={true}
      showNavigation={true}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Dashboard wird geladen...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && (
        <>
          {/* Willkommens-Banner */}
          <div className="dashboard-welcome-banner">
            <h2 className="dashboard-welcome-title">
              Willkommen, {session?.display_name}!
            </h2>
            <p className="dashboard-welcome-subtitle">
              Firma: {session?.company} | Sprache: {session?.language_id}
            </p>
          </div>

          {/* Dashboard Widgets */}
          <div className="dashboard-widgets-grid">
            {/* Aufgaben Widget */}
            <div className="dashboard-widget">
              <div className="dashboard-widget-header">
                <h3 className="dashboard-widget-title">Offene Aufgaben</h3>
                <span className="badge badge-danger">{stats.openTasks}</span>
              </div>
              <ul className="dashboard-task-list">
                <li className="dashboard-task-item">
                  <span className="dashboard-task-dot dashboard-task-dot-red"></span>
                  Rechnungen prüfen
                </li>
                <li className="dashboard-task-item">
                  <span className="dashboard-task-dot dashboard-task-dot-yellow"></span>
                  Bestellungen freigeben
                </li>
                <li className="dashboard-task-item">
                  <span className="dashboard-task-dot dashboard-task-dot-blue"></span>
                  Liefertermine bestätigen
                </li>
              </ul>
            </div>

            {/* Statistik Widget */}
            <div className="dashboard-widget">
              <h3 className="dashboard-widget-title">Heute</h3>
              <div className="dashboard-stats-list">
                <div className="dashboard-stat-item">
                  <span className="dashboard-stat-label">Neue Bestellungen</span>
                  <span className="dashboard-stat-value dashboard-stat-value-blue">{stats.newOrders}</span>
                </div>
                <div className="dashboard-stat-item">
                  <span className="dashboard-stat-label">Offene Lieferungen</span>
                  <span className="dashboard-stat-value dashboard-stat-value-orange">{stats.openDeliveries}</span>
                </div>
                <div className="dashboard-stat-item">
                  <span className="dashboard-stat-label">Neue Kunden</span>
                  <span className="dashboard-stat-value dashboard-stat-value-green">{stats.newCustomers}</span>
                </div>
              </div>
            </div>

            {/* Schnellzugriff Widget */}
            <div className="dashboard-widget">
              <h3 className="dashboard-widget-title">Schnellzugriff</h3>
              <div className="dashboard-quick-actions">
                <button className="dashboard-quick-btn dashboard-quick-btn-blue">
                  Neue Bestellung
                </button>
                <button className="dashboard-quick-btn dashboard-quick-btn-green">
                  Rechnung erstellen
                </button>
                <button className="dashboard-quick-btn dashboard-quick-btn-purple">
                  Artikel suchen
                </button>
                <button className="dashboard-quick-btn dashboard-quick-btn-orange">
                  Bericht drucken
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="card dashboard-system-card">
            <div className="card-header">
              <h3 className="card-title">System-Informationen</h3>
            </div>
            <div className="card-body">
              <div className="dashboard-system-info">
                <div className="dashboard-info-item">
                  <span className="dashboard-info-label">Menü-Einträge:</span>
                  <span className="dashboard-info-value">{session?.menu?.length || 0}</span>
                </div>
                <div className="dashboard-info-item">
                  <span className="dashboard-info-label">Session-Token:</span>
                  <span className="dashboard-info-value-mono">
                    {session?.session_token ? '✓ Aktiv' : '✗ Nicht vorhanden'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </BaseLayout>
  );
};

export default Dashboard;