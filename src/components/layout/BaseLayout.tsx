import React from 'react';
import { LogOut, User } from 'lucide-react';
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
  showLogout = false
}) => {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Icon Links - Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80" 
            onClick={() => navigate('/dashboard')}
            title="Zur Startseite"
          >
            <img 
              src="../src/assets/images/title_left.png" 
              alt="Logo" 
              className="h-8 w-auto"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800">
            {title}
          </h1>

          {/* Icon Rechts + User Info */}
          <div className="flex items-center gap-4">
            {showUserInfo && session && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{session.display_name}</span>
                <span className="text-gray-400">|</span>
                <span>Mandant: {session.company}</span>
              </div>
            )}
            
            {showLogout && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            )}
            
            {!showLogout && (
              <User className="w-6 h-6 text-blue-600" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-6">
        <div className="w-full max-w-7xl">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
            {/* Footer Links */}
            <div className="text-left">
              {footerLeft}
            </div>
            
            {/* Footer Mitte */}
            <div className="text-center">
              {footerCenter}
            </div>
            
            {/* Footer Rechts */}
            <div className="text-right">
              {footerRight}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BaseLayout;
