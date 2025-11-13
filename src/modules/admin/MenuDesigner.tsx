import React, { useState, useEffect, useMemo } from 'react';
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
  openMode?: 'simple' | 'new' | 'complex';
  admin?: boolean;
  children?: MenuItem[];
  isExpanded?: boolean;
  isEditing?: boolean;
}

interface EditingItem {
  menu_id: number;
  menu_text: string;
  menu_link: string;
  level1: number;
  level2: number;
  level3: number;
  openMode: 'simple' | 'new' | 'complex';
  admin: boolean;
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
  const [editingItemOriginalLevels, setEditingItemOriginalLevels] = useState<{ level1: number; level2: number; level3: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await apiGet('/menudesigner?function=init');

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

      const data = await apiGet(`/menudesigner?function=load&${params}`);
      
      const menuData = data.menuItems || [];
      
      if (menuData.length === 0) {
        setMenuItems([]);
        setIsLoaded(true);
        alert('Keine Menüeinträge vorhanden');
        return;
      }

      const firstItem = menuData[0];
      const isHierarchical = firstItem.hasOwnProperty('children');
      const hasLevelFields = firstItem.hasOwnProperty('level1');
      
      let processedItems: MenuItem[];
      
      if (isHierarchical && !hasLevelFields) {
        processedItems = addLevelNumbers(menuData);
      } else if (hasLevelFields && !isHierarchical) {
        processedItems = buildHierarchy(menuData);
      } else if (isHierarchical && hasLevelFields) {
        processedItems = menuData.map((item: any) => ({ ...item, isExpanded: false }));
      } else {
        processedItems = menuData;
      }
      
      setMenuItems(processedItems);
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

    const cleanForSave = (items: MenuItem[]): any[] => {
      return items.map(item => {
        const cleaned: any = {
          menu_id: item.menu_id,
          menu_text: item.menu_text,
          menu_link: item.menu_link,
          level1: item.level1,
          level2: item.level2,
          level3: item.level3,
          openMode: item.openMode || 'simple',
          admin: item.admin || false
        };

        if (item.children && item.children.length > 0) {
          cleaned.children = cleanForSave(item.children);
        }

        return cleaned;
      });
    };

    const config = {
      company: selectedCompany,
      user_name: selectedUser,
      language_id: selectedLanguage,
      menuItems: cleanForSave(menuItems)
    };

    try {
      await apiPost('/menudesigner?function=save', config);
      alert('Menükonfiguration erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Menükonfiguration');
    }
  };

  const buildHierarchy = (flatItems: any[]): MenuItem[] => {
    const itemsWithExpanded = flatItems.map(item => ({
      ...item,
      isExpanded: false,
      children: []
    }));

    const level1Items = itemsWithExpanded.filter(item => item.level2 === 0 && item.level3 === 0);
    
    level1Items.forEach(l1 => {
      const level2Items = itemsWithExpanded.filter(
        item => item.level1 === l1.level1 && item.level2 !== 0 && item.level3 === 0
      );
      
      level2Items.forEach(l2 => {
        const level3Items = itemsWithExpanded.filter(
          item => item.level1 === l1.level1 && item.level2 === l2.level2 && item.level3 !== 0
        );
        
        if (level3Items.length > 0) {
          l2.children = level3Items;
        }
      });
      
      if (level2Items.length > 0) {
        l1.children = level2Items;
      }
    });

    return level1Items;
  };

  const addLevelNumbers = (hierarchicalItems: any[], parentLevel1 = 0, parentLevel2 = 0): MenuItem[] => {
    return hierarchicalItems.map((item, index) => {
      let level1 = parentLevel1;
      let level2 = parentLevel2;
      let level3 = 0;

      if (parentLevel1 === 0 && parentLevel2 === 0) {
        level1 = (index + 1) * 100;
        level2 = 0;
        level3 = 0;
      } else if (parentLevel2 === 0) {
        level1 = parentLevel1;
        level2 = (index + 1) * 10;
        level3 = 0;
      } else {
        level1 = parentLevel1;
        level2 = parentLevel2;
        level3 = (index + 1) * 10;
      }

      const processedItem: MenuItem = {
        ...item,
        level1,
        level2,
        level3,
        isExpanded: false,
        children: item.children ? addLevelNumbers(item.children, level1, level2) : []
      };

      return processedItem;
    });
  };

