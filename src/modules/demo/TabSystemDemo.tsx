import React from 'react';
import TabManager from '../../components/tabs/TabManager';
import AdressverwaltungModule from '../../modules/adressverwaltung/AdressverwaltungModule';

// Weitere Modul-Beispiele
const FakturaModule: React.FC = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold mb-4">Fakturaarten</h2>
    
    {/* Tabelle oben */}
    <div className="card mb-4">
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Art</th>
            <th>Dokumentbezeichnung</th>
            <th>Dokumentart</th>
            <th>NA</th>
            <th>NS</th>
            <th>Art</th>
            <th>DM</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: '#e3f2fd' }}>
            <td>20</td>
            <td>LS ohne Preise/MF</td>
            <td>Lieferschein</td>
            <td>40</td>
            <td>02</td>
            <td>2</td>
            <td>1</td>
          </tr>
          <tr>
            <td>22</td>
            <td>LS ohne Preise/EF</td>
            <td>Lieferschein</td>
            <td>50</td>
            <td>02</td>
            <td>2</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Detail unten */}
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Details: Art 20</h3>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Dokumentbez.</label>
              <input type="text" className="form-control" value="LS ohne Preise/MF" />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Dokumentart</label>
              <select className="form-control">
                <option>Lieferschein (02)</option>
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Rüstpapier</label>
              <input type="text" className="form-control" value="00" />
            </div>
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="festabrechnung" />
              <label className="form-check-label" htmlFor="festabrechnung">
                Festabrechnung
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BenutzerModule: React.FC = () => (
  <div className="p-4">
    <h2 className="text-xl font-bold mb-4">Benutzerverwaltung</h2>
    
    <div className="card">
      <div className="card-body">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Benutzername</th>
              <th>Name</th>
              <th>Rolle</th>
              <th>Aktiv</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>admin</td>
              <td>Administrator</td>
              <td>Admin</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>2</td>
              <td>wriechsteiner</td>
              <td>Walter Riechsteiner</td>
              <td>Manager</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>3</td>
              <td>moswald</td>
              <td>Martin Oswald</td>
              <td>Verkauf</td>
              <td>✓</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Demo Component
const TabSystemDemo: React.FC = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Simulierter Header */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#2563eb',
        color: 'white',
        fontSize: '1.25rem',
        fontWeight: 'bold'
      }}>
        GeMIS - Tab-System Demo
      </div>

      {/* Tab Manager mit vorgeladenen Tabs */}
      <TabManager
        initialTabs={[
          {
            id: 'dashboard',
            title: 'Dashboard',
            component: (
              <div className="p-4">
                <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
                <div className="row">
                  <div className="col-md-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <h4>Aufgaben</h4>
                        <p className="display-4 text-primary">5</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <h4>Bestellungen</h4>
                        <p className="display-4 text-success">12</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <h4>Lieferungen</h4>
                        <p className="display-4 text-warning">8</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <h4>Neue Kunden</h4>
                        <p className="display-4 text-info">3</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
            closeable: false
          },
          {
            id: 'adressverwaltung-1',
            title: '1000/Adressverwaltung - Oswald Getränke',
            component: <AdressverwaltungModule />,
            closeable: true
          },
          {
            id: 'fakturaarten',
            title: '1000/Fakturaarten',
            component: <FakturaModule />,
            closeable: true
          },
          {
            id: 'benutzer',
            title: 'Benutzerverwaltung',
            component: <BenutzerModule />,
            closeable: true
          }
        ]}
      />

      {/* Simulierter Footer */}
      <div style={{
        padding: '0.75rem',
        backgroundColor: '#f3f4f6',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        © 2025 AnalytikData PRIME GmbH
      </div>
    </div>
  );
};

export default TabSystemDemo;
