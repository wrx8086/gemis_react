import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Save, GripVertical } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';

interface Company {
  company: string;
  company_name: string;
  selected?: boolean;
}

interface User {
  user_name: string;
  display_name: string;
}

interface Language {
  language_id: number;
  language_name: string;
}

interface MenuItem {
  menu_id: number;
  menu_text: string;
  menu_link: string;
  level1: number;
  level2: number;
  level3: number;
  children?: MenuItem[];
  isExpanded?: boolean;
  isEditing?: boolean;
}

interface EditingItem {
  menu_id: number;
  menu_text: string;
  menu_link: string;
}

const MenuDesigner: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await apiGet('/menudesigner?function=init');

        // Wenn Backend keine companies/users/languages liefert, nutze Mock-Daten
        const hasInitData = data.companies && data.users && data.languages;
        
        if (!hasInitData) {
          const mockCompanies = [
            { company: '1000', company_name: 'Oswald Getränke AG', selected: true },
            { company: '2000', company_name: 'Garage California GmbH', selected: false }
          ];
          const mockUsers = [
            { user_name: 'wari', display_name: 'Walter Riechsteiner' },
            { user_name: 'Admin', display_name: 'administrator' }
          ];
          const mockLanguages = [
            { language_id: 1, language_name: 'Deutsch' },
            { language_id: 2, language_name: 'Französisch' },
            { language_id: 3, language_name: 'Italienisch' },
            { language_id: 4, language_name: 'Englisch' }
          ];

          setCompanies(mockCompanies);
          setUsers(mockUsers);
          setLanguages(mockLanguages);
          setSelectedCompany(mockCompanies[0].company);
          setSelectedUser(mockUsers[0].user_name);
          setSelectedLanguage(String(mockLanguages[0].language_id));
          return;
        }

        setCompanies(data.companies || []);
        setUsers(data.users || []);
        setLanguages(data.languages || []);

        // Wähle vorselektierte Company oder erste aus
        if (data.companies && data.companies.length > 0) {
          const selectedCompany = data.companies.find((c: Company) => c.selected);
          const companyToSelect = selectedCompany ? selectedCompany.company : data.companies[0].company;
          setSelectedCompany(companyToSelect);
        }
        if (data.users && data.users.length > 0) {
          setSelectedUser(data.users[0].user_name);
        }
        if (data.languages && data.languages.length > 0) {
          setSelectedLanguage(String(data.languages[0].language_id));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Initial-Daten:', error);
        const mockCompanies = [
          { company: '1000', company_name: 'Oswald Getränke AG', selected: true },
          { company: '2000', company_name: 'Garage California GmbH', selected: false }
        ];
        const mockUsers = [
          { user_name: 'wari', display_name: 'Walter Riechsteiner' },
          { user_name: 'Admin', display_name: 'administrator' }
        ];
        const mockLanguages = [
          { language_id: 1, language_name: 'Deutsch' },
          { language_id: 2, language_name: 'Französisch' }
        ];

        setCompanies(mockCompanies);
        setUsers(mockUsers);
        setLanguages(mockLanguages);

        setSelectedCompany(mockCompanies[0].company);
        setSelectedUser(mockUsers[0].user_name);
        setSelectedLanguage(String(mockLanguages[0].language_id));
      }
    };

    loadInitialData();
  }, []);

  const loadMenuConfiguration = async () => {
    if (!selectedCompany || !selectedUser || !selectedLanguage) {
      alert('Bitte alle Filter-Felder ausfüllen');
      return;
    }

    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        user_name: selectedUser,
        language_id: selectedLanguage
      });

      const data = await apiGet(`/menudesigner/load?${params}`);
      setMenuItems(data.menuItems || []);
      setIsLoaded(true);
      alert('Menükonfiguration geladen!');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      alert('Fehler beim Laden der Menükonfiguration');
    }
  };

  const saveMenuConfiguration = async () => {
    if (!isLoaded) {
      alert('Bitte zuerst eine Konfiguration laden');
      return;
    }

    const config = {
      company: selectedCompany,
      user_name: selectedUser,
      language_id: selectedLanguage,
      menuItems: flattenMenuItems(menuItems)
    };

    try {
      const result = await apiPost('/menudesigner/save', config);
      console.log('Gespeicherte Menükonfiguration:', result);
      alert('Menükonfiguration erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Menükonfiguration');
    }
  };

  const flattenMenuItems = (items: MenuItem[], result: any[] = []): any[] => {
    items.forEach(item => {
      result.push({
        menu_id: item.menu_id,
        menu_text: item.menu_text,
        menu_link: item.menu_link,
        level1: item.level1,
        level2: item.level2,
        level3: item.level3
      });
      if (item.children && item.children.length > 0) {
        flattenMenuItems(item.children, result);
      }
    });
    return result;
  };

  const getNextLevelNumber = (items: MenuItem[], level: 'level1' | 'level2' | 'level3'): number => {
    if (items.length === 0) {
      return level === 'level1' ? 100 : 10;
    }
    const maxNum = Math.max(...items.map(item => item[level]));
    return level === 'level1' ? maxNum + 100 : maxNum + 10;
  };

  const toggleExpand = (itemId: number, items: MenuItem[] = menuItems): MenuItem[] => {
    return items.map(item => {
      if (item.menu_id === itemId) {
        return { ...item, isExpanded: !item.isExpanded };
      }
      if (item.children) {
        return { ...item, children: toggleExpand(itemId, item.children) };
      }
      return item;
    });
  };

  const handleToggleExpand = (itemId: number) => {
    setMenuItems(toggleExpand(itemId));
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem({
      menu_id: item.menu_id,
      menu_text: item.menu_text,
      menu_link: item.menu_link
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  const saveEdit = () => {
    if (!editingItem) return;

    const updateItem = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.menu_id === editingItem.menu_id) {
          return {
            ...item,
            menu_text: editingItem.menu_text,
            menu_link: editingItem.menu_link
          };
        }
        if (item.children) {
          return { ...item, children: updateItem(item.children) };
        }
        return item;
      });
    };

    setMenuItems(updateItem(menuItems));
    setEditingItem(null);
  };

  const addMenuItem = (parentId: number | null = null) => {
    const newId = Date.now();

    if (parentId === null) {
      const newItem: MenuItem = {
        menu_id: newId,
        menu_text: 'Neuer Menüpunkt',
        menu_link: '/new-link',
        level1: getNextLevelNumber(menuItems, 'level1'),
        level2: 0,
        level3: 0,
        children: [],
        isExpanded: true
      };
      setMenuItems([...menuItems, newItem]);
    } else {
      const addToParent = (items: MenuItem[]): MenuItem[] => {
        return items.map(item => {
          if (item.menu_id === parentId) {
            const children = item.children || [];
            const newItem: MenuItem = {
              menu_id: newId,
              menu_text: 'Neuer Unterpunkt',
              menu_link: '/new-sublink',
              level1: item.level1,
              level2: item.level2 === 0 ? getNextLevelNumber(children, 'level2') : item.level2,
              level3: item.level2 !== 0 ? getNextLevelNumber(children, 'level3') : 0,
              children: []
            };
            return {
              ...item,
              children: [...children, newItem],
              isExpanded: true
            };
          }
          if (item.children) {
            return { ...item, children: addToParent(item.children) };
          }
          return item;
        });
      };

      setMenuItems(addToParent(menuItems));
    }
  };

  const deleteMenuItem = (itemId: number) => {
    if (!confirm('Möchten Sie diesen Menüpunkt wirklich löschen?')) return;

    const deleteFromItems = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        if (item.menu_id === itemId) return false;
        if (item.children) {
          item.children = deleteFromItems(item.children);
        }
        return true;
      });
    };

    setMenuItems(deleteFromItems(menuItems));
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const isEditing = editingItem?.menu_id === item.menu_id;
    const hasChildren = item.children && item.children.length > 0;
    const indent = depth * 24;

    return (
      <div key={item.menu_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.75rem 1rem',
            paddingLeft: `${indent + 16}px`,
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <button
            onClick={() => handleToggleExpand(item.menu_id)}
            style={{ 
              marginRight: '0.5rem', 
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: hasChildren ? 'pointer' : 'default',
              padding: '0.25rem'
            }}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              item.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <span style={{ display: 'inline-block', width: '1rem', height: '1rem' }} />
            )}
          </button>

          <GripVertical style={{ width: '1rem', height: '1rem', color: '#9ca3af', marginRight: '0.5rem', cursor: 'move' }} />

          <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.75rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}>
              L1:{item.level1}
            </span>
            {item.level2 > 0 && (
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}>
                L2:{item.level2}
              </span>
            )}
            {item.level3 > 0 && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}>
                L3:{item.level3}
              </span>
            )}
          </div>

          {isEditing ? (
            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={editingItem.menu_text}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, menu_text: e.target.value })
                }
                className="input-field"
                placeholder="Menütext"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={editingItem.menu_link}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, menu_link: e.target.value })
                }
                className="input-field"
                placeholder="Link"
                style={{ flex: 1 }}
              />
              <button
                onClick={saveEdit}
                className="btn btn-success btn-sm"
              >
                Speichern
              </button>
              <button
                onClick={cancelEdit}
                className="btn btn-secondary btn-sm"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#1f2937' }}>{item.menu_text}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.menu_link}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => addMenuItem(item.menu_id)}
                  className="btn-icon"
                  title="Unterpunkt hinzufügen"
                  style={{ color: '#2563eb', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startEdit(item)}
                  className="btn-icon"
                  title="Bearbeiten"
                  style={{ color: '#16a34a', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMenuItem(item.menu_id)}
                  className="btn-icon"
                  title="Löschen"
                  style={{ color: '#dc2626', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {hasChildren && item.isExpanded && (
          <div>
            {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseLayout title="Menu Designer">
      <div className="page-container">
        <div className="card">
          <div className="card-header">
            <h2>Konfiguration laden</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Firma</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {companies.map((c) => (
                    <option key={c.company} value={c.company}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label">Benutzer</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {users.map((u) => (
                    <option key={u.user_name} value={u.user_name}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label">Sprache</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {languages.map((l) => (
                    <option key={l.language_id} value={String(l.language_id)}>
                      {l.language_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={loadMenuConfiguration}
                  className="btn btn-primary"
                >
                  Menü laden
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoaded && (
          <>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Menü-Struktur</h2>
                <button
                  onClick={() => addMenuItem(null)}
                  className="btn btn-success"
                >
                  <Plus className="w-4 h-4" style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Hauptmenüpunkt hinzufügen
                </button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {menuItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                    Keine Menüpunkte vorhanden. Klicken Sie auf "Hauptmenüpunkt
                    hinzufügen" um zu starten.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                    {menuItems.map((item) => renderMenuItem(item))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <button
                  onClick={saveMenuConfiguration}
                  className="btn btn-success"
                >
                  <Save className="w-4 h-4" style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Menükonfiguration speichern
                </button>
              </div>
            </div>

            <div className="info-box" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1rem' }}>
              <h3 style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
                💡 Level-Nummerierung
              </h3>
              <ul style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.75' }}>
                <li>
                  <strong>Level 1:</strong> Hauptmenüpunkte (100, 200, 300, ...)
                </li>
                <li>
                  <strong>Level 2:</strong> Erste Unterebene (10, 20, 30, ...)
                </li>
                <li>
                  <strong>Level 3:</strong> Zweite Unterebene (10, 20, 30, ...)
                </li>
                <li style={{ marginTop: '0.5rem' }}>
                  Die Nummern werden automatisch berechnet und dienen zur
                  Sortierung im Backend.
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default MenuDesigner;