  const addMenuItem = (parentLevel1: number | null, parentLevel2: number | null, parentLevel3: number | null) => {
    const newId = Date.now();
    let newLevel1 = 0;
    let newLevel2 = 0;
    let newLevel3 = 0;

    if (parentLevel1 === null) {
      const maxLevel1 = menuItems.length > 0 
        ? Math.max(...menuItems.map(item => item.level1))
        : 0;
      newLevel1 = maxLevel1 + 100;
    } else if (parentLevel2 === null || parentLevel2 === 0) {
      newLevel1 = parentLevel1;
      const parent = findMenuItem(menuItems, parentLevel1, 0, 0);
      const maxLevel2 = parent && parent.children && parent.children.length > 0
        ? Math.max(...parent.children.map(child => child.level2))
        : 0;
      newLevel2 = maxLevel2 + 10;
    } else if (parentLevel3 === null || parentLevel3 === 0) {
      newLevel1 = parentLevel1;
      newLevel2 = parentLevel2;
      const parent = findMenuItem(menuItems, parentLevel1, parentLevel2, 0);
      const maxLevel3 = parent && parent.children && parent.children.length > 0
        ? Math.max(...parent.children.map(child => child.level3))
        : 0;
      newLevel3 = maxLevel3 + 10;
    }

    const newItem: MenuItem = {
      menu_id: newId,
      menu_text: 'Neuer Menüpunkt',
      menu_link: '/new-link',
      level1: newLevel1,
      level2: newLevel2,
      level3: newLevel3,
      openMode: 'simple',
      admin: false,
      children: [],
      isExpanded: false
    };

    if (parentLevel1 === null) {
      setMenuItems([...menuItems, newItem]);
    } else {
      const addToParent = (items: MenuItem[]): MenuItem[] => {
        return items.map(item => {
          if (item.level1 === parentLevel1 && item.level2 === (parentLevel2 || 0) && item.level3 === 0) {
            return {
              ...item,
              children: [...(item.children || []), newItem],
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

  const findMenuItem = (items: MenuItem[], level1: number, level2: number, level3: number): MenuItem | null => {
    for (const item of items) {
      if (item.level1 === level1 && item.level2 === level2 && item.level3 === level3) {
        return item;
      }
      if (item.children) {
        const found = findMenuItem(item.children, level1, level2, level3);
        if (found) return found;
      }
    }
    return null;
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem({
      menu_id: item.menu_id,
      menu_text: item.menu_text,
      menu_link: item.menu_link,
      level1: item.level1,
      level2: item.level2,
      level3: item.level3,
      openMode: item.openMode || 'simple',
      admin: item.admin || false
    });
    setEditingItemOriginalLevels({
      level1: item.level1,
      level2: item.level2,
      level3: item.level3
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingItemOriginalLevels(null);
  };

  const saveEdit = () => {
    if (!editingItem || !editingItemOriginalLevels) return;

    const updateItem = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (
          item.level1 === editingItemOriginalLevels.level1 &&
          item.level2 === editingItemOriginalLevels.level2 &&
          item.level3 === editingItemOriginalLevels.level3
        ) {
          return {
            ...item,
            menu_text: editingItem.menu_text,
            menu_link: editingItem.menu_link,
            level1: editingItem.level1,
            level2: editingItem.level2,
            level3: editingItem.level3,
            openMode: editingItem.openMode,
            admin: editingItem.admin
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
    setEditingItemOriginalLevels(null);
  };

  const deleteMenuItem = (level1: number, level2: number, level3: number) => {
    if (!confirm('Menüpunkt wirklich löschen?')) return;

    const removeItem = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => !(item.level1 === level1 && item.level2 === level2 && item.level3 === level3))
        .map(item => ({
          ...item,
          children: item.children ? removeItem(item.children) : []
        }));
    };

    setMenuItems(removeItem(menuItems));
  };

  const toggleExpand = (level1: number, level2: number, level3: number) => {
    const toggleItem = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.level1 === level1 && item.level2 === level2 && item.level3 === level3) {
          return { ...item, isExpanded: !item.isExpanded };
        }
        if (item.children) {
          return { ...item, children: toggleItem(item.children) };
        }
        return item;
      });
    };

    setMenuItems(toggleItem(menuItems));
  };

  const renderMenuItem = useMemo(() => {
    return (item: MenuItem, depth: number = 0) => {
      const hasChildren = item.children && item.children.length > 0;
      const isEditing = editingItem?.menu_id === item.menu_id &&
                       editingItem?.level1 === item.level1 &&
                       editingItem?.level2 === item.level2 &&
                       editingItem?.level3 === item.level3;

      let levelClass = 'menu-item-level1';
      if (depth === 1) levelClass = 'menu-item-level2';
      if (depth === 2) levelClass = 'menu-item-level3';

      return (
        <div key={`${item.level1}-${item.level2}-${item.level3}`} className={levelClass}>
          <div className="menu-item-header">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(item.level1, item.level2, item.level3)}
                className="menu-item-expand-btn"
              >
                {item.isExpanded ? <ChevronDown className="icon-sm" /> : <ChevronRight className="icon-sm" />}
              </button>
            )}

            {!hasChildren && <div className="menu-item-spacer" />}

            <GripVertical className="icon-sm text-muted" />

            {isEditing ? (
              <div className="menu-item-edit-form">
                <input
                  type="text"
                  value={editingItem.menu_text}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      menu_text: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="Menütext"
                />
                <input
                  type="text"
                  value={editingItem.menu_link}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      menu_link: e.target.value
                    })
                  }
                  className="input-field"
                  placeholder="Link"
                />
                <select
                  value={editingItem.openMode}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      openMode: e.target.value as 'simple' | 'new' | 'complex'
                    })
                  }
                  className="input-field"
                >
                  <option value="simple">📄 Simple</option>
                  <option value="new">↗ New</option>
                  <option value="complex">⚡ Complex</option>
                </select>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingItem.admin}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        admin: e.target.checked
                      })
                    }
                  />
                  <span className="text-sm">🔒 Admin</span>
                </label>
                <button onClick={saveEdit} className="btn btn-success btn-sm">
                  Speichern
                </button>
                <button onClick={cancelEdit} className="btn btn-secondary btn-sm">
                  Abbrechen
                </button>
              </div>
            ) : (
              <>
                <div className="menu-item-content">
                  <div className="menu-item-title">{item.menu_text}</div>
                  <div className="menu-item-link">{item.menu_link}</div>
                </div>

                <div className="menu-item-badges">
                  {item.openMode === 'new' && (
                    <span className="badge badge-mode-new">↗ New</span>
                  )}
                  {item.openMode === 'complex' && (
                    <span className="badge badge-mode-complex">⚡ Complex</span>
                  )}
                  {item.admin && (
                    <span className="badge badge-admin">🔒 Admin</span>
                  )}
                </div>

                <div className="menu-item-actions">
                  {item.level3 === 0 && (
                    <button
                      onClick={() => addMenuItem(item.level1, item.level2, item.level3)}
                      className="btn-icon btn-icon-primary"
                      title="Unterpunkt hinzufügen"
                    >
                      <Plus className="icon-sm" />
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(item)}
                    className="btn-icon btn-icon-success"
                    title="Bearbeiten"
                  >
                    <Edit2 className="icon-sm" />
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.level1, item.level2, item.level3)}
                    className="btn-icon btn-icon-danger"
                    title="Löschen"
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                </div>
              </>
            )}
          </div>

          {hasChildren && item.isExpanded && (
            <div className="menu-item-children">
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };
  }, [menuItems, editingItem]);

  return (
    <BaseLayout title="Menu Designer" showNavigation={false}>
      <div className="page-container">
        <div className="card">
          <div className="card-header">
            <h2>Konfiguration laden</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label invisible">-</label>
                <button onClick={loadMenuConfiguration} className="btn btn-primary">
                  Menü laden
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoaded && (
          <>
            <div className="card">
              <div className="card-header card-header-with-actions">
                <h2>Menü-Struktur</h2>
                <button
                  onClick={() => addMenuItem(null, null, null)}
                  className="btn btn-success"
                >
                  <Plus className="icon-sm" />
                  Hauptmenüpunkt hinzufügen
                </button>
              </div>
              <div className="card-body p-0">
                {menuItems.length === 0 ? (
                  <div className="empty-state">
                    Keine Menüpunkte vorhanden. Klicken Sie auf "Hauptmenüpunkt hinzufügen" um zu starten.
                  </div>
                ) : (
                  <div className="menu-list">
                    {menuItems.map((item) => renderMenuItem(item, 0))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <button onClick={saveMenuConfiguration} className="btn btn-success">
                  <Save className="icon-sm" />
                  Menükonfiguration speichern
                </button>
              </div>
            </div>

            <div className="info-box">
              <h3 className="info-box-title">💡 Level-Nummerierung</h3>
              <ul className="info-list">
                <li><strong>Level 1:</strong> Hauptmenüpunkte (100, 200, 300, ...)</li>
                <li><strong>Level 2:</strong> Erste Unterebene (10, 20, 30, ...)</li>
                <li><strong>Level 3:</strong> Zweite Unterebene (10, 20, 30, ...)</li>
                <li>Die Nummern werden automatisch berechnet und dienen zur Sortierung im Backend.</li>
              </ul>
              <h3 className="info-box-title">🎯 OpenMode Varianten</h3>
              <ul className="info-list">
                <li><strong>📄 Simple:</strong> Öffnet im gleichen Tab (normale Navigation)</li>
                <li><strong>↗ New:</strong> Öffnet in neuem Browser-Tab (für Admin-Tools)</li>
                <li><strong>⚡ Complex:</strong> Öffnet in neuem Tab mit Tab-System (für Arbeitsmodule)</li>
              </ul>
              <h3 className="info-box-title">🔒 Admin-Flag</h3>
              <ul className="info-list">
                <li>Markiert Menüpunkte als "Nur für Admins"</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default MenuDesigner;