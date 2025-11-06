import React, { useState, useEffect, useMemo } from 'react';
import { GripVertical, Plus, Edit, Trash2, ChevronDown, ChevronRight, Save, Download } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import './MenuDesigner.css';

interface Customer {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

interface Language {
  id: number;
  text: string;
}

interface MenuItem {
  stufe1: number;
  stufe2: number;
  stufe3: number;
  menutext: string;
  menulink: string;
  uniqueId?: string;
  source?: string;
}

interface MenuItemEdit extends MenuItem {
  isNew?: boolean;
  originalStufe1?: number;
  originalStufe2?: number;
  originalStufe3?: number;
}

interface MenuStructureLevel3 {
  item: MenuItem;
}

interface MenuStructureLevel2 {
  item: MenuItem;
  children: MenuStructureLevel3[];
}

interface MenuStructureLevel1 {
  item: MenuItem;
  children: MenuStructureLevel2[];
}

const MenuDesigner: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItemEdit | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [previewSubOpen, setPreviewSubOpen] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const data = await apiGet('/initialData');

      setCustomers(data.customers || []);
      setUsers(data.users || []);
      setLanguages(data.languages || []);

      if (data.customers && data.customers.length > 0) {
        setSelectedCustomer(String(data.customers[0].id));
      }
      if (data.users && data.users.length > 0) {
        setSelectedUser(String(data.users[0].id));
      }
      if (data.languages && data.languages.length > 0) {
        setSelectedLanguage(String(data.languages[0].id));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Initial-Daten:', error);
      const mockCustomers = [
        { id: 1, name: 'Kunde A' },
        { id: 2, name: 'Kunde B' },
        { id: 3, name: 'Kunde C' }
      ];
      const mockUsers = [
        { id: 1, name: 'Max Mustermann' },
        { id: 2, name: 'Anna Schmidt' },
        { id: 3, name: 'Peter Weber' }
      ];
      const mockLanguages = [
        { id: 1, text: 'Deutsch' },
        { id: 2, text: 'English' },
        { id: 3, text: 'Français' }
      ];

      setCustomers(mockCustomers);
      setUsers(mockUsers);
      setLanguages(mockLanguages);

      setSelectedCustomer(String(mockCustomers[0].id));
      setSelectedUser(String(mockUsers[0].id));
      setSelectedLanguage(String(mockLanguages[0].id));
    }
  };

  const loadConfiguration = async () => {
    if (!selectedCustomer || !selectedUser || !selectedLanguage) {
      alert('Bitte alle Filter-Felder ausfüllen');
      return;
    }

    try {
      const params = new URLSearchParams({
        customer_id: selectedCustomer,
        user_id: selectedUser,
        language_id: selectedLanguage
      });

      const data = await apiGet('/menudesigner/config', params);
      setMenuItems(data.menuItems || []);
      setIsLoaded(true);
      alert('Konfiguration geladen!');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      alert('Fehler beim Laden der Konfiguration');
    }
  };

  const saveConfiguration = async () => {
    if (!isLoaded) {
      alert('Bitte zuerst eine Konfiguration laden');
      return;
    }

    const config = {
      customer_id: selectedCustomer,
      user_id: selectedUser,
      language_id: selectedLanguage,
      menuItems: menuItems
    };

    try {
      const result = await apiPost('/menudesigner/config', config);
      console.log('Gespeicherte Konfiguration:', result);
      alert('Konfiguration erfolgreich gespeichert!');
      
      // Neu laden nach erfolgreichem Speichern
      await loadConfiguration();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Konfiguration');
    }
  };

  const exportConfiguration = () => {
    const config = {
      customer_id: selectedCustomer,
      user_id: selectedUser,
      language_id: selectedLanguage,
      menuItems: menuItems
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'menu-config.json';
    link.click();
  };

  const buildMenuStructure = (items: MenuItem[]): MenuStructureLevel1[] => {
    const structure: MenuStructureLevel1[] = [];
    const level1Map = new Map<number, MenuStructureLevel1>();
    const level2Map = new Map<string, MenuStructureLevel2>();

    items.forEach(item => {
      if (item.stufe2 === 0 && item.stufe3 === 0) {
        const level1Item: MenuStructureLevel1 = {
          item,
          children: []
        };
        level1Map.set(item.stufe1, level1Item);
        structure.push(level1Item);
      }
    });

    items.forEach(item => {
      if (item.stufe2 > 0 && item.stufe3 === 0) {
        const parent = level1Map.get(item.stufe1);
        if (parent) {
          const level2Item: MenuStructureLevel2 = {
            item,
            children: []
          };
          level2Map.set(`${item.stufe1}-${item.stufe2}`, level2Item);
          parent.children.push(level2Item);
        }
      }
    });

    items.forEach(item => {
      if (item.stufe3 > 0) {
        const parent = level2Map.get(`${item.stufe1}-${item.stufe2}`);
        if (parent) {
          parent.children.push({ item });
        }
      }
    });

    structure.sort((a, b) => a.item.stufe1 - b.item.stufe1);
    structure.forEach(level1 => {
      level1.children.sort((a, b) => a.item.stufe2 - b.item.stufe2);
      level1.children.forEach(level2 => {
        level2.children.sort((a, b) => a.item.stufe3 - b.item.stufe3);
      });
    });

    return structure;
  };

  const menuStructure = useMemo(() => buildMenuStructure(menuItems), [menuItems]);

  const getNextNumber = (level: 1 | 2 | 3, parentStufe1?: number, parentStufe2?: number): number => {
    if (level === 1) {
      const maxStufe1 = Math.max(0, ...menuItems.map(m => m.stufe1));
      return maxStufe1 + 100;
    } else if (level === 2 && parentStufe1) {
      const maxStufe2 = Math.max(0, ...menuItems
        .filter(m => m.stufe1 === parentStufe1 && m.stufe2 > 0)
        .map(m => m.stufe2));
      return maxStufe2 + 10;
    } else if (level === 3 && parentStufe1 && parentStufe2) {
      const maxStufe3 = Math.max(0, ...menuItems
        .filter(m => m.stufe1 === parentStufe1 && m.stufe2 === parentStufe2 && m.stufe3 > 0)
        .map(m => m.stufe3));
      return maxStufe3 + 10;
    }
    return 10;
  };

  const handleAddNew = (parentStufe1?: number, parentStufe2?: number) => {
    let newItem: MenuItemEdit;

    if (!parentStufe1) {
      const nextStufe1 = getNextNumber(1);
      newItem = {
        stufe1: nextStufe1,
        stufe2: 0,
        stufe3: 0,
        menutext: '',
        menulink: '',
        isNew: true
      };
    } else if (parentStufe1 && !parentStufe2) {
      const nextStufe2 = getNextNumber(2, parentStufe1);
      newItem = {
        stufe1: parentStufe1,
        stufe2: nextStufe2,
        stufe3: 0,
        menutext: '',
        menulink: '',
        isNew: true
      };
    } else if (parentStufe1 && parentStufe2) {
      const nextStufe3 = getNextNumber(3, parentStufe1, parentStufe2);
      newItem = {
        stufe1: parentStufe1,
        stufe2: parentStufe2,
        stufe3: nextStufe3,
        menutext: '',
        menulink: '',
        isNew: true
      };
    } else {
      return;
    }

    setEditingItem(newItem);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem({
      ...item,
      isNew: false,
      originalStufe1: item.stufe1,
      originalStufe2: item.stufe2,
      originalStufe3: item.stufe3
    });
  };

  const handleDelete = (item: MenuItem) => {
    const hasChildren = menuItems.some(m =>
      (m.stufe1 === item.stufe1 && m.stufe2 > 0 && item.stufe2 === 0 && item.stufe3 === 0) ||
      (m.stufe1 === item.stufe1 && m.stufe2 === item.stufe2 && m.stufe3 > 0 && item.stufe3 === 0)
    );

    if (hasChildren) {
      if (!confirm('Dieser Eintrag hat Untereinträge. Möchten Sie ihn trotzdem löschen?\n\nDie Untereinträge bleiben erhalten, werden aber zu "verwaisten" Einträgen.')) {
        return;
      }
    }

    if (!confirm(`Menüeintrag "${item.menutext}" wirklich löschen?`)) {
      return;
    }

    const newMenuItems = menuItems.filter(m =>
      !(m.stufe1 === item.stufe1 && m.stufe2 === item.stufe2 && m.stufe3 === item.stufe3)
    );

    setMenuItems(newMenuItems);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (!editingItem.menutext.trim()) {
      alert('Menütext ist erforderlich!');
      return;
    }

    if (editingItem.stufe1 <= 0) {
      alert('Stufe 1 muss größer als 0 sein!');
      return;
    }

    if (editingItem.stufe2 > 0 && editingItem.stufe1 <= 0) {
      alert('Wenn Stufe 2 verwendet wird, muss auch Stufe 1 > 0 sein!');
      return;
    }

    if (editingItem.stufe3 > 0 && (editingItem.stufe1 <= 0 || editingItem.stufe2 <= 0)) {
      alert('Wenn Stufe 3 verwendet wird, müssen Stufe 1 und Stufe 2 > 0 sein!');
      return;
    }

    const hasNumberingChanged = !editingItem.isNew && (
      editingItem.stufe1 !== editingItem.originalStufe1 ||
      editingItem.stufe2 !== editingItem.originalStufe2 ||
      editingItem.stufe3 !== editingItem.originalStufe3
    );

    if (hasNumberingChanged) {
      if (!confirm('⚠️ ACHTUNG: Sie ändern die Stufen-Nummerierung!\n\nDies kann die Menüstruktur verändern. Möchten Sie fortfahren?')) {
        return;
      }
    }

    if (editingItem.isNew) {
      const exists = menuItems.some(m =>
        m.stufe1 === editingItem.stufe1 &&
        m.stufe2 === editingItem.stufe2 &&
        m.stufe3 === editingItem.stufe3
      );

      if (exists) {
        alert('Ein Menüeintrag mit dieser Nummerierung existiert bereits!');
        return;
      }

      const newItem: MenuItem = {
        stufe1: editingItem.stufe1,
        stufe2: editingItem.stufe2,
        stufe3: editingItem.stufe3,
        menutext: editingItem.menutext,
        menulink: editingItem.menulink
      };

      setMenuItems([...menuItems, newItem]);
    } else {
      const newMenuItems = menuItems.map(m => {
        if (
          m.stufe1 === editingItem.originalStufe1 &&
          m.stufe2 === editingItem.originalStufe2 &&
          m.stufe3 === editingItem.originalStufe3
        ) {
          return {
            stufe1: editingItem.stufe1,
            stufe2: editingItem.stufe2,
            stufe3: editingItem.stufe3,
            menutext: editingItem.menutext,
            menulink: editingItem.menulink
          };
        }
        return m;
      });

      setMenuItems(newMenuItems);
    }

    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  return (
    <div className="menu-designer-container">
      <div className="menu-designer-content">
        <h1 className="menu-designer-title">Menü Designer</h1>

        <div className="menu-filter-section">
          <h2 className="menu-section-title">Konfiguration laden</h2>

          <div className="menu-filter-grid">
            <div>
              <label className="menu-label">Kundeninstallation</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="menu-select"
              >
                <option value="">-- Auswählen --</option>
                {customers.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="menu-label">Benutzer</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="menu-select"
              >
                <option value="">-- Auswählen --</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="menu-label">Sprache</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="menu-select"
              >
                <option value="">-- Auswählen --</option>
                {languages.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.text}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={loadConfiguration} className="menu-btn-primary">
            Konfiguration laden
          </button>
        </div>

        {isLoaded && (
          <>
            <div className="menu-editor-section">
              <div className="menu-editor-header">
                <h2 className="menu-section-title">Menü-Struktur bearbeiten</h2>
                <button
                  onClick={() => handleAddNew()}
                  className="menu-btn-success"
                >
                  <Plus className="w-4 h-4" />
                  Neues Hauptmenü
                </button>
              </div>

              <div className="menu-tree-container">
                {menuStructure.length === 0 ? (
                  <div className="menu-empty-state">
                    Keine Menüeinträge vorhanden. Klicken Sie auf "Neues Hauptmenü" um zu beginnen.
                  </div>
                ) : (
                  menuStructure.map(level1 => (
                    <div key={`${level1.item.stufe1}-0-0`} className="menu-level1-container">
                      <div className="menu-item menu-item-level1">
                        <div className="menu-item-content">
                          <GripVertical className="menu-drag-icon" />
                          <div className="menu-item-info">
                            <div className="menu-item-text">
                              <span className="menu-item-badge menu-badge-level1">
                                {level1.item.stufe1}/0/0
                              </span>
                              <span className="menu-item-label">
                                {level1.item.menutext || <em className="menu-placeholder">Container (kein Text)</em>}
                              </span>
                            </div>
                            {level1.item.menulink && (
                              <div className="menu-item-link">→ {level1.item.menulink}</div>
                            )}
                          </div>
                        </div>
                        <div className="menu-item-actions">
                          <button
                            onClick={() => handleAddNew(level1.item.stufe1, 0)}
                            className="menu-btn-icon menu-btn-icon-add"
                            title="Untermenü hinzufügen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(level1.item)}
                            className="menu-btn-icon menu-btn-icon-edit"
                            title="Bearbeiten"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(level1.item)}
                            className="menu-btn-icon menu-btn-icon-delete"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {level1.children.length > 0 && (
                        <div className="menu-children-container">
                          {level1.children.map(level2 => (
                            <div key={`${level2.item.stufe1}-${level2.item.stufe2}-0`}>
                              <div className="menu-item menu-item-level2">
                                <div className="menu-item-content">
                                  <GripVertical className="menu-drag-icon" />
                                  <div className="menu-item-info">
                                    <div className="menu-item-text">
                                      <span className="menu-item-badge menu-badge-level2">
                                        {level2.item.stufe1}/{level2.item.stufe2}/0
                                      </span>
                                      <span className="menu-item-label">{level2.item.menutext}</span>
                                    </div>
                                    {level2.item.menulink && (
                                      <div className="menu-item-link">→ {level2.item.menulink}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="menu-item-actions">
                                  <button
                                    onClick={() => handleAddNew(level2.item.stufe1, level2.item.stufe2)}
                                    className="menu-btn-icon menu-btn-icon-add"
                                    title="Sub-Untermenü hinzufügen"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(level2.item)}
                                    className="menu-btn-icon menu-btn-icon-edit"
                                    title="Bearbeiten"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(level2.item)}
                                    className="menu-btn-icon menu-btn-icon-delete"
                                    title="Löschen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {level2.children.length > 0 && (
                                <div className="menu-children-container">
                                  {level2.children.map(level3 => (
                                    <div key={`${level3.item.stufe1}-${level3.item.stufe2}-${level3.item.stufe3}`} className="menu-item menu-item-level3">
                                      <div className="menu-item-content">
                                        <GripVertical className="menu-drag-icon" />
                                        <div className="menu-item-info">
                                          <div className="menu-item-text">
                                            <span className="menu-item-badge menu-badge-level3">
                                              {level3.item.stufe1}/{level3.item.stufe2}/{level3.item.stufe3}
                                            </span>
                                            <span className="menu-item-label">{level3.item.menutext}</span>
                                          </div>
                                          {level3.item.menulink && (
                                            <div className="menu-item-link">→ {level3.item.menulink}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="menu-item-actions">
                                        <button
                                          onClick={() => handleEdit(level3.item)}
                                          className="menu-btn-icon menu-btn-icon-edit"
                                          title="Bearbeiten"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(level3.item)}
                                          className="menu-btn-icon menu-btn-icon-delete"
                                          title="Löschen"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="menu-actions-section">
              <button onClick={saveConfiguration} className="menu-btn-success">
                <Save className="w-4 h-4" />
                Konfiguration speichern
              </button>
              <button onClick={exportConfiguration} className="menu-btn-secondary">
                <Download className="w-4 h-4" />
                Als JSON exportieren
              </button>
            </div>

            <div className="menu-preview-section">
              <h2 className="menu-section-title">Vorschau</h2>
              <div className="menu-preview-container">
                <nav className="menu-preview-nav">
                  <ul className="menu-preview-list">
                    {menuStructure.map(level1 => (
                      <li
                        key={`prev-${level1.item.stufe1}-0-0`}
                        className="menu-preview-item"
                        onMouseEnter={() => setPreviewOpen(`${level1.item.stufe1}`)}
                        onMouseLeave={() => {
                          setPreviewOpen(null);
                          setPreviewSubOpen(null);
                        }}
                      >
                        <a href="#" className="menu-preview-link">
                          {level1.item.menutext || 'Container'}
                          {level1.children.length > 0 && <ChevronDown className="w-4 h-4 ml-1" />}
                        </a>

                        {level1.children.length > 0 && previewOpen === `${level1.item.stufe1}` && (
                          <ul className="menu-preview-dropdown">
                            {level1.children.map(level2 => (
                              <li
                                key={`prev-${level2.item.stufe1}-${level2.item.stufe2}-0`}
                                className="menu-preview-dropdown-item"
                                onMouseEnter={() => setPreviewSubOpen(`${level2.item.stufe1}-${level2.item.stufe2}`)}
                              >
                                <a href="#" className="menu-preview-dropdown-link">
                                  {level2.item.menutext}
                                  {level2.children.length > 0 && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </a>

                                {level2.children.length > 0 && previewSubOpen === `${level2.item.stufe1}-${level2.item.stufe2}` && (
                                  <ul className="menu-preview-subdropdown">
                                    {level2.children.map(level3 => (
                                      <li key={`prev-${level3.item.stufe1}-${level3.item.stufe2}-${level3.item.stufe3}`}>
                                        <a href="#" className="menu-preview-subdropdown-link">
                                          {level3.item.menutext}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </>
        )}

        {editingItem && (
          <div className="menu-modal-overlay" onClick={handleCancelEdit}>
            <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
              <div className="menu-modal-header">
                <h3 className="menu-modal-title">
                  {editingItem.isNew ? 'Neuen Menüeintrag erstellen' : 'Menüeintrag bearbeiten'}
                </h3>
              </div>

              <div className="menu-modal-body">
                <div className="menu-form-row">
                  <div className="menu-form-group">
                    <label className="menu-label">Stufe 1 *</label>
                    <input
                      type="number"
                      value={editingItem.stufe1}
                      onChange={(e) => setEditingItem({ ...editingItem, stufe1: Number(e.target.value) })}
                      className="menu-input"
                      step="10"
                      min="1"
                    />
                  </div>
                  <div className="menu-form-group">
                    <label className="menu-label">Stufe 2</label>
                    <input
                      type="number"
                      value={editingItem.stufe2}
                      onChange={(e) => setEditingItem({ ...editingItem, stufe2: Number(e.target.value) })}
                      className="menu-input"
                      step="10"
                      min="0"
                    />
                  </div>
                  <div className="menu-form-group">
                    <label className="menu-label">Stufe 3</label>
                    <input
                      type="number"
                      value={editingItem.stufe3}
                      onChange={(e) => setEditingItem({ ...editingItem, stufe3: Number(e.target.value) })}
                      className="menu-input"
                      step="10"
                      min="0"
                    />
                  </div>
                </div>

                <div className="menu-form-group">
                  <label className="menu-label">Menütext *</label>
                  <input
                    type="text"
                    value={editingItem.menutext}
                    onChange={(e) => setEditingItem({ ...editingItem, menutext: e.target.value })}
                    className="menu-input"
                    placeholder="z.B. Stammdaten"
                    autoFocus
                  />
                </div>

                <div className="menu-form-group">
                  <label className="menu-label">Link (optional)</label>
                  <input
                    type="text"
                    value={editingItem.menulink}
                    onChange={(e) => setEditingItem({ ...editingItem, menulink: e.target.value })}
                    className="menu-input"
                    placeholder="z.B. /stammdaten oder leer für Container"
                  />
                  <div className="menu-hint">
                    Leer lassen wenn dieser Eintrag nur als Container für Untermenüs dient
                  </div>
                </div>
              </div>

              <div className="menu-modal-footer">
                <button onClick={handleCancelEdit} className="menu-btn-secondary">
                  Abbrechen
                </button>
                <button onClick={handleSaveEdit} className="menu-btn-primary">
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuDesigner;
