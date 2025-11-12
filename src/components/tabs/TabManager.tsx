import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

// Tab Interface
interface Tab {
  id: string;
  title: string;
  component: React.ReactNode;
  closeable?: boolean;
}

interface TabManagerProps {
  initialTabs?: Tab[];
}

const TabManager: React.FC<TabManagerProps> = ({ initialTabs = [] }) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(
    initialTabs.length > 0 ? initialTabs[0].id : ''
  );

  // Neuen Tab hinzufügen
  const addTab = (tab: Tab) => {
    // Prüfen ob Tab bereits existiert
    const existingTab = tabs.find(t => t.id === tab.id);
    if (existingTab) {
      setActiveTabId(tab.id);
      return;
    }

    setTabs([...tabs, tab]);
    setActiveTabId(tab.id);
  };

  // Tab schließen
  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    
    setTabs(newTabs);

    // Wenn aktiver Tab geschlossen wird, wechsle zum nächsten
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.max(0, tabIndex - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  // Aktiven Tab finden
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f9fafb'
    }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: '#e5e7eb',
        padding: '0.5rem 0.5rem 0',
        borderBottom: '1px solid #d1d5db',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: activeTabId === tab.id ? 'white' : '#f3f4f6',
              border: '1px solid #d1d5db',
              borderBottom: activeTabId === tab.id ? '1px solid white' : '1px solid #d1d5db',
              borderRadius: '0.375rem 0.375rem 0 0',
              cursor: 'pointer',
              minWidth: '150px',
              maxWidth: '250px',
              position: 'relative',
              top: activeTabId === tab.id ? '1px' : '0',
              fontWeight: activeTabId === tab.id ? '600' : '400',
              color: activeTabId === tab.id ? '#1f2937' : '#6b7280'
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem'
            }}>
              {tab.title}
            </span>
            {tab.closeable !== false && (
              <button
                onClick={(e) => closeTab(tab.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '0.25rem',
                  color: '#6b7280'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.color = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        
        {/* Neuer Tab Button */}
        <button
          onClick={() => {
            const newTabId = `tab-${Date.now()}`;
            addTab({
              id: newTabId,
              title: 'Neuer Tab',
              component: <div className="p-4">Neuer Tab Inhalt</div>
            });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '0.375rem',
            color: '#6b7280'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        overflow: 'auto'
      }}>
        {activeTab ? activeTab.component : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af'
          }}>
            Keine Tabs geöffnet
          </div>
        )}
      </div>
    </div>
  );
};

export default TabManager;
export type { Tab };
