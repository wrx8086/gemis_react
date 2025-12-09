import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';

interface User {
  id: number;
  user_name: string;
  display_name: string;
  language_id: number;
  password?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isNewMode, setIsNewMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Formular-Felder
  const [formData, setFormData] = useState<User>({
    id: 0,
    user_name: '',
    display_name: '',
    language_id: 1,
    password: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ function: 'init' });
      const data = await apiGet('/users', params);
      
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.users.length > 0) {
          setFormData(data.users[0]);
          setCurrentIndex(0);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (isNewMode) {
        // Neuen Benutzer erstellen
        await apiPost('/users', formData);
        await loadUsers();
        setIsNewMode(false);
        alert('Benutzer erfolgreich erstellt');
      } else {
        // Bestehenden Benutzer aktualisieren
        await apiPatch('/users', formData);
        await loadUsers();
        alert('Benutzer erfolgreich aktualisiert');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Benutzers');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Benutzer "${formData.user_name}" wirklich löschen?`)) return;

    try {
      await apiDelete(`/users/${formData.id}`);
      await loadUsers();
      alert('Benutzer erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des Benutzers');
    }
  };

  const handleNew = () => {
    setIsNewMode(true);
    setFormData({
      id: 0,
      user_name: '',
      display_name: '',
      language_id: 1,
      password: ''
    });
  };

  const handleFirst = () => {
    if (users.length > 0) {
      setCurrentIndex(0);
      setFormData(users[0]);
      setIsNewMode(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setFormData(users[newIndex]);
      setIsNewMode(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < users.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setFormData(users[newIndex]);
      setIsNewMode(false);
    }
  };

  const handleLast = () => {
    if (users.length > 0) {
      const lastIndex = users.length - 1;
      setCurrentIndex(lastIndex);
      setFormData(users[lastIndex]);
      setIsNewMode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-app">
        <div className="card text-center py-12">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Benutzerdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Benutzerverwaltung</h1>

      {/* Editor-Bereich */}
      <div className="card mb-6">
        <div className="card-header flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isNewMode ? 'Neuer Benutzer' : `Benutzer bearbeiten (${currentIndex + 1} von ${users.length})`}
          </h2>
          <div className="flex gap-2">
            <button onClick={handleNew} className="btn btn-success flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Neu
            </button>
            <button 
              onClick={handleSave} 
              className="btn btn-primary flex items-center gap-2"
              disabled={!formData.user_name.trim()}
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
            <button 
              onClick={handleDelete} 
              className="btn btn-danger flex items-center gap-2"
              disabled={isNewMode || users.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Benutzername *</label>
              <input
                type="text"
                value={formData.user_name}
                onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                className="input-field"
                placeholder="z.B. max.mustermann"
              />
            </div>

            <div>
              <label className="label">Anzeigename</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="input-field"
                placeholder="z.B. Max Mustermann"
              />
            </div>

            <div>
              <label className="label">Sprache</label>
              <select
                value={formData.language_id}
                onChange={(e) => setFormData({ ...formData, language_id: Number(e.target.value) })}
                className="select-field"
              >
                <option value="1">Deutsch</option>
                <option value="2">English</option>
                <option value="3">Français</option>
              </select>
            </div>

            <div>
              <label className="label">Passwort {isNewMode && '*'}</label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                placeholder={isNewMode ? 'Passwort eingeben' : 'Leer lassen um nicht zu ändern'}
              />
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="border-t p-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={handleFirst}
              disabled={currentIndex === 0 || isNewMode}
              className="btn btn-secondary"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0 || isNewMode}
              className="btn btn-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= users.length - 1 || isNewMode}
              className="btn btn-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLast}
              disabled={currentIndex >= users.length - 1 || isNewMode}
              className="btn btn-secondary"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabellen-Bereich */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Alle Benutzer ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Benutzername</th>
                <th className="px-4 py-3 text-left">Anzeigename</th>
                <th className="px-4 py-3 text-left">Sprache</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Keine Benutzer vorhanden
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setFormData(user);
                      setIsNewMode(false);
                    }}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      index === currentIndex && !isNewMode ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 border-t">{user.id}</td>
                    <td className="px-4 py-3 border-t font-medium">{user.user_name}</td>
                    <td className="px-4 py-3 border-t">{user.display_name}</td>
                    <td className="px-4 py-3 border-t">
                      {user.language_id === 1 ? 'Deutsch' : user.language_id === 2 ? 'English' : 'Français'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
