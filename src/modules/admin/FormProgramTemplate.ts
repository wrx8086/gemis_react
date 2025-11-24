// FormProgramTemplate.ts - Finale Version mit Server-Pagination

export const generateFormProgramCode = (config: {
  componentName: string;
  formTitle: string;
  formId: string;
  targetCompany: string;
  targetUser: string;
  targetLanguageId: string;
  fields: any[];
}) => {
  const fieldsJson = JSON.stringify(config.fields, null, 2);

  return `import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Plus, Copy, Trash2, X,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Edit2, AlertCircle, ArrowUp, ArrowDown, Search
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSession } from '../../contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

const ${config.componentName} = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const FORM_ID = '${config.formId}';
  const FORM_TITLE = '${config.formTitle}';
  const TARGET_COMPANY = '${config.targetCompany}';
  const TARGET_USER = '${config.targetUser}';
  const TARGET_LANGUAGE_ID = '${config.targetLanguageId}';
  const FORM_CONFIG = ${fieldsJson};

  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mutationMode, setMutationMode] = useState('view');
  const [isDirty, setIsDirty] = useState(false);
  const [selectOptions, setSelectOptions] = useState({});
  const [selectOptionsFix, setSelectOptionsFix] = useState({});
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTermRef = useRef('');
  const [columnFilters, setColumnFilters] = useState({});
  const [columnFiltersTemp, setColumnFiltersTemp] = useState({});
  const columnFiltersRef = useRef({});
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceReload, setForceReload] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const inputRefs = useRef({});
  const searchInputRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Keyboard Navigation für Tabelle (↑↓)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mutationMode !== 'view' || records.length === 0) return;
      
      // Nur reagieren wenn kein Input fokussiert ist
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
        return;
      }
      
      const filteredRecords = getFilteredAndSortedRecords();
      if (filteredRecords.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Finde aktuellen Index in gefilterten Records
        const currentFilteredIndex = filteredRecords.findIndex(r => {
          const keyFields = FORM_CONFIG.filter(f => f.keyfield);
          return keyFields.every(kf => r[kf.fieldName] === currentRecord[kf.fieldName]);
        });
        
        if (currentFilteredIndex < filteredRecords.length - 1) {
          const nextRecord = filteredRecords[currentFilteredIndex + 1];
          setCurrentRecord(nextRecord);
          // Finde Index im Original-Array
          const originalIndex = records.findIndex(r => {
            const keyFields = FORM_CONFIG.filter(f => f.keyfield);
            return keyFields.every(kf => r[kf.fieldName] === nextRecord[kf.fieldName]);
          });
          setCurrentIndex(originalIndex);
          
          // Scroll zur Zeile
          setTimeout(() => {
            const keyFields = FORM_CONFIG.filter(f => f.keyfield);
            const rowId = keyFields.map(kf => nextRecord[kf.fieldName]).join('-');
            const rowElement = document.getElementById(\`row-\${rowId}\`);
            if (rowElement) {
              rowElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
          }, 10);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Finde aktuellen Index in gefilterten Records
        const currentFilteredIndex = filteredRecords.findIndex(r => {
          const keyFields = FORM_CONFIG.filter(f => f.keyfield);
          return keyFields.every(kf => r[kf.fieldName] === currentRecord[kf.fieldName]);
        });
        
        if (currentFilteredIndex > 0) {
          const prevRecord = filteredRecords[currentFilteredIndex - 1];
          setCurrentRecord(prevRecord);
          // Finde Index im Original-Array
          const originalIndex = records.findIndex(r => {
            const keyFields = FORM_CONFIG.filter(f => f.keyfield);
            return keyFields.every(kf => r[kf.fieldName] === prevRecord[kf.fieldName]);
          });
          setCurrentIndex(originalIndex);
          
          // Scroll zur Zeile
          setTimeout(() => {
            const keyFields = FORM_CONFIG.filter(f => f.keyfield);
            const rowId = keyFields.map(kf => prevRecord[kf.fieldName]).join('-');
            const rowElement = document.getElementById(\`row-\${rowId}\`);
            if (rowElement) {
              rowElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
          }, 10);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mutationMode, records, currentRecord, columnFiltersTemp, sortField, sortDirection]);

  useEffect(() => { 
    if (!isInitialized) {
      loadInit();
    }
  }, []);

  useEffect(() => { 
    if (isInitialized) {
      loadRecords(); 
    }
  }, [currentPage, isInitialized, forceReload]);

  // Separate useEffect für Sort bei mehreren Seiten
  useEffect(() => {
    if (isInitialized && totalPages > 1) {
      loadRecords();
    }
  }, [sortField, sortDirection]);

  const loadInit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'init'
      });

      const data = await apiGet('/dynamic-form', params);
      
      if (data.selectOptionsFix) setSelectOptionsFix(data.selectOptionsFix);
      if (data.selectOptions) setSelectOptions(data.selectOptions);
      
      setIsInitialized(true);
    } catch (err) {
      setError(\`Fehler beim Initialisieren: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
      setIsLoading(false);
    }
  };

  const loadRecords = async (pageOverride) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const pageToLoad = pageOverride !== undefined ? pageOverride : currentPage;
      
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'loaddata',
        page: String(pageToLoad),
        limit: String(itemsPerPage)
      });
      
      // Suche hinzufügen
      if (searchTermRef.current.trim()) {
        params.append('search', searchTermRef.current.trim());
      }
      
      // Sortierung hinzufügen
      if (sortField) {
        params.append('sortField', sortField);
        params.append('sortDirection', sortDirection);
      }
      
      // Filter hinzufügen
      Object.keys(columnFiltersRef.current).forEach(key => {
        if (columnFiltersRef.current[key]) {
          params.append(\`filter_\${key}\`, columnFiltersRef.current[key]);
        }
      });

      const data = await apiGet('/dynamic-form', params);
      
      if (data.selectOptionsFix) setSelectOptionsFix(data.selectOptionsFix);
      if (data.selectOptions) setSelectOptions(data.selectOptions);
      
      if (data.records && Array.isArray(data.records)) {
        setRecords(data.records);
        setTotalRecords(data.maxRecords || data.records.length);
        setTotalPages(data.pageCount || Math.ceil((data.maxRecords || data.records.length) / itemsPerPage));
        
        if (data.records.length > 0) {
          setCurrentRecord(data.records[0]);
          setCurrentIndex(0);
        }
      } else {
        setRecords([]);
        setCurrentRecord({});
        setCurrentIndex(0);
        setTotalRecords(0);
        setTotalPages(0);
      }

      setIsLoading(false);
    } catch (err) {
      setError(\`Fehler beim Laden: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    const emptyRecord = {};
    FORM_CONFIG.forEach(field => {
      if (field.type === 'select') emptyRecord[field.fieldName] = '';
      else if (field.type === 'logical' || field.type === 'checkbox') emptyRecord[field.fieldName] = false;
      else if (field.type === 'integer' || field.type === 'decimal') emptyRecord[field.fieldName] = 0;
      else emptyRecord[field.fieldName] = '';
    });
    setCurrentRecord(emptyRecord);
    setMutationMode('add');
    setIsDirty(false);
  };

  const handleEdit = () => {
    if (records.length === 0) return;
    setMutationMode('edit');
  };

  const handleCopy = () => {
    if (records.length === 0) return;
    setCurrentRecord({ ...currentRecord });
    setMutationMode('copy');
    setIsDirty(false);
  };

  const handleSave = async () => {
    try {
      const params = new URLSearchParams({ formId: FORM_ID });
      
      if (mutationMode === 'add' || mutationMode === 'copy') {
        params.append('function', 'create');
        await apiPost(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
      } else if (mutationMode === 'edit') {
        params.append('function', 'update');
        await apiPatch(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
      }
      
      await loadRecords();
      setMutationMode('view');
      setIsDirty(false);
    } catch (err) {
      alert(\`Fehler beim Speichern: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
    }
  };

  const handleDelete = async () => {
    if (records.length === 0) return;
    if (!confirm('Datensatz wirklich löschen?')) return;
    
    try {
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'delete'
      });
      await apiDelete(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
      await loadRecords();
      setMutationMode('view');
    } catch (err) {
      alert(\`Fehler beim Löschen: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
    }
  };

  const handleCancel = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    if (mutationMode === 'add' || mutationMode === 'copy') {
      if (records.length > 0) setCurrentRecord(records[currentIndex]);
      else setCurrentRecord({});
    } else {
      setCurrentRecord(records[currentIndex]);
    }
    setMutationMode('view');
    setIsDirty(false);
  };

  const handleFieldChange = (fieldName, value) => {
    setCurrentRecord(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const fieldIds = FORM_CONFIG.filter(f => !f.hidden && f.editable).map(f => f.uniqueId);
      const currentIdx = fieldIds.indexOf(field.uniqueId);
      const nextIdx = currentIdx + 1;
      if (nextIdx < fieldIds.length) {
        const nextInput = inputRefs.current[fieldIds[nextIdx]];
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleSort = (fieldName) => {
    if (totalPages <= 1) {
      // Nur 1 Seite: Nur clientseitig sortieren
      if (sortField === fieldName) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(fieldName);
        setSortDirection('asc');
      }
    } else {
      // Mehrere Seiten: Backend-Request
      if (sortField === fieldName) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(fieldName);
        setSortDirection('asc');
      }
      setCurrentPage(1); // Triggert loadRecords() via useEffect
    }
  };

  const handleFilterChange = (fieldName, value) => {
    setColumnFiltersTemp(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleFilterKeyDown = async (e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // IMMER Backend-Request bei ENTER (Server-Pagination)
      const newFilters = { ...columnFiltersTemp };
      columnFiltersRef.current = newFilters;
      setColumnFilters(newFilters);
      setCurrentPage(1);
      
      // Direkt laden - die ref ist bereits aktualisiert
      await loadRecords(1);
    }
  };

  const getFilteredAndSortedRecords = () => {
    let filtered = [...records];
    
    // Clientseitiges Filtern mit TEMP-Filtern (live während Eingabe)
    filtered = filtered.filter(record => {
      return Object.keys(columnFiltersTemp).every(fieldName => {
        const filterValue = columnFiltersTemp[fieldName];
        if (!filterValue) return true;
        const recordValue = String(record[fieldName] || '').toLowerCase();
        return recordValue.includes(filterValue.toLowerCase());
      });
    });

    // Clientseitiges Sortieren
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === bVal) return 0;
        if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
    }
    
    return filtered;
  };

  const handleSearchToggle = () => {
    if (!searchExpanded) {
      // Beim Öffnen: Filter zurücksetzen
      columnFiltersRef.current = {};
      setColumnFilters({});
      setColumnFiltersTemp({});
      setSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      // Beim Schließen: Suche zurücksetzen und alle Daten laden
      setSearchExpanded(false);
      if (searchTermRef.current) {
        searchTermRef.current = '';
        setSearchTerm('');
        setCurrentPage(1);
        loadRecords(1);
      }
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    // Ref aktualisieren und Backend-Request
    searchTermRef.current = searchTerm;
    setCurrentPage(1);
    await loadRecords(1);
  };

  const handleRowClick = (record) => {
    if (mutationMode !== 'view') return;
    const index = records.findIndex(r => {
      const keyFields = FORM_CONFIG.filter(f => f.keyfield);
      return keyFields.every(kf => r[kf.fieldName] === record[kf.fieldName]);
    });
    if (index !== -1) {
      setCurrentIndex(index);
      setCurrentRecord(record);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const tableFields = FORM_CONFIG.filter(f => f.showInTable !== false);

  if (isLoading) {
    return (
      <BaseLayout title={FORM_TITLE} showUserInfo={true}>
        <div className="container-app">
          <div className="spinner"></div>
          <p>Lade Daten...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title={FORM_TITLE} showUserInfo={true}>
      <style>{\`
        .form-compact .form-group { margin-bottom: 0.5rem; }
        .form-compact .input-field,
        .form-compact .select-field { height: 32px; padding: 4px 8px; font-size: 14px; }
        .form-compact .label { margin-bottom: 2px; font-size: 13px; }
        
        .table-scroll { 
          max-height: 250px; 
          overflow-y: auto; 
          overflow-x: auto;
          position: relative;
        }
        .table-scroll thead th { 
          position: sticky; 
          top: 0; 
          background: white; 
          z-index: 10;
          box-shadow: 0 1px 0 0 var(--color-gray-300);
        }
        .table-scroll tbody tr {
          scroll-margin-top: 80px;
        }
        .table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .table-scroll::-webkit-scrollbar-track {
          background: var(--color-gray-100);
        }
        .table-scroll::-webkit-scrollbar-thumb {
          background: var(--color-gray-400);
          border-radius: 4px;
        }
        .table-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-gray-500);
        }
      \`}</style>
      <div className="container-app">
        <div className="card mb-4">
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', width: '100%' }}>
              {mutationMode === 'view' ? (
                <>
                  <button onClick={handleAdd} className="btn btn-success flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Neu
                  </button>
                  <button onClick={handleEdit} className="btn btn-primary flex items-center gap-2" disabled={records.length === 0}>
                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  <button onClick={handleCopy} className="btn btn-warning flex items-center gap-2" disabled={records.length === 0}>
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </button>
                  <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2" disabled={records.length === 0}>
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                  <button onClick={handleSearchToggle} className="btn btn-secondary flex items-center gap-2" title="Suche">
                    <Search className="w-4 h-4" />
                  </button>
                  {searchExpanded && (
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearchSubmit}
                      placeholder="Suche... (Enter)"
                      className="input-field"
                      style={{ width: '250px', transition: 'width 0.3s ease' }}
                    />
                  )}
                </>
              ) : (
                <>
                  <button onClick={handleSave} className="btn btn-success flex items-center gap-2">
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

          <div className="p-4 form-compact">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                {FORM_CONFIG.filter(f => !f.hidden).map((field) => {
                  const isDisabled = mutationMode === 'view' || !field.editable || (mutationMode === 'edit' && field.keyfield);
                  const value = currentRecord[field.fieldName] ?? '';
                  return (
                    <React.Fragment key={field.uniqueId}>
                      {field.newLine && <div className="flex-break" />}
                      {field.separator && (
                        <>
                          <div className="flex-break" />
                          <hr style={{ flexBasis: '100%', border: 'none', borderTop: '1px solid var(--color-gray-300)', margin: '0.5rem 0' }} />
                          <div className="flex-break" />
                        </>
                      )}
                      <div style={{
                        flex: field.width || field.widthInChars ? '0 0 auto' : '1 1 auto',
                        width: field.width ? \`\${field.width}%\` : field.widthInChars ? \`\${field.widthInChars}ch\` : 'auto',
                        maxWidth: '100%',
                        minWidth: field.width ? undefined : field.widthInChars ? \`\${field.widthInChars}ch\` : '200px',
                        boxSizing: 'border-box'
                      }} className="form-group">
                        <label className="label">
                          {field.label}
                          {field.required && <span className="required-indicator">*</span>}
                          {field.keyfield && <span className="keyfield-indicator">(Key)</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            ref={(el) => (inputRefs.current[field.uniqueId] = el)}
                            name={field.fieldName}
                            value={value}
                            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled}
                            className="select-field"
                            style={{ textAlign: field.align || 'left' }}
                          >
                            <option value="">-- Bitte wählen --</option>
                            {(selectOptionsFix[field.fieldName] || selectOptions[field.fieldName] || []).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'logical' || field.type === 'checkbox' ? (
                          <input
                            ref={(el) => (inputRefs.current[field.uniqueId] = el)}
                            type="checkbox"
                            name={field.fieldName}
                            checked={!!value}
                            onChange={(e) => handleFieldChange(field.fieldName, e.target.checked)}
                            disabled={isDisabled}
                            className="checkbox"
                          />
                        ) : (
                          <input
                            ref={(el) => (inputRefs.current[field.uniqueId] = el)}
                            type={field.password ? 'password' : field.type === 'date' ? 'date' : field.type === 'integer' || field.type === 'decimal' ? 'number' : 'text'}
                            name={field.fieldName}
                            value={value}
                            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className="input-field"
                            style={{ textAlign: field.align || 'left' }}
                            autoComplete={
                              field.password ? 'current-password' :
                              field.fieldName.includes('user_name') || field.fieldName.includes('username') ? 'username' :
                              field.fieldName.includes('email') ? 'email' :
                              field.fieldName.includes('tel') || field.fieldName.includes('phone') ? 'tel' :
                              'off'
                            }
                          />
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </form>
          </div>

          {mutationMode === 'view' && records.length > 0 && (
            <div className="border-t p-2">
              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setCurrentRecord(records[currentIndex - 1]); } }}
                  disabled={currentIndex === 0}
                  className="btn btn-secondary" 
                  title="Vorheriger Datensatz"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '14px' }}>
                  Datensatz {currentIndex + 1} von {records.length}
                </span>
                <button 
                  onClick={() => { if (currentIndex < records.length - 1) { setCurrentIndex(currentIndex + 1); setCurrentRecord(records[currentIndex + 1]); } }}
                  disabled={currentIndex >= records.length - 1}
                  className="btn btn-secondary" 
                  title="Nächster Datensatz"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="card mb-4">
            <div className="card-body text-center py-8">
              <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body">
            <div className="table-container table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    {tableFields.map(field => (
                      <th key={field.uniqueId} onClick={() => handleSort(field.fieldName)} style={{ textAlign: field.align || 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                        <div className="flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.keyfield && <span className="text-danger">🔑</span>}
                          {sortField === field.fieldName && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {tableFields.map(field => (
                      <th key={\`filter-\${field.uniqueId}\`} style={{ padding: '4px' }}>
                        <input
                          type="text"
                          value={columnFiltersTemp[field.fieldName] || ''}
                          onChange={(e) => handleFilterChange(field.fieldName, e.target.value)}
                          onKeyDown={(e) => handleFilterKeyDown(e, field.fieldName)}
                          placeholder="Filter... (Enter)"
                          className="input-field"
                          style={{ width: '100%', fontSize: '12px', padding: '4px 8px', minWidth: '80px' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedRecords().length === 0 ? (
                    <tr><td colSpan={tableFields.length} className="px-4 py-8 text-center text-gray-500">Keine Datensätze</td></tr>
                  ) : (
                    getFilteredAndSortedRecords().map((record, index) => {
                      const isCurrentRecord = FORM_CONFIG.filter(f => f.keyfield).every(kf => record[kf.fieldName] === currentRecord[kf.fieldName]);
                      const keyFields = FORM_CONFIG.filter(f => f.keyfield);
                      const rowId = keyFields.map(kf => record[kf.fieldName]).join('-');
                      return (
                        <tr 
                          key={index} 
                          id={\`row-\${rowId}\`}
                          onClick={() => handleRowClick(record)} 
                          className={\`cursor-pointer hover:bg-gray-50 \${isCurrentRecord && mutationMode === 'view' ? 'table-row-active' : ''}\`}
                        >
                          {tableFields.map(field => (
                            <td key={field.uniqueId} style={{ textAlign: field.align || 'left' }}>
                              {field.type === 'checkbox' || field.type === 'logical' ? (
                                <input type="checkbox" checked={!!record[field.fieldName]} disabled className="checkbox" />
                              ) : (
                                record[field.fieldName]
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="card-footer" style={{ padding: '8px 16px', borderTop: '1px solid var(--color-gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center' }}>
                <button 
                  onClick={() => handlePageChange(1)} 
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                  title="Erste Seite"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                  title="Vorherige Seite"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {getPageNumbers().map((page, idx) => 
                  page === '...' ? (
                    <span key={\`ellipsis-\${idx}\`} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={\`btn \${currentPage === page ? 'btn-primary' : 'btn-secondary'}\`}
                      style={{ padding: '4px 12px', minWidth: '40px' }}
                    >
                      {page}
                    </button>
                  )
                )}
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                  title="Nächste Seite"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handlePageChange(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px' }}
                  title="Letzte Seite"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
                
                <span style={{ marginLeft: '16px', fontSize: '14px', color: 'var(--color-gray-600)' }}>
                  Seite {currentPage} von {totalPages} ({totalRecords} Datensätze)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

export default ${config.componentName};`;
};