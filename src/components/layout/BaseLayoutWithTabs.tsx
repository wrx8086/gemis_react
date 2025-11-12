import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import type { MenuItem } from '../../contexts/SessionContext';
import logoImage from '../../assets/images/title_left.png';
import TabManager, { Tab } from '../tabs/TabManager';

interface BaseLayoutWithTabsProps {
  children: React.ReactNode;
  title: string;
  showUserInfo?: boolean;
  showLogout?: boolean;
  showNavigation?: boolean;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
}

const BaseLayoutWithTabs: React.FC<BaseLayoutWithTabsProps> = ({
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
  const [tabManagerRef, setTabManagerRef] = useState<any>(null);

  const menuItems = session?.menu || [];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleNavigation = (menuLink: string, menuText: string) => {
    if (menuLink && tabManagerRef) {
      const path = menuLink.startsWith('/') ? menuLink : `/${menuLink}`;
      
      // Tab-Content für diese Route
      const tabContent = (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">{menuText}</h2>
          <p>Modul wird geladen: {path}</p>
          {/* Hier würde das eigentliche Modul geladen werden */}
        </div>
      );

      // Neuen Tab öffnen
      tabManagerRef.addTab({
        id: path,
        title: menuText,
        component: tabContent,
        closeable: true
      });
      
      setOpenDropdown(null);
    }
  };

  const toggleDropdown = (menuId: string) => {
    setOpenDropdown(openDropdown === menuId ? null : menuId);
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
            {item.menu_text}
            <span className="nav-chevron">▼</span>
          </button>
          {isOpen && (
            <div className="nav-dropdown">
              {item.children?.map((child: MenuItem) => {
                const childHasChildren = child.children && child.children.length > 0;
                const childIsClickable = child.menu_link && child.menu_link.trim() !== '';
                
                if (childHasChildren) {
                  return (
                    <React.Fragment key={child.menu_id}>
                      {childIsClickable && (
                        <button
                          className="nav-dropdown-item nav-dropdown-item-clickable"
                          onClick={() => handleNavigation(child.menu_link!, child.menu_text)}
                        >
                          {child.menu_text}
                        </button>
                      )}
                      {child.children?.map((subChild: MenuItem) => {
                        const subChildIsClickable = subChild.menu_link && subChild.menu_link.trim() !== '';
                        return (
                          <button
                            key={subChild.menu_id}
                            className={`nav-dropdown-item ${
                              subChildIsClickable ? 'nav-dropdown-item-clickable' : ''
                            }`}
                            onClick={() => subChildIsClickable && handleNavigation(subChild.menu_link!, subChild.menu_text)}
                          >
                            {subChild.menu_text}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                } else {
                  return (
                    <button
                      key={child.menu_id}
                      className={`nav-dropdown-item ${
                        childIsClickable ? 'nav-dropdown-item-clickable' : ''
                      }`}
                      onClick={() => childIsClickable && handleNavigation(child.menu_link!, child.menu_text)}
                    >
                      {child.menu_text}
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
          onClick={() => isClickable && handleNavigation(item.menu_link!, item.menu_text)}
        >
          {item.menu_text}
        </button>
      </div>
    );
  };

  return (
    <div className="layout-wrapper">
      {/* Header */}
      <header className="layout-header">
        <div className="header-container">
          <div className="header-logo">
            <img src={logoImage} alt="GeMIS Logo" />
          </div>
          
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

      {/* Navigation */}
      {showNavigation && menuItems.length > 0 && (
        <nav className="layout-navigation">
          <div className="nav-container">
            {menuItems.map((item: MenuItem) => renderMenuItem(item))}
          </div>
        </nav>
      )}

      {/* Tab Manager - Ersetzt den normalen Content Bereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TabManager
          ref={(ref) => setTabManagerRef(ref)}
          initialTabs={[
            {
              id: 'dashboard',
              title: 'Dashboard',
              component: children,
              closeable: false
            }
          ]}
        />
      </div>

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

export default BaseLayoutWithTabs;
