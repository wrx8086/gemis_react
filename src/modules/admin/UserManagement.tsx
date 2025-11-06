import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, X, Save } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import '../../styles/erp-common.css';

interface User {
  id?: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  displayname: string;
  role: string;
  language_id: number;
  active: boolean;
}

interface Language {
  id: number;
  text: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<User>({
    username: '',
    email: '',
    firstname: '',
    lastname: '',
    displayname: '',
    role: 'user',
    language_id: 1,
    active: true
  });

  // Daten beim Laden der Komponente laden
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ function: 'init' });
      const data = await apiGet('/users', params);
      
      setUsers(data.users || []);
      setLanguages(data.languages || [
        { id: 1, text: 'Deutsch' },
        { id: 2, text: 'English' },
        { id: 3, text: 'Français' }
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      alert('Fehler beim Laden der Benutzerdaten');
      
      // Fallback Sprachen
      setLanguages([
        { id: 1, text: 'Deutsch' },
        { id: 2, text: 'English' },
        { id: 3, text: 'Français' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      firstname: '',
      lastname: '',
      displayname: '',
      role: 'user',
      language_id: 1,
      active: true
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setShowModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    try {
      await apiDelete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      alert('Benutzer erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des Benutzers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    if (!formData.username || !formData.email) {
      alert('Bitte füllen Sie mindestens Benutzername und E-Mail aus');
      return;
    }

    try {
      if (editingUser) {
        // Benutzer aktualisieren
        const updated = await apiPatch(`/users/${editingUser.id}`, formData);
        setUsers(users.map(u => u.id === editingUser.id ? updated : u));
        alert('Benutzer erfolgreich aktualisiert');
      } else {
        // Neuen Benutzer anlegen
        const newUser = await apiPost('/users', formData);
        setUsers([...users, newUser]);
        alert('Benutzer erfolgreich angelegt');
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Benutzers');
    }
  };

  const handleInputChange = (field: keyof User, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="erp-container">
        <div className="erp-loading">Daten werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="erp-container">
      <div className="erp-header">
        <h1>Benutzerverwaltung</h1>
        <button 
          className="erp-btn erp-btn-primary"
          onClick={handleAddNew}
        >
          <Plus size={16} />
          Neuer Benutzer
        </button>
      </div>

      <div className="erp-card">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Benutzername</th>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Sprache</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Keine Benutzer vorhanden
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.displayname || `${user.firstname} ${user.lastname}`}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`erp-badge erp-badge-${user.role === 'admin' ? 'primary' : 'secondary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{languages.find(l => l.id === user.language_id)?.text || 'Deutsch'}</td>
                  <td>
                    <span className={`erp-badge erp-badge-${user.active ? 'success' : 'danger'}`}>
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className="erp-action-buttons">
                      <button
                        className="erp-btn erp-btn-sm erp-btn-secondary"
                        onClick={() => handleEdit(user)}
                        title="Bearbeiten"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="erp-btn erp-btn-sm erp-btn-danger"
                        onClick={() => user.id && handleDelete(user.id)}
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal für Benutzer anlegen/bearbeiten */}
      {showModal && (
        <div className="erp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="erp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h2>{editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h2>
              <button 
                className="erp-modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="erp-modal-body">
                <div className="erp-form-row">
                  <div className="erp-form-group">
                    <label>Benutzername *</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>E-Mail *</label>
                    <input
                      type="email"
                      className="erp-input"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="erp-form-row">
                  <div className="erp-form-group">
                    <label>Vorname</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={formData.firstname}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Nachname</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={formData.lastname}
                      onChange={(e) => handleInputChange('lastname', e.target.value)}
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label>Anzeigename</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={formData.displayname}
                    onChange={(e) => handleInputChange('displayname', e.target.value)}
                    placeholder="Leer lassen für automatische Generierung"
                  />
                </div>

                <div className="erp-form-row">
                  <div className="erp-form-group">
                    <label>Rolle</label>
                    <select
                      className="erp-input"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                    >
                      <option value="user">Benutzer</option>
                      <option value="admin">Administrator</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Sprache</label>
                    <select
                      className="erp-input"
                      value={formData.language_id}
                      onChange={(e) => handleInputChange('language_id', Number(e.target.value))}
                    >
                      {languages.map(lang => (
                        <option key={lang.id} value={lang.id}>
                          {lang.text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                    />
                    Benutzer ist aktiv
                  </label>
                </div>
              </div>

              <div className="erp-modal-footer">
                <button
                  type="button"
                  className="erp-btn erp-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="erp-btn erp-btn-primary"
                >
                  <Save size={16} />
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
