import React, { useEffect, useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { apiGet } from '../../shared/api/apiClient';
import MainMenu from './MainMenu';
import type { MenuItem } from './MainMenu';
import BaseLayout from '../../components/layout/BaseLayout';

const Dashboard: React.FC = () => {
  const { session } = useSession();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Nur laden wenn Session vorhanden ist
    if (!session) {
      console.log('⏳ Dashboard wartet auf Session...');
      setIsLoading(true);
      return;
    }
    
    console.log('📊 Session vorhanden, lade Dashboard...');
    loadDashboard();
  }, [session]); // Abhängigkeit: session

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('📊 Lade Dashboard mit /dashboard?function=init');
      
      const params = new URLSearchParams({ function: 'init' });
      const data = await apiGet('/dashboard', params);

      console.log('✅ Dashboard-Daten geladen:', data);

      // Menü-Daten korrekt extrahieren
      // API gibt zurück: {menu: {menuItems: Array}}
      if (data.menu && data.menu.menuItems && Array.isArray(data.menu.menuItems)) {
        setMenuItems(data.menu.menuItems);
        console.log('📋 Menü geladen:', data.menu.menuItems.length, 'Items');
      } else {
        console.warn('⚠️ Keine Menü-Daten in der Antwort gefunden');
        setMenuItems([]);
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
      footerCenter="© 2024 AnalytikData PRIME GmbH"
      showUserInfo={true}
      showLogout={true}
    >
      {/* Menü anzeigen */}
      {menuItems.length > 0 && <MainMenu menuItems={menuItems} />}

      {/* Content-Bereich */}
      <div className="mt-6">
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Dashboard wird geladen...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Willkommens-Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white mb-6">
              <h2 className="text-2xl font-bold mb-2">
                Willkommen, {session?.display_name}!
              </h2>
              <p className="text-blue-100">
                Firma: {session?.company} | Sprache: {session?.language_id}
              </p>
            </div>

            {/* Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Aufgaben Widget */}
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Offene Aufgaben</h3>
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                    5
                  </span>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Rechnungen prüfen
                  </li>
                  <li className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    Bestellungen freigeben
                  </li>
                  <li className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Liefertermine bestätigen
                  </li>
                </ul>
              </div>

              {/* Statistik Widget */}
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Heute</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Neue Bestellungen</span>
                    <span className="text-2xl font-bold text-blue-600">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Offene Lieferungen</span>
                    <span className="text-2xl font-bold text-orange-600">8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Neue Kunden</span>
                    <span className="text-2xl font-bold text-green-600">3</span>
                  </div>
                </div>
              </div>

              {/* Schnellzugriff Widget */}
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Schnellzugriff</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 text-sm font-medium transition-colors">
                    Neue Bestellung
                  </button>
                  <button className="p-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 text-sm font-medium transition-colors">
                    Rechnung erstellen
                  </button>
                  <button className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 text-sm font-medium transition-colors">
                    Artikel suchen
                  </button>
                  <button className="p-3 bg-orange-50 hover:bg-orange-100 rounded-lg text-orange-600 text-sm font-medium transition-colors">
                    Bericht drucken
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System-Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Menü-Einträge:</span>
                  <span className="ml-2 font-medium text-gray-800">{menuItems.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Session-Token:</span>
                  <span className="ml-2 font-mono text-xs text-gray-800">
                    {session?.session_token ? '✓ Aktiv' : '✗ Nicht vorhanden'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default Dashboard;
