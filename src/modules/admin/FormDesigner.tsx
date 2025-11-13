import React, { useState, useEffect } from 'react';
import { GripVertical, X, Save, Download, Search, Trash2 } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSearchParams } from 'react-router-dom';

interface Company {
  company: string;
  company_name: string;
  selected?: boolean;
}

interface User {
  user_name: string;
  display_name: string;
}

interface Language {
  language_id: number;
  language_name: string;
}

interface ExistingConfig {
  id: string;
  formTitle: string;
  formId: string;
  created?: string;
}

interface Field {
  id: string;
  fieldName: string;
  label: string;
  type: string;
  table: string;
  uniqueId: string;
  maxLength?: number;
  format?: string;
  decimalPlaces?: number;
  displayType?: string;
  inputMode?: string;
  showSpinner?: boolean;
  editable?: boolean;
  hidden?: boolean;
  required?: boolean;
  placeholder?: string;
  width?: string;
  widthInChars?: number;
  source?: string;
  newLine?: boolean;
  align?: 'left' | 'center' | 'right';
  separator?: boolean;
  showInTable?: boolean;
  keyfield?: boolean;
  password?: boolean;
}

const FormDesigner: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // OpenMode aus URL prüfen (für neue Tabs)
  const openMode = searchParams.get('mode') || 'simple';
  const showNavigation = false; // FormDesigner immer ohne Navigation
  
  console.log('🔍 FormDesigner - openMode:', openMode);
  console.log('🔍 FormDesigner - showNavigation:', showNavigation);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [tablesInput, setTablesInput] = useState<string>('');

  const [formTitle, setFormTitle] = useState<string>('');
  const [formId, setFormId] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');

  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<Field[]>([]);
  const [draggedField, setDraggedField] = useState<Field | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [existingConfigs, setExistingConfigs] = useState<ExistingConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // Browser-Tab Titel setzen
  useEffect(() => {
    document.title = 'Form Designer - GeMIS';
    return () => {
      document.title = 'GeMIS';
    };
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await apiGet('/formdesigner?function=init');
        
        console.log('📦 FormDesigner Init Response:', data);

        const hasInitData = data.companies && data.users && data.languages;
        
        if (!hasInitData) {
          console.warn('⚠️ Keine Init-Daten, verwende Mock-Daten');
          const mockCompanies = [
            { company: '1000', company_name: 'Kunde A', selected: true },
            { company: '2000', company_name: 'Kunde B', selected: false }
          ];
          const mockUsers = [
            { user_name: 'max', display_name: 'Max Mustermann' },
            { user_name: 'anna', display_name: 'Anna Schmidt' }
          ];
          const mockLanguages = [
            { language_id: 1, language_name: 'Deutsch' },
            { language_id: 2, language_name: 'English' },
            { language_id: 3, language_name: 'Français' }
          ];

          setCompanies(mockCompanies);
          setUsers(mockUsers);
          setLanguages(mockLanguages);
          setSelectedCompany(mockCompanies[0].company);
          setSelectedUser(mockUsers[0].user_name);
          setSelectedLanguage(String(mockLanguages[0].language_id));
          return;
        }

        setCompanies(data.companies || []);
        setUsers(data.users || []);
        setLanguages(data.languages || []);
        
        console.log('✅ Companies geladen:', data.companies?.length || 0);
        console.log('✅ Users geladen:', data.users?.length || 0);
        console.log('✅ Languages geladen:', data.languages?.length || 0);

        if (data.companies && data.companies.length > 0) {
          const selectedCompany = data.companies.find((c: Company) => c.selected);
          const companyToSelect = selectedCompany ? selectedCompany.company : data.companies[0].company;
          setSelectedCompany(companyToSelect);
        }
        if (data.users && data.users.length > 0) {
          setSelectedUser(data.users[0].user_name);
        }
        if (data.languages && data.languages.length > 0) {
          setSelectedLanguage(String(data.languages[0].language_id));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Initial-Daten:', error);
        const mockCompanies = [
          { company: '1000', company_name: 'Kunde A', selected: true },
          { company: '2000', company_name: 'Kunde B', selected: false }
        ];
        const mockUsers = [
          { user_name: 'max', display_name: 'Max Mustermann' },
          { user_name: 'anna', display_name: 'Anna Schmidt' }
        ];
        const mockLanguages = [
          { language_id: 1, language_name: 'Deutsch' },
          { language_id: 2, language_name: 'English' },
          { language_id: 3, language_name: 'Français' }
        ];

        setCompanies(mockCompanies);
        setUsers(mockUsers);
        setLanguages(mockLanguages);
        setSelectedCompany(mockCompanies[0].company);
        setSelectedUser(mockUsers[0].user_name);
        setSelectedLanguage(String(mockLanguages[0].language_id));
      }
    };

    loadInitialData();
  }, []);

  const loadConfiguration = async () => {
    if (!selectedCompany || !selectedUser || !selectedLanguage || !tablesInput.trim()) {
      alert('Bitte alle Filter-Felder ausfüllen');
      return;
    }

    try {
      const params = new URLSearchParams({
        function: 'load',
        company: selectedCompany,
        user_name: selectedUser,
        language_id: selectedLanguage,
        tables: tablesInput
      });

      const data = await apiGet(`/formdesigner?${params.toString()}`);
      const response = data.dsResponse || data;
      
      console.log('📦 Load Config Response:', response);
      
      let parsedFields = response.fields || [];
      let parsedConfigs = response.existingConfigs || [];
      
      if (!Array.isArray(parsedFields)) {
        parsedFields = [];
      }
      
      if (!Array.isArray(parsedConfigs)) {
        parsedConfigs = [];
      }

      const fieldsWithUniqueId: Field[] = parsedFields.map((f: any, index: number) => ({
        ...f,
        uniqueId: `available_${f.id}_${index}_${Date.now()}`
      }));

      setAvailableFields(fieldsWithUniqueId);

      if (parsedConfigs.length > 0) {
        setExistingConfigs(parsedConfigs);
        setSelectedConfigId('');
      } else {
        setExistingConfigs([]);
        setSelectedConfigId('');
      }

      setSelectedFields([]);
      setFormTitle('');
      setFormId('');
      setIsLoaded(true);
      alert('Konfiguration geladen!');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      alert('Fehler beim Laden der Konfiguration');
    }
  };

  const loadExistingConfig = async (configId: string) => {
    if (!configId) {
      setSelectedFields([]);
      setFormTitle('');
      setFormId('');
      return;
    }

    try {
      const params = new URLSearchParams({
        function: 'loaddetail',
        config_id: configId,
        company: selectedCompany,
        user_name: selectedUser,
        language_id: selectedLanguage,
        tables: tablesInput
      });

      const data = await apiGet(`/formdesigner?${params.toString()}`);
      
      console.log('📦 Load Detail Response:', data);

      if (data.selectedFields) {
        setSelectedFields(data.selectedFields);
        setFormTitle(data.formTitle || '');
        setFormId(data.formId || '');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Config:', error);
      alert('Fehler beim Laden der ausgewählten Konfiguration');
    }
  };

  const deleteConfiguration = async (configId: string) => {
    if (!configId) return;

    if (!confirm('Möchten Sie diese Konfiguration wirklich löschen?')) {
      return;
    }

    try {
      const params = new URLSearchParams({
        function: 'delete',
        config_id: configId,
        company: selectedCompany,
        user_name: selectedUser,
        language_id: selectedLanguage
      });

      await apiGet(`/formdesigner?${params.toString()}`);
      
      console.log('✅ Konfiguration gelöscht:', configId);
      
      // Config aus Liste entfernen
      setExistingConfigs(existingConfigs.filter(c => c.id !== configId));
      
      // Wenn die gelöschte Config gerade ausgewählt war, zurücksetzen
      if (selectedConfigId === configId) {
        setSelectedConfigId('');
        setSelectedFields([]);
        setFormTitle('');
        setFormId('');
      }
      
      alert('Konfiguration erfolgreich gelöscht!');
    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Konfiguration');
    }
  };

  const saveConfiguration = async () => {
    if (!isLoaded) {
      alert('Bitte zuerst eine Konfiguration laden');
      return;
    }

    const config = {
      company: selectedCompany,
      user_name: selectedUser,
      language_id: selectedLanguage,
      tables: tablesInput,
      config: {
        formTitle,
        formId,
        selectedFields: selectedFields
      }
    };

    try {
      const result = await apiPost('/formdesigner?function=save', config);
      console.log('✅ Gespeicherte Konfiguration:', result);
      alert('Konfiguration erfolgreich gespeichert!');
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Konfiguration');
    }
  };

  const exportConfiguration = () => {
    const config = {
      company: selectedCompany,
      user_name: selectedUser,
      language_id: selectedLanguage,
      tables: tablesInput,
      formTitle,
      formId,
      selectedFields: selectedFields
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'form-config.json';
    link.click();
  };

  const handleDragStart = (_e: React.DragEvent, field: Field, source: string) => {
    setDraggedField({ ...field, source });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const calculateWidthFromMaxLength = (maxLength: number = 20, fieldType?: string): { width?: string; widthInChars: number } => {
    const paddingChars = (fieldType === 'integer' || fieldType === 'decimal') ? 3 : 2;
    const charsWidth = Math.max(maxLength + paddingChars, 8);

    if (charsWidth > 80) {
      return { width: '100', widthInChars: charsWidth };
    } else if (charsWidth > 50) {
      return { width: '75', widthInChars: charsWidth };
    } else if (charsWidth > 30) {
      return { width: '50', widthInChars: charsWidth };
    } else {
      return { widthInChars: charsWidth };
    }
  };

  const handleDropToSelected = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedField && draggedField.source === 'available') {
      const { width, widthInChars } = calculateWidthFromMaxLength(draggedField.maxLength, draggedField.type);
      const newField: Field = {
        ...draggedField,
        uniqueId: `selected_${draggedField.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        required: false,
        placeholder: '',
        width: width,
        widthInChars: widthInChars,
        newLine: false,
        editable: draggedField.editable !== false,
        hidden: draggedField.hidden || false,
        align: draggedField.align || (draggedField.type === 'integer' || draggedField.type === 'decimal' ? 'right' : 'left'),
        showSpinner: draggedField.showSpinner || false
      };
      setSelectedFields([...selectedFields, newField]);
    }
    setDraggedField(null);
  };

  const handleDropToAvailable = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedField && draggedField.source === 'selected') {
      setSelectedFields(selectedFields.filter(f => f.uniqueId !== draggedField.uniqueId));
    }
    setDraggedField(null);
  };

  const handleReorder = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedField && draggedField.source === 'selected') {
      const newFields = [...selectedFields];
      const oldIndex = newFields.findIndex(f => f.uniqueId === draggedField.uniqueId);
      const [removed] = newFields.splice(oldIndex, 1);
      newFields.splice(index, 0, removed);
      setSelectedFields(newFields);
    }
  };

  const removeField = (uniqueId: string) => {
    setSelectedFields(selectedFields.filter(f => f.uniqueId !== uniqueId));
  };

  const updateFieldSettings = (uniqueId: string, settings: Partial<Field>) => {
    setSelectedFields(selectedFields.map(f =>
      f.uniqueId === uniqueId ? { ...f, ...settings } : f
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const elements = Array.from(form.elements).filter(
          (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => 
            el instanceof HTMLInputElement || 
            el instanceof HTMLTextAreaElement || 
            el instanceof HTMLSelectElement
        );
        const currentIndex = elements.indexOf(e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
        if (currentIndex >= 0 && currentIndex < elements.length - 1) {
          const nextElement = elements[currentIndex + 1];
          nextElement.focus();
        }
      }
    }
  };

  const filteredFields = availableFields.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <BaseLayout
      title="Form Designer"
      showUserInfo={true}
      showNavigation={showNavigation}
    >
      <div className="page-container">
        {/* Filter Bereich */}
        <div className="card">
          <div className="card-header">
            <h2>Konfiguration laden</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Firma</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {companies.map(c => (
                    <option key={c.company} value={c.company}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Benutzer</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {users.map(u => (
                    <option key={u.user_name} value={u.user_name}>{u.display_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sprache</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {languages.map(l => (
                    <option key={l.language_id} value={String(l.language_id)}>{l.language_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label invisible">-</label>
                <button onClick={loadConfiguration} className="btn btn-primary">
                  Konfiguration laden
                </button>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 'var(--spacing-md)' }}>
              <div className="form-group">
                <label className="form-label">Tabellen (kommagetrennt)</label>
                <input
                  type="text"
                  value={tablesInput}
                  onChange={(e) => setTablesInput(e.target.value)}
                  placeholder="z.B. products,orders"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* Bestehende Konfigurationen */}
            {existingConfigs.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2>Bestehende Konfigurationen</h2>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Konfiguration auswählen (optional)</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <select
                        value={selectedConfigId}
                        onChange={(e) => {
                          setSelectedConfigId(e.target.value);
                          loadExistingConfig(e.target.value);
                        }}
                        className="input-field"
                        style={{ flex: 1 }}
                      >
                        <option value="">-- Neue Konfiguration erstellen --</option>
                        {existingConfigs.map(config => (
                          <option key={config.id} value={config.id}>
                            {config.formTitle || config.id}
                            {config.created && ` - ${new Date(config.created).toLocaleString('de-CH', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => selectedConfigId && deleteConfiguration(selectedConfigId)}
                        disabled={!selectedConfigId}
                        className="btn btn-danger"
                        style={{ minWidth: 'auto', padding: '0 1rem' }}
                        title="Konfiguration löschen"
                      >
                        <Trash2 className="btn-icon" style={{ margin: 0 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formular-Details */}
            <div className="card">
              <div className="card-header">
                <h2>Formular-Details</h2>
              </div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Formular-Titel</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="z.B. Kundendaten erfassen"
                      className="input-field"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Formular-ID</label>
                    <input
                      type="text"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="z.B. customer-form-001"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Designer Grid */}
            <div className="fd-designer-grid">
              {/* Verfügbare Felder */}
              <div className="card">
                <div className="card-header">
                  <h2>Verfügbare Felder</h2>
                </div>
                <div className="card-body">
                  <div className="fd-search-container">
                    <Search className="fd-search-icon" />
                    <input
                      type="text"
                      placeholder="Felder durchsuchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="fd-search-input"
                    />
                  </div>

                  <div
                    className="fd-designer-container fd-designer-container-available"
                    onDragOver={handleDragOver}
                    onDrop={handleDropToAvailable}
                  >
                  {filteredFields.length === 0 ? (
                    <div className="fd-empty-state">
                      Keine Felder gefunden
                    </div>
                  ) : (
                    filteredFields.map(field => (
                      <div
                        key={field.uniqueId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, field, 'available')}
                        className="fd-field-card fd-field-card-available"
                      >
                        <div className="fd-flex-between">
                          <div className="fd-flex-center fd-flex-gap-xs">
                            <GripVertical className="fd-icon-sm fd-icon-muted" />
                            <div>
                              <div className="fd-field-name">{field.label}</div>
                              <div className="fd-field-meta">
                                {field.fieldName} ({field.type})
                                {field.format && ` • ${field.format}`}
                                {field.maxLength && ` • Max: ${field.maxLength}`}
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-blue">
                            {field.table}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

              {/* Formular-Felder */}
              <div className="card">
                <div className="card-header">
                  <h2>Formular-Felder</h2>
                </div>
                <div className="card-body">
                  <div
                    className="fd-designer-container fd-designer-container-selected"
                    onDragOver={handleDragOver}
                    onDrop={handleDropToSelected}
                  >
                  {selectedFields.length === 0 ? (
                    <div className="fd-empty-state">
                      Felder hierher ziehen
                    </div>
                  ) : (
                    selectedFields.map((field, index) => (
                      <div
                        key={field.uniqueId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, field, 'selected')}
                        onDragOver={(e) => handleReorder(e, index)}
                        className="fd-field-card fd-field-card-selected"
                      >
                        <div className="fd-field-card-header">
                          <div className="fd-field-card-content">
                            <GripVertical className="fd-icon-sm fd-icon-muted" />
                            <span className="fd-field-name">{field.label}</span>
                            {field.required && (
                              <span className="fd-preview-required">*</span>
                            )}
                            {field.hidden && (
                              <span className="badge badge-gray">Hidden</span>
                            )}
                            {!field.editable && (
                              <span className="badge badge-orange">ReadOnly</span>
                            )}
                            {field.newLine && (
                              <span className="badge badge-blue">↵ Neue Zeile</span>
                            )}
                            {field.widthInChars && (
                              <span className="badge badge-green">{field.widthInChars}ch</span>
                            )}
                            {field.showSpinner && (
                              <span className="badge badge-purple">↑↓ Spinner</span>
                            )}
                            {field.separator && (
                              <span className="badge badge-orange">━ Separator</span>
                            )}
                            {field.showInTable && (
                              <span className="badge badge-green">📋 In Tabelle</span>
                            )}
                            {field.keyfield && (
                              <span className="badge badge-red">🔑 Key</span>
                            )}
                            {field.password && (
                              <span className="badge badge-purple">🔒 Passwort</span>
                            )}
                          </div>
                          <div className="fd-flex-center fd-flex-gap-xs">
                            <button
                              onClick={() => setEditingField(field.uniqueId)}
                              className="fd-button-text"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => removeField(field.uniqueId)}
                              className="fd-button-text"
                              style={{ color: '#ef4444' }}
                            >
                              <X className="fd-icon-sm" />
                            </button>
                          </div>
                        </div>

                        {editingField === field.uniqueId && (
                          <div className="fd-edit-panel">
                            <div className="fd-edit-panel-field">
                              <label className="label">Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { label: e.target.value })}
                                className="input-field"
                              />
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="label">Feldtyp</label>
                              <select
                                value={field.type}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { type: e.target.value })}
                                className="select-field"
                              >
                                <option value="character">Text (character)</option>
                                <option value="integer">Ganzzahl (integer)</option>
                                <option value="decimal">Dezimalzahl (decimal)</option>
                                <option value="date">Datum (date)</option>
                                <option value="logical">Ja/Nein (logical)</option>
                                <option value="textarea">Mehrzeilig (textarea)</option>
                                <option value="select">Auswahlbox (select)</option>
                              </select>
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="label">Platzhalter</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { placeholder: e.target.value })}
                                className="input-field"
                              />
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="label">Breite</label>
                              <div className="fd-edit-panel-grid">
                                <div>
                                  <input
                                    type="number"
                                    value={field.widthInChars || ''}
                                    onChange={(e) => updateFieldSettings(field.uniqueId, {
                                      widthInChars: Number(e.target.value),
                                      width: undefined
                                    })}
                                    placeholder="z.B. 20"
                                    className="input-field"
                                    min="5"
                                    max="150"
                                  />
                                  <p className="fd-edit-panel-hint">Zeichen (ch)</p>
                                </div>
                                <div>
                                  <select
                                    value={field.widthInChars ? '' : (field.width || '')}
                                    onChange={(e) => updateFieldSettings(field.uniqueId, {
                                      width: e.target.value,
                                      widthInChars: undefined
                                    })}
                                    className="select-field"
                                  >
                                    <option value="">Auto</option>
                                    <option value="25">25%</option>
                                    <option value="50">50%</option>
                                    <option value="75">75%</option>
                                    <option value="100">100%</option>
                                  </select>
                                  <p className="fd-edit-panel-hint">Prozent (%)</p>
                                </div>
                              </div>
                              {field.maxLength && (
                                <p className="fd-edit-panel-hint" style={{ color: '#2563eb' }}>
                                  💡 Empfohlen: {field.maxLength + (field.type === 'integer' || field.type === 'decimal' ? 3 : 2)} Zeichen
                                </p>
                              )}
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="label">Ausrichtung</label>
                              <select
                                value={field.align || 'left'}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { align: e.target.value as 'left' | 'center' | 'right' })}
                                className="select-field"
                              >
                                <option value="left">Links</option>
                                <option value="center">Zentriert</option>
                                <option value="right">Rechts</option>
                              </select>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { required: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Pflichtfeld</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.editable !== false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { editable: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Bearbeitbar (nicht ReadOnly)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.hidden || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { hidden: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Versteckt (Hidden)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.newLine || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { newLine: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Neue Zeile davor</label>
                            </div>

                            {(field.type === 'integer' || field.type === 'decimal') && (
                              <div className="fd-flex-center fd-flex-gap-sm">
                                <input
                                  type="checkbox"
                                  checked={field.showSpinner || false}
                                  onChange={(e) => updateFieldSettings(field.uniqueId, { showSpinner: e.target.checked })}
                                  className="checkbox"
                                />
                                <label className="label" style={{ marginBottom: 0 }}>Spinner anzeigen (↑↓ Pfeile)</label>
                              </div>
                            )}

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.separator || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { separator: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Separator davor (horizontale Linie)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.showInTable || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { showInTable: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>In Tabellen-Ansicht anzeigen</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.keyfield || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { keyfield: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Schlüsselfeld (Key)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.password || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { password: e.target.checked })}
                                className="checkbox"
                              />
                              <label className="label" style={{ marginBottom: 0 }}>Passwort-Feld (maskierte Eingabe)</label>
                            </div>

                            <button
                              onClick={() => setEditingField(null)}
                              className="btn btn-primary" style={{ width: "100%" }}
                            >
                              Fertig
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Aktions-Buttons */}
            <div className="card">
              <div className="card-body">
                <div className="fd-flex fd-flex-gap-sm">
                  <button
                    onClick={saveConfiguration}
                    className="btn btn-success"
                  >
                    <Save className="btn-icon" />
                    Konfiguration speichern
                  </button>
                  <button
                    onClick={exportConfiguration}
                    className="btn btn-secondary"
                  >
                    <Download className="btn-icon" />
                    Als JSON exportieren
                  </button>
                </div>
              </div>
            </div>

            {/* Vorschau */}
            <div className="card">
              <div className="card-header">
                <h2>Vorschau</h2>
              </div>
              <div className="card-body">
                {formTitle && (
                  <h3 style={{ 
                    marginBottom: 'var(--spacing-md)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--color-gray-900)'
                  }}>{formTitle}</h3>
                )}
                <div style={{ padding: 'var(--spacing-md)' }}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 'var(--spacing-sm)',
                    alignItems: 'flex-start'
                  }}>
                    {selectedFields.filter(f => !f.hidden).map((field, index) => (
                      <React.Fragment key={field.uniqueId}>
                        {field.separator && index > 0 && (
                          <>
                            <div style={{ flexBasis: '100%', height: 0 }} />
                            <hr style={{ 
                              flexBasis: '100%', 
                              border: 'none', 
                              borderTop: '2px solid var(--color-gray-300)',
                              margin: 'var(--spacing-lg) 0'
                            }} />
                            <div style={{ flexBasis: '100%', height: 0 }} />
                          </>
                        )}
                        {field.newLine && index > 0 && !field.separator && (
                          <div style={{ flexBasis: '100%', height: 0 }} />
                        )}
                        <div
                          style={{
                            width: field.widthInChars
                              ? `${field.widthInChars}ch`
                              : field.width
                                ? `${field.width}%`
                                : 'auto',
                            maxWidth: '100%',
                            minWidth: field.widthInChars ? `${field.widthInChars}ch` : undefined
                          }}
                          className="form-group"
                        >
                          <label className="label">
                            {field.label}
                            {field.required && <span style={{ color: 'var(--color-red-600)', marginLeft: '2px' }}>*</span>}
                            {!field.editable && <span style={{ color: 'var(--color-gray-500)', marginLeft: '4px', fontSize: '0.875rem' }}>(ReadOnly)</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              placeholder={field.placeholder}
                              readOnly={!field.editable}
                              style={{ textAlign: field.align || 'left' }}
                              className="textarea-field"
                              rows={2}
                              onKeyDown={handleKeyDown}
                            />
                          ) : field.type === 'checkbox' || field.type === 'logical' ? (
                            <input
                              type="checkbox"
                              disabled={!field.editable}
                              className="checkbox"
                              onKeyDown={handleKeyDown}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              disabled={!field.editable}
                              className="select-field"
                              onKeyDown={handleKeyDown}
                            >
                              <option>-- Bitte wählen --</option>
                            </select>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              placeholder={field.placeholder}
                              readOnly={!field.editable}
                              className="input-field"
                              onKeyDown={handleKeyDown}
                            />
                          ) : field.type === 'integer' ? (
                            field.showSpinner ? (
                              <input
                                type="number"
                                step="1"
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                style={{ textAlign: field.align || 'right' }}
                                className="input-field"
                                onKeyDown={handleKeyDown}
                              />
                            ) : (
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                maxLength={field.maxLength}
                                style={{ textAlign: field.align || 'right' }}
                                className="input-field"
                                onKeyDown={handleKeyDown}
                              />
                            )
                          ) : field.type === 'decimal' ? (
                            field.showSpinner ? (
                              <input
                                type="number"
                                step={field.decimalPlaces ? `0.${'0'.repeat(Math.max(0, field.decimalPlaces - 1))}1` : '0.01'}
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                style={{ textAlign: field.align || 'right' }}
                                className="input-field"
                                onKeyDown={handleKeyDown}
                              />
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9.,]*"
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                maxLength={field.maxLength}
                                style={{ textAlign: field.align || 'right' }}
                                className="input-field"
                                onKeyDown={handleKeyDown}
                              />
                            )
                          ) : (
                            <input
                              type={
                                field.password 
                                  ? 'password' 
                                  : field.type === 'character' 
                                    ? 'text' 
                                    : field.type
                              }
                              placeholder={field.placeholder}
                              readOnly={!field.editable}
                              maxLength={field.maxLength}
                              style={{ textAlign: field.align || 'left' }}
                              className="input-field"
                              onKeyDown={handleKeyDown}
                            />
                          )}
                          {field.maxLength && field.editable && field.type !== 'checkbox' && field.type !== 'logical' && field.type !== 'select' && (
                            <p style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--color-gray-500)', 
                              marginTop: '4px',
                              marginBottom: 0
                            }}>
                              Max. {field.maxLength} Zeichen
                              {field.format && ` • Format: ${field.format}`}
                            </p>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </form>
              </div>
            </div>
          </div>

            {/* Tabellenansicht-Vorschau */}
            {selectedFields.filter(f => f.showInTable).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2>Tabellenansicht-Vorschau</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', marginTop: 'var(--spacing-xs)' }}>
                    Felder mit "In Tabelle anzeigen"
                  </p>
                </div>
                <div className="card-body">
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          {selectedFields.filter(f => f.showInTable).map((field) => (
                            <th 
                              key={field.uniqueId}
                              style={{ 
                                textAlign: field.align || 'left',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {field.label}
                              {field.keyfield && <span style={{ marginLeft: '4px', color: 'var(--color-red-600)' }}>🔑</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Beispielzeilen */}
                        {[1, 2, 3].map((rowIndex) => (
                          <tr key={rowIndex}>
                            {selectedFields.filter(f => f.showInTable).map((field) => (
                              <td 
                                key={field.uniqueId}
                                style={{ 
                                  textAlign: field.align || 'left',
                                  color: 'var(--color-gray-500)',
                                  fontStyle: 'italic'
                                }}
                              >
                                {field.type === 'checkbox' ? (
                                  <input type="checkbox" disabled className="checkbox" />
                                ) : field.type === 'integer' ? (
                                  `${rowIndex * 100}`
                                ) : field.type === 'decimal' ? (
                                  `${(rowIndex * 10.5).toFixed(field.decimalPlaces || 2)}`
                                ) : (
                                  `${field.placeholder || field.label} ${rowIndex}`
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default FormDesigner;