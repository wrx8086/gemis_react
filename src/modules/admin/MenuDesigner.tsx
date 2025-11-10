import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Save, Download } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSession } from '../../contexts/SessionContext';
import './MenuDesigner.css';

interface MenuItem {
  level1: number;
  level2: number;
  level3: number;
  menutext: string;
  menulink: string;
  uniqueId?: string;
  source?: string;
}

interface MenuItemEdit extends MenuItem {
  isNew?: boolean;
  originallevel1?: number;
  originallevel2?: number;
  originallevel3?: number;
}

const MenuDesigner: React.FC = () => {
  const { session } = useSession();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemEdit | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Customer, User und Language States (für später wenn benötigt)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  // ⭐ WICHTIG: Beim Component Mount automatisch mit function=init laden
  useEffect(() => {
    if (session) {
      loadMenuData();
    }
  }, [session]);

  // Lade Menu-Daten mit function=init
  const loadMenuData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📋 Lade MenuDesigner mit function=init...');
      
      // Query mit function=init wie im Dashboard
      const params = new URLSearchParams({ function: 'init' });
      const response = await apiGet('/menudesigner', params);
      
      console.log('MenuDesigner Response:', response);
      
      // Extrahiere Menü-Daten aus verschiedenen möglichen Response-Strukturen
      let items = [];
      
      if (response.menuItems && Array.isArray(response.menuItems)) {
        items = response.menuItems;
      } else if (response.menu?.webmenu && Array.isArray(response.menu.webmenu)) {
        items = response.menu.webmenu;
      } else if (response.webmenu && Array.isArray(response.webmenu)) {
        items = response.webmenu;
      } else if (Array.isArray(response)) {
        items = response;
      }
      
      // Füge uniqueId hinzu falls nicht vorhanden
      const itemsWithIds = items.map((item: any, index: number) => ({
        ...item,
        uniqueId: item.uniqueId || `item_${index}_${Date.now()}`
      }));
      
      setMenuItems(itemsWithIds);
      
      // Extrahiere Customer, User, Language falls vorhanden
      if (response.customer_id) setSelectedCustomer(String(response.customer_id));
      if (response.user_id) setSelectedUser(String(response.user_id));
      if (response.language_id) setSelectedLanguage(String(response.language_id));
      
    } catch (err) {
      console.error('❌ Fehler beim Laden der Menü-Daten:', err);
      setError('Fehler beim Laden der Menü-Daten');
    } finally {
      setIsLoading(false);
    }
  };

  // Speichere die gesamte Konfiguration
  const saveConfiguration = async () => {
    try {
      setError(null);
      
      const config = {
        customer_id: selectedCustomer || session?.company,
        user_id: selectedUser || session?.user_name,
        language_id: selectedLanguage || session?.language_id,
        menuItems: menuItems
      };
      
      const response = await apiPost('/menudesigner/save', config);
      
      if (response.success) {
        alert('✅ Menü-Konfiguration erfolgreich gespeichert!');
        await loadMenuData(); // Neu laden nach dem Speichern
      } else {
        throw new Error(response.message || 'Speichern fehlgeschlagen');
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError('Fehler beim Speichern der Konfiguration');
    }
  };

  // Exportiere Konfiguration als JSON
  const exportConfiguration = () => {
    const config = {
      customer_id: selectedCustomer || session?.company,
      user_id: selectedUser || session?.user_name,
      language_id: selectedLanguage || session?.language_id,
      menuItems: menuItems,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `menu-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Bearbeite ein Menü-Item
  const handleEdit = (item: MenuItem) => {
    setEditingItem({
      ...item,
      isNew: false,
      originallevel1: item.level1,
      originallevel2: item.level2,
      originallevel3: item.level3
    });
  };

  // Erstelle ein neues Menü-Item
  const handleNew = () => {
    setEditingItem({
      level1: 0,
      level2: 0,
      level3: 0,
      menutext: '',
      menulink: '',
      isNew: true,
      uniqueId: `new_${Date.now()}`
    });
  };

  // Speichere das bearbeitete Item
  const handleSaveItem = () => {
    if (!editingItem) return;
    
    if (!editingItem.menutext.trim()) {
      alert('Bitte geben Sie einen Menü-Text ein');
      return;
    }
    
    if (editingItem.isNew) {
      // Füge neues Item hinzu - entferne die Edit-spezifischen Eigenschaften
      const newItem: MenuItem = {
        level1: editingItem.level1,
        level2: editingItem.level2,
        level3: editingItem.level3,
        menutext: editingItem.menutext,
        menulink: editingItem.menulink,
        uniqueId: editingItem.uniqueId,
        source: editingItem.source
      };
      setMenuItems([...menuItems, newItem]);
    } else {
      // Update bestehendes Item - entferne die Edit-spezifischen Eigenschaften
      setMenuItems(menuItems.map(item => 
        item.uniqueId === editingItem.uniqueId
          ? {
              level1: editingItem.level1,
              level2: editingItem.level2,
              level3: editingItem.level3,
              menutext: editingItem.menutext,
              menulink: editingItem.menulink,
              uniqueId: editingItem.uniqueId,
              source: editingItem.source
            }
          : item
      ));
    }
    
    setEditingItem(null);
  };

  // Lösche ein Menü-Item
  const handleDelete = (itemToDelete: MenuItem) => {
    if (!confirm(`Möchten Sie den Menü-Eintrag "${itemToDelete.menutext}" wirklich löschen?`)) {
      return;
    }
    
    setMenuItems(menuItems.filter(item => item.uniqueId !== itemToDelete.uniqueId));
  };

  // Toggle Gruppe auf/zu
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Erstelle hierarchische Menü-Struktur
  const menuStructure = useMemo(() => {
    const structure: any[] = [];
    
    // Level 1 Items
    const level1Items = menuItems.filter(item => item.level1 > 0 && item.level2 === 0 && item.level3 === 0);
    
    level1Items.forEach(l1 => {
      const l1Structure: any = {
        item: l1,
        children: []
      };
      
      // Level 2 Items für dieses Level 1
      const level2Items = menuItems.filter(item => 
        item.level1 === l1.level1 && item.level2 > 0 && item.level3 === 0
      );
      
      level2Items.forEach(l2 => {
        const l2Structure: any = {
          item: l2,
          children: []
        };
        
        // Level 3 Items für dieses Level 2
        const level3Items = menuItems.filter(item => 
          item.level1 === l1.level1 && item.level2 === l2.level2 && item.level3 > 0
        );
        
        l2Structure.children = level3Items.map(l3 => ({ item: l3 }));
        l1Structure.children.push(l2Structure);
      });
      
      structure.push(l1Structure);
    });
    
    return structure;
  }, [menuItems]);

  const getLevelBadge = (item: MenuItem) => {
    if (item.level3 > 0) return <span className="badge badge-tertiary">Level 3</span>;
    if (item.level2 > 0) return <span className="badge badge-secondary">Level 2</span>;
    return <span className="badge badge-primary">Level 1</span>;
  };

  return (
    <BaseLayout
      title="Menu Designer"
      showUserInfo={true}
      showLogout={true}
    >
      <div className="container-app">
        {/* Toolbar */}
        <div className="card mb-4">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menü-Verwaltung</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleNew}
                  className="btn btn-primary btn-sm"
                  disabled={!!editingItem}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Neuer Eintrag
                </button>
                <button
                  onClick={saveConfiguration}
                  className="btn btn-success btn-sm"
                  disabled={!!editingItem}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Speichern
                </button>
                <button
                  onClick={exportConfiguration}
                  className="btn btn-secondary btn-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportieren
                </button>
                <button
                  onClick={loadMenuData}
                  className="btn btn-secondary btn-sm"
                >
                  🔄 Aktualisieren
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div className="alert-error mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center p-8">
            <div className="spinner"></div>
          </div>
        )}

        {/* Edit Form */}
        {editingItem && (
          <div className="card mb-4 border-2 border-blue-500">
            <div className="card-header bg-blue-50">
              <h3 className="text-lg font-semibold">
                {editingItem.isNew ? '🆕 Neuer Menü-Eintrag' : '✏️ Menü-Eintrag bearbeiten'}
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">level 1</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingItem.level1}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      level1: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max="999"
                  />
                </div>
                <div>
                  <label className="label">level 2</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingItem.level2}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      level2: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max="999"
                  />
                </div>
                <div>
                  <label className="label">level 3</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingItem.level3}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      level3: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max="999"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Menü-Text</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingItem.menutext}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      menutext: e.target.value
                    })}
                    placeholder="z.B. Verwaltung"
                  />
                </div>
                <div>
                  <label className="label">Menü-Link</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingItem.menulink}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      menulink: e.target.value
                    })}
                    placeholder="z.B. admin oder leer"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveItem} className="btn btn-success">
                  💾 Übernehmen
                </button>
                <button onClick={() => setEditingItem(null)} className="btn btn-secondary">
                  ❌ Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hierarchische Menü-Darstellung */}
        {!isLoading && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Menü-Struktur (Hierarchisch)</h3>
            </div>
            <div className="p-4">
              {menuStructure.map((level1, idx) => {
                const isExpanded = expandedGroups.has(`l1_${idx}`);
                return (
                  <div key={`l1_${idx}`} className="mb-2">
                    {/* Level 1 */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded">
                      <button
                        onClick={() => toggleGroup(`l1_${idx}`)}
                        className="p-1"
                        disabled={level1.children.length === 0}
                      >
                        {level1.children.length > 0 ? (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                      </button>
                      <span className="font-medium flex-1">{level1.item.menutext}</span>
                      {level1.item.menulink && (
                        <code className="text-xs bg-blue-100 px-2 py-1 rounded">{level1.item.menulink}</code>
                      )}
                      {getLevelBadge(level1.item)}
                      <button
                        onClick={() => handleEdit(level1.item)}
                        className="btn btn-primary btn-sm"
                        disabled={!!editingItem}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(level1.item)}
                        className="btn btn-danger btn-sm"
                        disabled={!!editingItem}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Level 2 */}
                    {isExpanded && level1.children.map((level2: any, idx2: number) => {
                      const isL2Expanded = expandedGroups.has(`l2_${idx}_${idx2}`);
                      return (
                        <div key={`l2_${idx}_${idx2}`} className="ml-8 mt-1">
                          <div className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded">
                            <button
                              onClick={() => toggleGroup(`l2_${idx}_${idx2}`)}
                              className="p-1"
                              disabled={level2.children.length === 0}
                            >
                              {level2.children.length > 0 ? (
                                isL2Expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                              ) : (
                                <span className="w-4 h-4 inline-block" />
                              )}
                            </button>
                            <span className="flex-1">{level2.item.menutext}</span>
                            {level2.item.menulink && (
                              <code className="text-xs bg-blue-100 px-2 py-1 rounded">{level2.item.menulink}</code>
                            )}
                            {getLevelBadge(level2.item)}
                            <button
                              onClick={() => handleEdit(level2.item)}
                              className="btn btn-primary btn-sm"
                              disabled={!!editingItem}
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(level2.item)}
                              className="btn btn-danger btn-sm"
                              disabled={!!editingItem}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Level 3 */}
                          {isL2Expanded && level2.children.map((level3: any, idx3: number) => (
                            <div key={`l3_${idx}_${idx2}_${idx3}`} className="ml-8 mt-1">
                              <div className="flex items-center gap-2 p-2 bg-green-50 hover:bg-green-100 rounded">
                                <span className="w-4 h-4 inline-block" />
                                <span className="flex-1">{level3.item.menutext}</span>
                                {level3.item.menulink && (
                                  <code className="text-xs bg-green-100 px-2 py-1 rounded">{level3.item.menulink}</code>
                                )}
                                {getLevelBadge(level3.item)}
                                <button
                                  onClick={() => handleEdit(level3.item)}
                                  className="btn btn-primary btn-sm"
                                  disabled={!!editingItem}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(level3.item)}
                                  className="btn btn-danger btn-sm"
                                  disabled={!!editingItem}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              {menuStructure.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Keine Menü-Einträge vorhanden
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabellen-Ansicht */}
        <div className="card mt-4">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Menü-Liste (Tabellarisch)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">level 1</th>
                  <th className="px-4 py-2 text-left">level 2</th>
                  <th className="px-4 py-2 text-left">level 3</th>
                  <th className="px-4 py-2 text-left">Menü-Text</th>
                  <th className="px-4 py-2 text-left">Menü-Link</th>
                  <th className="px-4 py-2 text-center">Level</th>
                  <th className="px-4 py-2 text-center">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item, index) => (
                  <tr key={item.uniqueId || index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{item.level1}</td>
                    <td className="px-4 py-2">{item.level2}</td>
                    <td className="px-4 py-2">{item.level3}</td>
                    <td className="px-4 py-2 font-medium">{item.menutext}</td>
                    <td className="px-4 py-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {item.menulink || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {getLevelBadge(item)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(item)}
                          className="btn btn-primary btn-sm"
                          disabled={!!editingItem}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="btn btn-danger btn-sm"
                          disabled={!!editingItem}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="card mt-4">
          <div className="p-4 bg-blue-50">
            <h4 className="font-semibold mb-2">ℹ️ Hinweise zur Menü-Struktur:</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>level 1:</strong> Hauptmenü-Punkte (oberste Ebene)</li>
              <li>• <strong>level 2:</strong> Untermenü-Punkte (Dropdown)</li>
              <li>• <strong>level 3:</strong> Unter-Untermenü-Punkte</li>
              <li>• <strong>Link:</strong> Route/URL die beim Klick aufgerufen wird</li>
              <li>• <strong>Automatisches Laden:</strong> Beim Öffnen wird automatisch ?function=init aufgerufen</li>
              <li>• <strong>Session-Daten:</strong> Customer: {session?.company}, User: {session?.user_name}, Language: {session?.language_id}</li>
            </ul>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default MenuDesigner;
