import React, { useState } from 'react';
import { Save, Trash2, Plus, Printer } from 'lucide-react';

// Simuliert die komplexe Adressmaske aus dem Screenshot
const AdressverwaltungModule: React.FC = () => {
  const [activeDataTab, setActiveDataTab] = useState('info');

  // Die 9 Tabs aus dem Screenshot
  const dataTabs = [
    { id: 'info', label: 'Info(1)', badge: 1 },
    { id: 'ansprech', label: 'Ansprech(2)', badge: 2 },
    { id: 'adresse', label: 'Adresse(3)', badge: 3 },
    { id: 'kontakt', label: 'Kontakt(4)', badge: 4 },
    { id: 'debitor', label: 'Debitor(5)', badge: 5 },
    { id: 'lieferant', label: 'Lieferant(6)', badge: 6 },
    { id: 'auftraege', label: 'Aufträge(7)', badge: 7 },
    { id: 'history', label: 'History/DF(8)', badge: 8 },
    { id: 'aktivitaet', label: 'Aktivität(9)', badge: 9 }
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: '#f3f4f6'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button className="btn btn-sm btn-primary">
          <Save size={16} className="mr-1" />
          Speichern
        </button>
        <button className="btn btn-sm btn-danger">
          <Trash2 size={16} className="mr-1" />
          Löschen
        </button>
        <button className="btn btn-sm btn-success">
          <Plus size={16} className="mr-1" />
          Neu
        </button>
        <button className="btn btn-sm btn-secondary">
          <Printer size={16} className="mr-1" />
          Drucken
        </button>
      </div>

      {/* Datensatz-Kopfzeile */}
      <div style={{
        padding: '0.75rem',
        backgroundColor: 'white',
        borderBottom: '2px solid #3b82f6',
        fontWeight: 'bold'
      }}>
        000001 | Oswald Jürg, Casa Gronda, Ilanz
      </div>

      {/* Daten-Tabs (Info, Ansprech, Adresse, etc.) */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: '#e5e7eb',
        padding: '0.5rem 0.5rem 0',
        overflowX: 'auto'
      }}>
        {dataTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDataTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeDataTab === tab.id ? 'white' : '#f3f4f6',
              border: '1px solid #d1d5db',
              borderBottom: activeDataTab === tab.id ? '1px solid white' : '1px solid #d1d5db',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              fontWeight: activeDataTab === tab.id ? '600' : '400',
              fontSize: '0.875rem',
              position: 'relative',
              top: activeDataTab === tab.id ? '1px' : '0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Bereich */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        padding: '1rem',
        overflow: 'auto'
      }}>
        {activeDataTab === 'info' && (
          <div className="row">
            <div className="col-md-6">
              <h3 className="text-lg font-bold mb-4">Stammdaten</h3>
              
              <div className="form-group mb-3">
                <label className="form-label">Vertreter</label>
                <select className="form-control">
                  <option>Martin Oswald (10)</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Kundennr.</label>
                <input type="text" className="form-control" value="Oswald Jürg (10)" readOnly />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Preisgruppe</label>
                <select className="form-control">
                  <option>Grosshandel (85)</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Bonusgruppe</label>
                <select className="form-control">
                  <option>Privatpersonen (10)</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Rabattgruppe</label>
                <select className="form-control">
                  <option>Privatpersonen (10)</option>
                </select>
              </div>
            </div>

            <div className="col-md-6">
              <h3 className="text-lg font-bold mb-4">Weitere Einstellungen</h3>
              
              <div className="card">
                <div className="card-body">
                  <div className="form-check mb-2">
                    <input type="checkbox" className="form-check-input" id="gebuehrVerrechnen" />
                    <label className="form-check-label" htmlFor="gebuehrVerrechnen">
                      Gebinde verrechnen
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input type="checkbox" className="form-check-input" id="fassanKunde" />
                    <label className="form-check-label" htmlFor="fassanKunde">
                      Fassan/Ladenkunde
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold mb-2">Rabatte/Zuschläge</h4>
                <div className="row g-2">
                  <div className="col-4">
                    <label className="form-label text-xs">Abhol</label>
                    <input type="text" className="form-control form-control-sm text-end" value="0.00" />
                  </div>
                  <div className="col-4">
                    <label className="form-label text-xs">Auftrag</label>
                    <input type="text" className="form-control form-control-sm text-end" value="0.00" />
                  </div>
                  <div className="col-4">
                    <label className="form-label text-xs">Zeilen</label>
                    <input type="text" className="form-control form-control-sm text-end" value="0.00" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDataTab === 'ansprech' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Ansprechpartner</h3>
            <p className="text-muted">Ansprechpartner-Verwaltung...</p>
          </div>
        )}

        {activeDataTab === 'adresse' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Adressdaten</h3>
            <div className="form-group mb-3">
              <label className="form-label">Rechnungsadresse</label>
              <input type="text" className="form-control" placeholder="Strasse, PLZ, Ort" />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Lieferadresse</label>
              <input type="text" className="form-control" placeholder="Strasse, PLZ, Ort" />
            </div>
          </div>
        )}

        {/* Weitere Tabs würden hier folgen */}
        {!['info', 'ansprech', 'adresse'].includes(activeDataTab) && (
          <div>
            <h3 className="text-lg font-bold mb-4">{dataTabs.find(t => t.id === activeDataTab)?.label}</h3>
            <p className="text-muted">Inhalt für diesen Tab wird hier angezeigt...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdressverwaltungModule;
