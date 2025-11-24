import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface MenuItem {
  level1: number;
  level2: number;
  level3: number;
  menu_title: string;
  menu_link: string;
}

interface MainMenuProps {
  menuItems: MenuItem[];
}

interface MenuStructure {
  [key: string]: {
    item: MenuItem;
    children: {
      [key: string]: {
        item: MenuItem;
        children: MenuItem[];
      };
    };
  };
}

const MainMenu: React.FC<MainMenuProps> = ({ menuItems }) => {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  // Menü-Items in hierarchische Struktur umwandeln
  const buildMenuStructure = (): MenuStructure => {
    const structure: MenuStructure = {};

    // Safety check: Wenn menuItems nicht existiert oder kein Array ist
    if (!menuItems || !Array.isArray(menuItems)) {
      return structure;
    }

    menuItems.forEach((item) => {
      const key1 = `${item.level1}`;
      const key2 = `${item.level1}-${item.level2}`;

      // Level 1 (Hauptmenü)
      if (item.level2 === 0 && item.level3 === 0) {
        if (!structure[key1]) {
          structure[key1] = {
            item,
            children: {}
          };
        }
      }
      // Level 2 (Untermenü)
      else if (item.level2 !== 0 && item.level3 === 0) {
        if (!structure[key1]) {
          structure[key1] = {
            item: { level1: item.level1, level2: 0, level3: 0, menu_title: '', menu_link: '' },
            children: {}
          };
        }
        if (!structure[key1].children[key2]) {
          structure[key1].children[key2] = {
            item,
            children: []
          };
        }
      }
      // Level 3 (Sub-Untermenü)
      else if (item.level3 !== 0) {
        if (!structure[key1]) {
          structure[key1] = {
            item: { level1: item.level1, level2: 0, level3: 0, menu_title: '', menu_link: '' },
            children: {}
          };
        }
        if (!structure[key1].children[key2]) {
          structure[key1].children[key2] = {
            item: { level1: item.level1, level2: item.level2, level3: 0, menu_title: '', menu_link: '' },
            children: []
          };
        }
        structure[key1].children[key2].children.push(item);
      }
    });

    return structure;
  };

  const menuStructure = buildMenuStructure();

  const handleMenuClick = (menu_link: string) => {
    if (menu_link) {
      setOpenMenu(null);
      setOpenSubMenu(null);
      navigate(`/${menu_link}`);
    }
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 mb-6">
      <div className="container-app">
        <div className="flex space-x-1">
          {Object.entries(menuStructure).map(([key1, level1]) => {
            const hasChildren = Object.keys(level1.children).length > 0;

            // Level 1 ohne Kinder - direkter Link
            if (!hasChildren && level1.item.menu_link) {
              return (
                <button
                  key={key1}
                  onClick={() => handleMenuClick(level1.item.menu_link)}
                  className="px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors font-medium focus-ring"
                >
                  {level1.item.menu_title}
                </button>
              );
            }

            // Level 1 mit Kindern - Dropdown
            if (hasChildren) {
              return (
                <div
                  key={key1}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(key1)}
                  onMouseLeave={() => {
                    setOpenMenu(null);
                    setOpenSubMenu(null);
                  }}
                >
                  <button className="flex items-center gap-1 px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors font-medium focus-ring">
                    {level1.item.menu_title}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Level 2 Dropdown */}
                  {openMenu === key1 && (
                    <div className="absolute left-0 mt-0 w-56 bg-white shadow-lg rounded-b-md ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                      {Object.entries(level1.children).map(([key2, level2]) => {
                        const hasLevel3Children = level2.children.length > 0;

                        // Level 2 ohne Kinder - direkter Link
                        if (!hasLevel3Children && level2.item.menu_link) {
                          return (
                            <button
                              key={key2}
                              onClick={() => handleMenuClick(level2.item.menu_link)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors focus-ring"
                            >
                              {level2.item.menu_title}
                            </button>
                          );
                        }

                        // Level 2 mit Kindern (Level 3)
                        if (hasLevel3Children) {
                          return (
                            <div
                              key={key2}
                              className="relative"
                              onMouseEnter={() => setOpenSubMenu(key2)}
                              onMouseLeave={() => setOpenSubMenu(null)}
                            >
                              <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors focus-ring">
                                {level2.item.menu_title}
                                <ChevronRight className="w-4 h-4" />
                              </button>

                              {/* Level 3 Dropdown */}
                              {openSubMenu === key2 && (
                                <div className="absolute left-full top-0 ml-0 w-56 bg-white shadow-lg rounded-r-md ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
                                  {level2.children.map((level3) => (
                                    <button
                                      key={`${key2}-${level3.level3}`}
                                      onClick={() => handleMenuClick(level3.menu_link)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors focus-ring"
                                    >
                                      {level3.menu_title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </nav>
  );
};

export default MainMenu;