import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import type { MenuItem } from '../../contexts/SessionContext';
import logoImage from '../../assets/images/title_left.png';

interface BaseLayoutProps {
  children: React.ReactNode;
  title: string;
  showUserInfo?: boolean;
  showLogout?: boolean;
  showNavigation?: boolean;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  title,
  showUserInfo = false,
  showLogout = true,
  showNavigation = true,
  footerLeft = '',
  footerCenter = '© 2025 AnalytikData PRIME GmbH',
  footerRight = ''
}) => {
  const navigate = useNavigate();
  const { session, clearSession } = useSession();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const menuItems = session?.menu || [];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleNavigation = (item: MenuItem) => {
    if (!item.menu_link) return;

    const path = item.menu_link.startsWith('/') ? item.menu_link : `/${item.menu_link}`;
    const fullPath = path.includes('?') ? path : `${path}?function=init`;

    const mode = item.openMode || 'simple';

    switch (mode) {
      case 'simple':
        // Normale Navigation im gleichen Tab
        navigate(fullPath);
        break;

      case 'new':
        // Neuer Browser-Tab ohne Tab-System
        window.open(fullPath, '_blank');
        break;

      case 'complex':
        // Neuer Browser-Tab mit Tab-System
        window.open(`${fullPath}&mode=complex`, '_blank');
        break;
    }

    setOpenDropdown(null);
  };

  const toggleDropdown = (menuId: string) => {
    setOpenDropdown(openDropdown === menuId ? null : menuId);
  };

  const getOpenModeIcon = (mode?: string): string => {
    switch (mode) {
      case 'new': return ' ↗';
      case 'complex': return ' ⚡';
      default: return '';
    }
  };

  const renderMenuItem = (item: MenuItem): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isClickable = item.menu_link && item.menu_link.trim() !== '';
    const isOpen = openDropdown === item.menu_id;

    if (hasChildren) {
      return (
        <div key={item.menu_id} className="nav-item">
          <button
            className="nav-link"
            onClick={() => toggleDropdown(item.menu_id)}
          >
            {item.menu_text}{getOpenModeIcon(item.openMode)}
            <span className="nav-chevron">▼</span>
          </button>
          {isOpen && (
            <div className="nav-dropdown">
              {item.children?.map((child: MenuItem) => {
                const childHasChildren = child.children && child.children.length > 0;
                
                if (childHasChildren) {
                  // Level 2 mit Level 3 Children
                  return (
                    <div key={child.menu_id}>
                      <div className="nav-dropdown-header">
                        {child.menu_text}
                      </div>
                      {child.children?.map((subChild: MenuItem) => (
                        <button
                          key={subChild.menu_id}
                          className={`nav-dropdown-item ${
                            subChild.menu_link ? 'nav-dropdown-item-clickable' : ''
                          }`}
                          onClick={() => subChild.menu_link && handleNavigation(subChild)}
                          style={{ paddingLeft: '2rem' }}
                        >
                          {subChild.menu_text}{getOpenModeIcon(subChild.openMode)}
                        </button>
                      ))}
                    </div>
                  );
                } else {
                  // Level 2 ohne Children
                  return (
                    <button
                      key={child.menu_id}
                      className={`nav-dropdown-item ${
                        child.menu_link ? 'nav-dropdown-item-clickable' : ''
                      }`}
                      onClick={() => child.menu_link && handleNavigation(child)}
                    >
                      {child.menu_text}{getOpenModeIcon(child.openMode)}
                    </button>
                  );
                }
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.menu_id} className="nav-item">
        <button
          className={`nav-link ${isClickable ? 'nav-link-clickable' : ''}`}
          onClick={() => isClickable && handleNavigation(item)}
        >
          {item.menu_text}{getOpenModeIcon(item.openMode)}
        </button>
      </div>
    );
  };

  return (
    <div className="layout-wrapper">
      {/* Header */}
      <header className="layout-header">
        <div className="header-container">
          <button 
            className="header-logo" 
            onClick={() => navigate('/dashboard')}
            type="button"
            aria-label="Zurück zum Dashboard"
          >
            <img src={logoImage} alt="GeMIS Logo" />
            {/* <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>GeMIS</span> */}
          </button>
          
          <div className="header-title-wrapper">
            <h1 className="header-title">{title}</h1>
          </div>
          
          <div className="header-actions">
            {showUserInfo && session && (
              <div className="header-user-info">
                <span className="header-user-name">
                  {session.display_name || session.user_name}
                </span>
                {session.company && (
                  <span className="header-company">{session.company}</span>
                )}
              </div>
            )}
            {showLogout && (
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Abmelden
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation - Separate Zeile unter Header */}
      {showNavigation && menuItems.length > 0 && (
        <nav className="layout-navigation">
          <div className="nav-container">
            {menuItems.map((item: MenuItem) => renderMenuItem(item))}
          </div>
        </nav>
      )}
      
      {/* Debug: Zeige an wenn Menu fehlt */}
      {showNavigation && menuItems.length === 0 && (
        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderBottom: '1px solid #ffc107' }}>
          ⚠️ Navigation aktiviert, aber keine Menü-Einträge gefunden. Menu muss in session.menu gespeichert sein.
        </div>
      )}

      {/* Content */}
      <main className="layout-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-left">{footerLeft}</div>
            <div className="footer-center">{footerCenter}</div>
            <div className="footer-right">{footerRight}</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BaseLayout;