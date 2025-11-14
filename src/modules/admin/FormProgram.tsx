import React, { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import {
  Save, Plus, Copy, Trash2, X,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Edit2, AlertCircle
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';

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

interface Field {
  id: string;
  fieldName: string;
  label: string;
  type: string;
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

interface FormConfig {
  formTitle: string;
  formId: string;
  selectedFields: Field[];
}

interface RecordData {
  [key: string]: any;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectOptions {
  [fieldName: string]: SelectOption[];
}

type EditMode = 'view' | 'add' | 'update' | 'copy' | 'delete';

const FormProgram: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [formId, setFormId] = useState<string>('');

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [selectOptions, setSelectOptions] = useState<SelectOptions>({});
  const [records, setRecords] = useState<RecordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentRecord, setCurrentRecord] = useState<RecordData>({});
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const formRef = useRef<HTMLFormElement>(null);

  const getTableFromFieldName = (fieldName: string): string => {
    const parts = fieldName.split('_');
    return parts.length > 1 ? parts[0] : '';
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

  useEffect(() => {
    if (formConfig?.formTitle) {
      document.title = `${formConfig.formTitle} - GeMIS`;
    }
    return () => {
      document.title = 'GeMIS';
    };
  }, [formConfig]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await apiGet('/formdesigner?function=init');

        const companies = data.companies || data.dsResponse?.companies || [];
        const users = data.users || data.dsResponse?.users || [];
        const languages = data.languages || data.dsResponse?.languages || [];


        setCompanies(companies);
        setUsers(users);
        setLanguages(languages);

        if (data.selectOptions) {
          setSelectOptions(data.selectOptions);
        }

        if (companies.length > 0) {
          const selectedComp = companies.find((c: Company) => c.selected);
          setSelectedCompany(selectedComp ? selectedComp.company : companies[0].company);
        }

        if (users.length > 0) {
          setSelectedUser(users[0].user_name);
        }

        if (languages.length > 0) {
          setSelectedLanguage(String(languages[0].language_id));
        }

        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadFormConfiguration = async () => {
    if (!selectedCompany || !selectedUser || !selectedLanguage || !formId) {
      alert('Bitte wählen Sie Firma, Benutzer, Sprache und geben Sie eine Form-ID ein.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        function: 'loadconfig',
        company: selectedCompany,
        user: selectedUser,
        language_id: selectedLanguage,
        form_id: formId
      });

      const data = await apiGet('/formprogram', params);

      let config: FormConfig;

      if (data.dsResponse && data.dsResponse.config) {
        config = JSON.parse(data.dsResponse.config);
      } else if (data.formTitle && data.selectedFields) {
        config = data as FormConfig;
      } else {
        throw new Error('Form-Konfiguration konnte nicht geladen werden');
      }

      const normalizedFields = config.selectedFields.map(field => {
        if (!field.widthInChars && !field.width) {
          const calculated = calculateWidthFromMaxLength(field.maxLength, field.type);
          return {
            ...field,
            width: calculated.width,
            widthInChars: calculated.widthInChars
          };
        }
        
        return field;
      });

      config = {
        ...config,
        selectedFields: normalizedFields
      };

      if (data.selectOptions) {
        setSelectOptions(prev => ({ ...prev, ...data.selectOptions }));
      }

      setFormConfig(config);
      setIsLoaded(true);

      await loadRecords(config);

      setIsLoading(false);
    } catch (err) {
      setError(`Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      setIsLoading(false);
    }
  };

  const loadRecords = async (config: FormConfig) => {
    try {
      const tables = Array.from(new Set(config.selectedFields.map(f => getTableFromFieldName(f.fieldName)).filter(Boolean)));
      const tableName = tables[0];

      if (!tableName) {
        return;
      }

      const params = new URLSearchParams({
        function: 'read',
        table: tableName,
        company: selectedCompany,
        user: selectedUser,
        language_id: selectedLanguage
      });
      const data = await apiGet('/formprogram', params);

      if (data.dsResponse && Array.isArray(data.dsResponse.records)) {
        setRecords(data.dsResponse.records);
        if (data.dsResponse.records.length > 0) {
          setCurrentRecord(data.dsResponse.records[0]);
          setCurrentIndex(0);
        }
      }
    } catch (err) {
    }
  };

  const handleAdd = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;

    const emptyRecord: RecordData = {};
    formConfig?.selectedFields.forEach(field => {
      if (field.type === 'logical' || field.type === 'checkbox') {
        emptyRecord[field.fieldName] = false;
      } else if (field.type === 'integer' || field.type === 'decimal') {
        emptyRecord[field.fieldName] = 0;
      } else {
        emptyRecord[field.fieldName] = '';
      }
    });

    setCurrentRecord(emptyRecord);
    setEditMode('add');
    setIsDirty(false);
  };

  const handleUpdate = () => {
    if (editMode !== 'view') return;
    setEditMode('update');
  };

  const handleCopy = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;

    const copiedRecord = { ...currentRecord };
    formConfig?.selectedFields.forEach(field => {
      if (field.keyfield) {
        copiedRecord[field.fieldName] = '';
      }
    });

    setCurrentRecord(copiedRecord);
    setEditMode('copy');
    setIsDirty(false);
  };

  const handleDelete = async () => {
    if (editMode !== 'view') return;
    if (!confirm(`Datensatz wirklich löschen?`)) return;

    try {
      const tables = Array.from(new Set(formConfig!.selectedFields.map(f => getTableFromFieldName(f.fieldName)).filter(Boolean)));
      const tableName = tables[0];

      const keyFields = formConfig!.selectedFields.filter(f => f.keyfield);
      const keyParams = keyFields.map(f => `${f.fieldName}=${currentRecord[f.fieldName]}`).join('&');

      await apiDelete(`/formprogram?table=${tableName}&company=${selectedCompany}&user=${selectedUser}&language_id=${selectedLanguage}&${keyParams}`);

      alert('Datensatz erfolgreich gelöscht');
      await loadRecords(formConfig!);

      if (records.length > 1) {
        setCurrentIndex(0);
        setCurrentRecord(records[0]);
      }
    } catch (err) {
      alert('Fehler beim Löschen des Datensatzes');
    }
  };

  const handleSave = async () => {
    try {
      const tables = Array.from(new Set(formConfig!.selectedFields.map(f => getTableFromFieldName(f.fieldName)).filter(Boolean)));
      const tableName = tables[0];

      if (editMode === 'add' || editMode === 'copy') {
        await apiPost('/formprogram', {
          table: tableName,
          company: selectedCompany,
          user: selectedUser,
          language_id: selectedLanguage,
          record: currentRecord
        });
        alert('Datensatz erfolgreich erstellt');
      } else if (editMode === 'update') {
        const keyFields = formConfig!.selectedFields.filter(f => f.keyfield);
        const keyParams = keyFields.map(f => `${f.fieldName}=${currentRecord[f.fieldName]}`).join('&');

        await apiPatch(`/formprogram?table=${tableName}&company=${selectedCompany}&user=${selectedUser}&language_id=${selectedLanguage}&${keyParams}`, {
          record: currentRecord
        });
        alert('Datensatz erfolgreich aktualisiert');
      }

      await loadRecords(formConfig!);
      setEditMode('view');
      setIsDirty(false);
    } catch (err) {
      alert('Fehler beim Speichern des Datensatzes');
    }
  };

  const handleCancel = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;

    if (editMode === 'add' || editMode === 'copy') {
      if (records.length > 0) {
        setCurrentRecord(records[0]);
        setCurrentIndex(0);
      } else {
        setCurrentRecord({});
      }
    } else {
      setCurrentRecord(records[currentIndex]);
    }

    setEditMode('view');
    setIsDirty(false);
  };

  const handleFirst = () => {
    if (currentIndex === 0 || records.length === 0) return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    setCurrentIndex(0);
    setCurrentRecord(records[0]);
    setIsDirty(false);
  };

  const handlePrevious = () => {
    if (currentIndex === 0 || records.length === 0) return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    setCurrentRecord(records[newIndex]);
    setIsDirty(false);
  };

  const handleNext = () => {
    if (currentIndex >= records.length - 1 || records.length === 0) return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    setCurrentRecord(records[newIndex]);
    setIsDirty(false);
  };

  const handleLast = () => {
    if (currentIndex >= records.length - 1 || records.length === 0) return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    const newIndex = records.length - 1;
    setCurrentIndex(newIndex);
    setCurrentRecord(records[newIndex]);
    setIsDirty(false);
  };

  const handleRowClick = (record: RecordData, index: number) => {
    if (editMode !== 'view') return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    setCurrentIndex(index);
    setCurrentRecord(record);
    setIsDirty(false);
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setCurrentRecord(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setIsDirty(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const form = formRef.current;
      if (!form) return;

      const focusableElements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
        )
      );

      const currentIndex = focusableElements.indexOf(e.currentTarget as HTMLElement);
      if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
      }
    }
  };

  const renderField = (field: Field) => {
    const value = currentRecord[field.fieldName] ?? '';
    const isDisabled = editMode === 'view' || !field.editable;
    const inputClassName = 'input-field';

    if (field.type === 'textarea') {
      return (
        <textarea
          name={field.fieldName}
          value={value}
          onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={field.placeholder}
          className="textarea-field"
          rows={3}
          style={{ textAlign: field.align || 'left' }}
        />
      );
    }

    if (field.type === 'checkbox' || field.type === 'logical') {
      return (
        <input
          type="checkbox"
          name={field.fieldName}
          checked={!!value}
          onChange={(e) => handleFieldChange(field.fieldName, e.target.checked)}
          disabled={isDisabled}
          className="checkbox"
        />
      );
    }

    if (field.type === 'select') {
      const options = selectOptions[field.fieldName] || [];
      return (
        <select
          name={field.fieldName}
          value={value}
          onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className="select-field"
        >
          <option value="">-- Bitte wählen --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          name={field.fieldName}
          value={value}
          onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className={inputClassName}
        />
      );
    }

    if (field.type === 'integer') {
      if (field.showSpinner) {
        return (
          <input
            type="number"
            step="1"
            name={field.fieldName}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={field.placeholder}
            className={inputClassName}
            style={{ textAlign: field.align || 'right' }}
          />
        );
      } else {
        return (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name={field.fieldName}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={inputClassName}
            style={{ textAlign: field.align || 'right' }}
          />
        );
      }
    }

    if (field.type === 'decimal') {
      if (field.showSpinner) {
        return (
          <input
            type="number"
            step="0.01"
            name={field.fieldName}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={field.placeholder}
            className={inputClassName}
            style={{ textAlign: field.align || 'right' }}
          />
        );
      } else {
        return (
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.,]*"
            name={field.fieldName}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={inputClassName}
            style={{ textAlign: field.align || 'right' }}
          />
        );
      }
    }

    return (
      <input
        type={field.password ? 'password' : 'text'}
        name={field.fieldName}
        value={value}
        onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        className={inputClassName}
        style={{ textAlign: field.align || 'left' }}
      />
    );
  };

  if (isLoading && companies.length === 0) {
    return (
      <BaseLayout title="Form Program" showUserInfo={true} showNavigation={false}>
        <div className="container-app">
          <div className="card text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Initial-Daten...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  const tableFields = formConfig?.selectedFields.filter(f => f.showInTable && !f.hidden) || [];
  const hasTableView = tableFields.length > 0;

  return (
    <BaseLayout title="Form Program" showUserInfo={true} showNavigation={false}>
      <div className="container-app">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Form Program</h1>

        <div className="card mb-6">
          <div className="card-header">
            <h2>Formular laden</h2>
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
                  {companies.map((c) => (
                    <option key={c.company} value={c.company}>
                      {c.company_name}
                    </option>
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
                  {users.map((u) => (
                    <option key={u.user_name} value={u.user_name}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sprache</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Auswählen --</option>
                  {languages.map((l) => (
                    <option key={l.language_id} value={String(l.language_id)}>
                      {l.language_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Form-ID</label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="input-field"
                  placeholder="z.B. user_form"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <button onClick={loadFormConfiguration} className="btn btn-primary">
                  Formular laden
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="card mb-6">
            <div className="card-body text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Fehler</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        )}

        {isLoaded && formConfig && (
          <>
            <div className="card mb-6">
              <div className="card-header flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {formConfig.formTitle}
                  {editMode === 'add' && ' - Neuer Datensatz'}
                  {editMode === 'copy' && ' - Datensatz kopieren'}
                  {editMode === 'update' && ' - Datensatz bearbeiten'}
                  {editMode === 'view' && records.length > 0 && ` - Datensatz ${currentIndex + 1} von ${records.length}`}
                  {editMode === 'view' && records.length === 0 && ' - Keine Datensätze'}
                </h2>

                <div className="flex gap-2">
                  {editMode === 'view' && (
                    <>
                      <button onClick={handleAdd} className="btn btn-success flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Neu
                      </button>
                      <button onClick={handleUpdate} className="btn btn-primary flex items-center gap-2" disabled={records.length === 0}>
                        <Edit2 className="w-4 h-4" />
                        Bearbeiten
                      </button>
                      <button onClick={handleCopy} className="btn btn-info flex items-center gap-2" disabled={records.length === 0}>
                        <Copy className="w-4 h-4" />
                        Kopieren
                      </button>
                      <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2" disabled={records.length === 0}>
                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    </>
                  )}

                  {editMode !== 'view' && (
                    <>
                      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Speichern
                      </button>
                      <button onClick={handleCancel} className="btn btn-secondary flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Abbrechen
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6">
                <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--spacing-sm)',
                      alignItems: 'flex-start',
                      width: '100%'
                    }}
                  >
                    {formConfig.selectedFields
                      .filter(f => !f.hidden)
                      .map((field) => (
                        <React.Fragment key={field.uniqueId}>
                          {field.newLine && <div className="flex-break" />}

                          {field.separator && (
                            <>
                              <div className="flex-break" />
                              <hr
                                style={{
                                  flexBasis: '100%',
                                  border: 'none',
                                  borderTop: '2px solid var(--color-gray-300)',
                                  margin: 'var(--spacing-lg) 0'
                                }}
                              />
                              <div className="flex-break" />
                            </>
                          )}

                          <div
                            style={{
                              flex: field.width || field.widthInChars ? '0 0 auto' : '1 1 auto',
                              width: field.width
                                ? `${field.width}%`
                                : field.widthInChars
                                  ? `${field.widthInChars}ch`
                                  : 'auto',
                              maxWidth: '100%',
                              minWidth: field.width
                                ? undefined
                                : field.widthInChars
                                  ? `${field.widthInChars}ch`
                                  : '200px',
                              boxSizing: 'border-box'
                            }}
                            className="form-group"
                          >
                            <label className="label">
                              {field.label}
                              {field.required && (
                                <span style={{ color: 'var(--color-red-600)', marginLeft: '2px' }}>*</span>
                              )}
                              {field.keyfield && (
                                <span style={{ color: 'var(--color-blue-500)', marginLeft: '4px', fontSize: '0.75rem' }}>
                                  (Key)
                                </span>
                              )}
                              {!field.editable && (
                                <span style={{ color: 'var(--color-gray-500)', marginLeft: '4px', fontSize: '0.875rem' }}>
                                  (ReadOnly)
                                </span>
                              )}
                            </label>

                            {renderField(field)}

                            {field.maxLength && field.editable && field.type !== 'integer' && field.type !== 'decimal' && (
                              <p
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--color-gray-500)',
                                  marginTop: '4px',
                                  marginBottom: 0
                                }}
                              >
                                Max. {field.maxLength} Zeichen
                              </p>
                            )}
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                </form>
              </div>

              {editMode === 'view' && (
                <div className="border-t p-4">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleFirst}
                      disabled={currentIndex === 0 || records.length === 0}
                      className="btn btn-secondary"
                      title="Erster Datensatz"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0 || records.length === 0}
                      className="btn btn-secondary"
                      title="Vorheriger Datensatz"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex >= records.length - 1 || records.length === 0}
                      className="btn btn-secondary"
                      title="Nächster Datensatz"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleLast}
                      disabled={currentIndex >= records.length - 1 || records.length === 0}
                      className="btn btn-secondary"
                      title="Letzter Datensatz"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasTableView && (
              <div className="card">
                <div className="card-header">
                  <h2 className="text-xl font-semibold">Alle Datensätze ({records.length})</h2>
                </div>
                <div className="table-container table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        {tableFields.map(field => (
                          <th
                            key={field.uniqueId}
                            style={{
                              textAlign: field.align || 'left',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {field.label}
                            {field.keyfield && (
                              <span style={{ marginLeft: '4px', color: 'var(--color-red-600)' }}>🔑</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={tableFields.length} className="px-4 py-8 text-center text-gray-500">
                            Keine Datensätze vorhanden
                          </td>
                        </tr>
                      ) : (
                        records.map((record, index) => (
                          <tr
                            key={index}
                            onClick={() => handleRowClick(record, index)}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              index === currentIndex && editMode === 'view' ? 'bg-blue-50' : ''
                            }`}
                          >
                            {tableFields.map(field => (
                              <td
                                key={field.uniqueId}
                                style={{ textAlign: field.align || 'left' }}
                              >
                                {field.type === 'checkbox' || field.type === 'logical' ? (
                                  <input
                                    type="checkbox"
                                    checked={!!record[field.fieldName]}
                                    disabled
                                    className="checkbox"
                                  />
                                ) : (
                                  record[field.fieldName]
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default FormProgram;