import React, { useState, useEffect } from 'react';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

interface BaseLayoutProps {
  title: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
  children: React.ReactNode;
  showUserInfo?: boolean;
  showLogout?: boolean;
  showNavigation?: boolean;
}

/**
 * BaseLayout - Standard-Seite mit Header und Footer
 * 
 * Header: Icon Links | Title | Icon Rechts
 * Content: {children}
 * Footer: 3-teilig (Links | Mitte | Rechts)
 */
const BaseLayout: React.FC<BaseLayoutProps> = ({
  title,
  footerLeft = '',
  footerCenter = '',
  footerRight = '',
  children,
  showUserInfo = false,
  showLogout = false,
  showNavigation = false
}) => {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Debug: Zeige Session-Status
  useEffect(() => {
    console.log('🔍 BaseLayout Session:', {
      hasSession: !!session,
      hasMenu: !!session?.menu,
      menuLength: session?.menu?.length,
      showNavigation: showNavigation
    });
    if (session?.menu) {
      console.log('🔍 Menu Items:', session.menu);
    }
  }, [session, showNavigation]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleNavigate = (menuLink?: string) => {
    if (menuLink) {
      // Stelle sicher dass Link mit / beginnt
      let path = menuLink.startsWith('/') ? menuLink : `/${menuLink}`;
      
      // Füge function=init hinzu wenn nicht vorhanden
      if (!path.includes('?')) {
        path += '?function=init';
      }
      
      navigate(path);
      setOpenMenu(null);
    }
  };

  return (
    <div className="layout-wrapper">
      {/* Header */}
      <header className="layout-header">
        <div className="header-container">
          {/* Logo Links */}
          <div 
            className="header-logo" 
            onClick={() => navigate('/dashboard')}
            title="Zur Startseite"
          >
            <img 
              src="../src/assets/images/title_left.png" 
              alt="AnalytikData PRIME GmbH" 
            />
          </div>

          {/* Title Mitte */}
          <div className="header-title-wrapper">
            <h1 className="header-title">{title}</h1>
          </div>

          {/* User Info & Actions Rechts */}
          <div className="header-actions">
            {showUserInfo && session && (
              <div className="header-user-info">
                <User className="icon-sm" />
                <span className="header-user-name">{session.display_name}</span>
                <span>|</span>
                <span className="header-company">Mandant: {session.company}</span>
              </div>
            )}
            
            {showLogout && (
              <button
                onClick={handleLogout}
                className="header-logout-btn"
                title="Abmelden"
              >
                <LogOut className="icon-sm" />
                Abmelden
              </button>
            )}
            
            {!showLogout && (
              <User className="icon-md icon-primary" />
            )}
          </div>
        </div>
      </header>

      {/* Navigation Menu */}
      {showNavigation && session?.menu && session.menu.length > 0 && (
        <nav className="layout-navigation">
          <div className="nav-container">
            {session.menu.map((mainItem, mainIndex) => {
              const hasChildren = mainItem.children && mainItem.children.length > 0;
              
              return (
                <div 
                  key={`main-${mainItem.menu_id}-${mainIndex}`}
                  className="nav-item"
                  onMouseEnter={() => setOpenMenu(mainItem.menu_id)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button 
                    className={`nav-link ${!hasChildren && mainItem.menu_link ? 'nav-link-clickable' : ''}`}
                    onClick={() => {
                      // Nur navigieren wenn keine Kinder vorhanden sind
                      if (!hasChildren) {
                        handleNavigate(mainItem.menu_link);
                      }
                    }}
                  >
                    {mainItem.menu_text}
                    {hasChildren && (
                      <ChevronDown className="nav-chevron" />
                    )}
                  </button>
                  
                  {hasChildren && openMenu === mainItem.menu_id && (
                    <div className="nav-dropdown">
                      {mainItem.children!.map((subItem, subIndex) => (
                        <div key={`sub-${subItem.menu_id}-${subIndex}`}>
                          {subItem.children && subItem.children.length > 0 ? (
                            <>
                              <div className="nav-dropdown-header">
                                {subItem.menu_text}
                              </div>
                              {subItem.children.map((subSubItem, subSubIndex) => (
                                <button
                                  key={`subsub-${subSubItem.menu_id}-${subSubIndex}`}
                                  onClick={() => handleNavigate(subSubItem.menu_link)}
                                  className={`nav-dropdown-item ${subSubItem.menu_link ? 'nav-dropdown-item-clickable' : ''}`}
                                >
                                  {subSubItem.menu_text}
                                </button>
                              ))}
                            </>
                          ) : (
                            <button
                              onClick={() => handleNavigate(subItem.menu_link)}
                              className={`nav-dropdown-item ${subItem.menu_link ? 'nav-dropdown-item-clickable' : ''}`}
                            >
                              {subItem.menu_text}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="layout-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-left">
              {footerLeft}
            </div>
            <div className="footer-center">
              {footerCenter}
            </div>
            <div className="footer-right">
              {footerRight}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BaseLayout;