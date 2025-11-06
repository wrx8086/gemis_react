import React, { useState, useEffect } from 'react';
import { GripVertical, X, Save, Download, Search } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import '../../FormDesigner.css';

interface Customer {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

interface Language {
  id: number;
  text: string;
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
}

const FormDesigner: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
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

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await apiGet('/initialData');

        setCustomers(data.customers || []);
        setUsers(data.users || []);
        setLanguages(data.languages || []);

        if (data.customers && data.customers.length > 0) {
          setSelectedCustomer(String(data.customers[0].id));
        }
        if (data.users && data.users.length > 0) {
          setSelectedUser(String(data.users[0].id));
        }
        if (data.languages && data.languages.length > 0) {
          setSelectedLanguage(String(data.languages[0].id));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Initial-Daten:', error);
        const mockCustomers = [
          { id: 1, name: 'Kunde A' },
          { id: 2, name: 'Kunde B' },
          { id: 3, name: 'Kunde C' }
        ];
        const mockUsers = [
          { id: 1, name: 'Max Mustermann' },
          { id: 2, name: 'Anna Schmidt' },
          { id: 3, name: 'Peter Weber' }
        ];
        const mockLanguages = [
          { id: 1, text: 'Deutsch' },
          { id: 2, text: 'English' },
          { id: 3, text: 'Français' }
        ];

        setCustomers(mockCustomers);
        setUsers(mockUsers);
        setLanguages(mockLanguages);

        setSelectedCustomer(String(mockCustomers[0].id));
        setSelectedUser(String(mockUsers[0].id));
        setSelectedLanguage(String(mockLanguages[0].id));
      }
    };

    loadInitialData();
  }, []);

  const loadConfiguration = async () => {
    if (!selectedCustomer || !selectedUser || !selectedLanguage || !tablesInput.trim()) {
      alert('Bitte alle Filter-Felder ausfüllen');
      return;
    }

    try {
      const params = new URLSearchParams({
        customer_id: selectedCustomer,
        user_id: selectedUser,
        language_id: selectedLanguage,
        tables: tablesInput
      });

      const data = await apiGet('/config', params);
      const response = data.dsResponse || data;
      
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
        config_id: configId,
        customer_id: selectedCustomer,
        user_id: selectedUser,
        language_id: selectedLanguage,
        tables: tablesInput
      });

      const data = await apiGet('/config/detail', params);

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

  const saveConfiguration = async () => {
    if (!isLoaded) {
      alert('Bitte zuerst eine Konfiguration laden');
      return;
    }

    const config = {
      customer_id: selectedCustomer,
      user_id: selectedUser,
      language_id: selectedLanguage,
      tables: tablesInput,
      config: {
        formTitle,
        formId,
        selectedFields: selectedFields
      }
    };

    try {
      const result = await apiPost('/config', config);
      console.log('Gespeicherte Konfiguration:', result);
      alert('Konfiguration erfolgreich gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Konfiguration');
    }
  };

  const exportConfiguration = () => {
    const config = {
      customer_id: selectedCustomer,
      user_id: selectedUser,
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
    <div className="fd-container">
      <div className="fd-inner-container">
        <h1 className="fd-page-title">Form Designer</h1>

        {/* Filter Bereich */}
        <div className="fd-section">
          <h2 className="fd-section-title">Konfiguration laden</h2>
          
          <div className="fd-grid-4">
            <div>
              <label className="fd-label">Kundeninstallation</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="fd-select"
              >
                <option value="">-- Auswählen --</option>
                {customers.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="fd-label">Benutzer</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="fd-select"
              >
                <option value="">-- Auswählen --</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="fd-label">Sprache</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="fd-select"
              >
                <option value="">-- Auswählen --</option>
                {languages.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.text}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="fd-label">Tabellen (kommagetrennt)</label>
              <input
                type="text"
                value={tablesInput}
                onChange={(e) => setTablesInput(e.target.value)}
                placeholder="z.B. products,orders"
                className="fd-input"
              />
            </div>
          </div>

          <button onClick={loadConfiguration} className="fd-button fd-button-primary">
            Konfiguration laden
          </button>
        </div>

        {isLoaded && (
          <>
            {/* Bestehende Konfigurationen */}
            {existingConfigs.length > 0 && (
              <div className="fd-section">
                <h2 className="fd-section-title">Bestehende Konfigurationen</h2>
                <div>
                  <label className="fd-label">Konfiguration auswählen (optional)</label>
                  <select
                    value={selectedConfigId}
                    onChange={(e) => {
                      setSelectedConfigId(e.target.value);
                      loadExistingConfig(e.target.value);
                    }}
                    className="fd-select"
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
                </div>
              </div>
            )}

            {/* Formular-Details */}
            <div className="fd-section">
              <h2 className="fd-section-title">Formular-Details</h2>
              <div className="fd-grid-2">
                <div>
                  <label className="fd-label">Formular-Titel</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="z.B. Kundendaten erfassen"
                    className="fd-input"
                  />
                </div>
                <div>
                  <label className="fd-label">Formular-ID</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="z.B. customer-form-001"
                    className="fd-input"
                  />
                </div>
              </div>
            </div>

            {/* Designer Grid */}
            <div className="fd-designer-grid">
              {/* Verfügbare Felder */}
              <div className="fd-section">
                <h2 className="fd-section-title">Verfügbare Felder</h2>

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
                          <span className="fd-badge fd-badge-blue">
                            {field.table}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Formular-Felder */}
              <div className="fd-section">
                <h2 className="fd-section-title">Formular-Felder</h2>
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
                              <span className="fd-badge fd-badge-gray">Hidden</span>
                            )}
                            {!field.editable && (
                              <span className="fd-badge fd-badge-orange">ReadOnly</span>
                            )}
                            {field.newLine && (
                              <span className="fd-badge fd-badge-blue">↵ Neue Zeile</span>
                            )}
                            {field.widthInChars && (
                              <span className="fd-badge fd-badge-green">{field.widthInChars}ch</span>
                            )}
                            {field.showSpinner && (
                              <span className="fd-badge fd-badge-purple">↑↓ Spinner</span>
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
                              <label className="fd-label">Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { label: e.target.value })}
                                className="fd-input"
                              />
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="fd-label">Platzhalter</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { placeholder: e.target.value })}
                                className="fd-input"
                              />
                            </div>

                            <div className="fd-edit-panel-field">
                              <label className="fd-label">Breite</label>
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
                                    className="fd-input"
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
                                    className="fd-select"
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
                              <label className="fd-label">Ausrichtung</label>
                              <select
                                value={field.align || 'left'}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { align: e.target.value as 'left' | 'center' | 'right' })}
                                className="fd-select"
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
                                className="fd-checkbox"
                              />
                              <label className="fd-label fd-mb-0">Pflichtfeld</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.editable !== false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { editable: e.target.checked })}
                                className="fd-checkbox"
                              />
                              <label className="fd-label fd-mb-0">Bearbeitbar (nicht ReadOnly)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.hidden || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { hidden: e.target.checked })}
                                className="fd-checkbox"
                              />
                              <label className="fd-label fd-mb-0">Versteckt (Hidden)</label>
                            </div>

                            <div className="fd-flex-center fd-flex-gap-sm">
                              <input
                                type="checkbox"
                                checked={field.newLine || false}
                                onChange={(e) => updateFieldSettings(field.uniqueId, { newLine: e.target.checked })}
                                className="fd-checkbox"
                              />
                              <label className="fd-label fd-mb-0">Neue Zeile davor</label>
                            </div>

                            {(field.type === 'integer' || field.type === 'decimal') && (
                              <div className="fd-flex-center fd-flex-gap-sm">
                                <input
                                  type="checkbox"
                                  checked={field.showSpinner || false}
                                  onChange={(e) => updateFieldSettings(field.uniqueId, { showSpinner: e.target.checked })}
                                  className="fd-checkbox"
                                />
                                <label className="fd-label fd-mb-0">Spinner anzeigen (↑↓ Pfeile)</label>
                              </div>
                            )}

                            <button
                              onClick={() => setEditingField(null)}
                              className="fd-button fd-button-primary fd-w-full"
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

            {/* Aktions-Buttons */}
            <div className="fd-section">
              <div className="fd-flex fd-flex-gap-sm">
                <button
                  onClick={saveConfiguration}
                  className="fd-button fd-button-success"
                >
                  <Save className="fd-button-icon" />
                  Konfiguration speichern
                </button>
                <button
                  onClick={exportConfiguration}
                  className="fd-button fd-button-secondary"
                >
                  <Download className="fd-button-icon" />
                  Als JSON exportieren
                </button>
              </div>
            </div>

            {/* Vorschau */}
            <div className="fd-section">
              <h2 className="fd-section-title">Vorschau</h2>
              {formTitle && (
                <h3 className="fd-preview-title">{formTitle}</h3>
              )}
              <div className="fd-preview-container">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="fd-preview-form">
                    {selectedFields.filter(f => !f.hidden).map((field, index) => (
                      <React.Fragment key={field.uniqueId}>
                        {field.newLine && index > 0 && (
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
                          className="fd-preview-field"
                        >
                          <label className="fd-preview-label">
                            {field.label}
                            {field.required && <span className="fd-preview-required">*</span>}
                            {!field.editable && <span className="fd-preview-readonly">(ReadOnly)</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              placeholder={field.placeholder}
                              readOnly={!field.editable}
                              style={{ textAlign: field.align || 'left' }}
                              className="fd-textarea"
                              rows={2}
                              onKeyDown={handleKeyDown}
                            />
                          ) : field.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              disabled={!field.editable}
                              className="fd-checkbox"
                              onKeyDown={handleKeyDown}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              disabled={!field.editable}
                              className="fd-select"
                              onKeyDown={handleKeyDown}
                            >
                              <option>-- Bitte wählen --</option>
                            </select>
                          ) : field.type === 'integer' ? (
                            field.showSpinner ? (
                              <input
                                type="number"
                                step="1"
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                style={{ textAlign: field.align || 'right' }}
                                className="fd-input"
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
                                className="fd-input"
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
                                className="fd-input"
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
                                className="fd-input"
                                onKeyDown={handleKeyDown}
                              />
                            )
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              readOnly={!field.editable}
                              maxLength={field.maxLength}
                              style={{ textAlign: field.align || 'left' }}
                              className="fd-input"
                              onKeyDown={handleKeyDown}
                            />
                          )}
                          {field.maxLength && field.editable && field.type !== 'checkbox' && field.type !== 'select' && (
                            <p className="fd-preview-hint">
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
          </>
        )}
      </div>
    </div>
  );
};

export default FormDesigner;