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
  const skipNextLoadRef = useRef(false);
  const [keyfieldValues, setKeyfieldValues] = useState({});
  const keyfieldValuesRef = useRef({});

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
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        return;
      }
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
      
      // Initiale Werte für Select-Felder setzen (erster Wert als Default)
      const initialValues = {};
      const allOptions = { ...data.selectOptionsFix, ...data.selectOptions };
      FORM_CONFIG.forEach(field => {
        if (field.type === 'select' && allOptions[field.fieldName]?.length > 0) {
          initialValues[field.fieldName] = allOptions[field.fieldName][0].value;
        }
      });
      
      // Speichere initiale Werte für loadRecords (State für UI, Ref für API-Calls)
      if (Object.keys(initialValues).length > 0) {
        keyfieldValuesRef.current = initialValues;
        setKeyfieldValues(initialValues);
      }
      
      setIsInitialized(true);
    } catch (err) {
      setError(\`Fehler beim Initialisieren: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
      setIsLoading(false);
    }
  };

  const loadRecords = async (pageOverride, skipSelect, isChange) => {
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
      
      // Keyfield-Werte hinzufügen (aus keyfieldValuesRef)
      FORM_CONFIG.filter(f => f.keyfield && f.type === 'select').forEach(field => {
        const value = keyfieldValuesRef.current[field.fieldName];
        if (value !== undefined && value !== '') {
          params.append('keyfield_' + field.fieldName, String(value));
        }
      });
      
      // Bei Keyfield-Änderung: change=yes Parameter hinzufügen
      if (isChange) {
        params.append('change', 'yes');
      }

      const data = await apiGet('/dynamic-form', params);
      
      if (data.selectOptionsFix) setSelectOptionsFix(data.selectOptionsFix);
      if (data.selectOptions) setSelectOptions(data.selectOptions);
      
      if (data.records && Array.isArray(data.records)) {
        setRecords(data.records);
        setTotalRecords(data.maxRecords || data.records.length);
        setTotalPages(data.pageCount || Math.ceil((data.maxRecords || data.records.length) / itemsPerPage));
        
        // Nur automatisch selektieren wenn nicht skipSelect
        if (!skipSelect && data.records.length > 0) {
          setCurrentRecord(data.records[0]);
          setCurrentIndex(0);
        }
        
        setIsLoading(false);
        return data.records;
      } else {
        setRecords([]);
        if (!skipSelect) {
          setCurrentRecord({});
          setCurrentIndex(0);
        }
        setTotalRecords(0);
        setTotalPages(0);
        setIsLoading(false);
        return [];
      }
    } catch (err) {
      setError(\`Fehler beim Laden: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
      setIsLoading(false);
      return [];
    }
  };

  const focusFirstEditableField = () => {
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const firstInput = form.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
        if (firstInput) firstInput.focus();
      }
    }, 50);
  };

  const handleAdd = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    const newRecord = {};
    FORM_CONFIG.forEach(field => {
      if (field.type === 'select') {
        // Wert vom aktuellen Record übernehmen (falls vorhanden)
        newRecord[field.fieldName] = currentRecord[field.fieldName] ?? '';
      }
      else if (field.type === 'logical' || field.type === 'checkbox') newRecord[field.fieldName] = false;
      else if (field.type === 'integer' || field.type === 'decimal') newRecord[field.fieldName] = 0;
      else newRecord[field.fieldName] = '';
    });
    setCurrentRecord(newRecord);
    setMutationMode('add');
    setIsDirty(false);
    focusFirstEditableField();
  };

  const handleEdit = () => {
    if (records.length === 0) return;
    setMutationMode('edit');
    focusFirstEditableField();
  };

  const handleCopy = () => {
    if (records.length === 0) return;
    setCurrentRecord({ ...currentRecord });
    setMutationMode('copy');
    setIsDirty(false);
    focusFirstEditableField();
  };

  const handleSave = async () => {
    try {
      const params = new URLSearchParams({ formId: FORM_ID });
      
      // Select-Keyfield-Werte hinzufügen
      FORM_CONFIG.filter(f => f.keyfield && f.type === 'select').forEach(field => {
        const value = keyfieldValuesRef.current[field.fieldName];
        if (value !== undefined && value !== '') {
          params.append('keyfield_' + field.fieldName, String(value));
        }
      });
      
      if (mutationMode === 'add' || mutationMode === 'copy') {
        params.append('function', 'create');
        const response = await apiPost(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
        
        // Fehlerbehandlung
        if (response.success === false) {
          alert(response.message || 'Fehler beim Erstellen');
          return;
        }
        
        // Smart Jump: Backend gibt Position des neuen Datensatzes zurück
        if (response.position) {
          const { page, index, totalRecords } = response.position;
          
          // Update Pagination Info
          setTotalRecords(totalRecords);
          setTotalPages(Math.ceil(totalRecords / itemsPerPage));
          
          // Verhindere dass useEffect nochmal loadRecords aufruft
          skipNextLoadRef.current = true;
          setCurrentPage(page);
          
          // Lade Seite OHNE automatische Selektion
          const loadedRecords = await loadRecords(page, true);
          
          // Selektiere den neuen Datensatz am Index vom Backend
          if (loadedRecords && loadedRecords.length > index) {
            const newRecord = loadedRecords[index];
            setCurrentRecord(newRecord);
            setCurrentIndex(index);
            
            // Scroll zur Zeile in der Tabelle
            setTimeout(() => {
              const keyFields = FORM_CONFIG.filter(f => f.keyfield);
              const rowId = keyFields.map(kf => newRecord[kf.fieldName]).join('-');
              const rowElement = document.getElementById(\`row-\${rowId}\`);
              if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 50);
          }
        } else {
          // Fallback: Normale Reload
          await loadRecords();
        }
      } else if (mutationMode === 'edit') {
        params.append('function', 'update');
        const response = await apiPatch(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
        
        // Fehlerbehandlung
        if (response.success === false) {
          alert(response.message || 'Fehler beim Aktualisieren');
          return;
        }
        
        // Nach UPDATE: Nur den aktualisierten Datensatz im Array ersetzen
        if (response.record) {
          const updatedRecords = [...records];
          updatedRecords[currentIndex] = response.record;
          setRecords(updatedRecords);
          setCurrentRecord(response.record);
        }
      }
      
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
      const response = await apiDelete(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
      
      // Fehlerbehandlung
      if (response.success === false) {
        alert(response.message || 'Fehler beim Löschen');
        return;
      }
      
      // Smart Jump: Backend gibt Position zurück
      if (response.position) {
        const { page, index, totalRecords } = response.position;
        
        // Update Pagination Info
        setTotalRecords(totalRecords);
        setTotalPages(Math.ceil(totalRecords / itemsPerPage));
        
        // Verhindere dass useEffect nochmal loadRecords aufruft
        skipNextLoadRef.current = true;
        setCurrentPage(page);
        
        if (totalRecords === 0) {
          // Keine Datensätze mehr
          setRecords([]);
          setCurrentRecord({});
          setCurrentIndex(0);
        } else {
          // Lade Seite OHNE automatische Selektion
          const loadedRecords = await loadRecords(page, true);
          
          // Selektiere Datensatz am Index vom Backend
          let selectedRecord = null;
          if (loadedRecords && loadedRecords.length > index) {
            selectedRecord = loadedRecords[index];
            setCurrentRecord(selectedRecord);
            setCurrentIndex(index);
          } else if (loadedRecords && loadedRecords.length > 0) {
            // Fallback: letzter Datensatz der Seite
            selectedRecord = loadedRecords[loadedRecords.length - 1];
            setCurrentRecord(selectedRecord);
            setCurrentIndex(loadedRecords.length - 1);
          }
          
          // Scroll zur Zeile in der Tabelle
          if (selectedRecord) {
            setTimeout(() => {
              const keyFields = FORM_CONFIG.filter(f => f.keyfield);
              const rowId = keyFields.map(kf => selectedRecord[kf.fieldName]).join('-');
              const rowElement = document.getElementById(\`row-\${rowId}\`);
              if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 50);
          }
        }
      } else {
        // Fallback: Normale Reload
        await loadRecords();
      }
      
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

  const handleKeyfieldSelectChange = async (fieldName, value) => {
    // Aktualisiere Ref und State mit neuem Wert
    const newValues = { ...keyfieldValuesRef.current, [fieldName]: value };
    keyfieldValuesRef.current = newValues;
    setKeyfieldValues(newValues);
    
    // Lade Daten neu mit allen aktuellen Keyfield-Werten (change=yes)
    setCurrentPage(1);
    await loadRecords(1, false, true);
  };

  const handleChangeAction = async (fieldName, value, action) => {
    if (!action) return;
    
    try {
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'change',
        field: fieldName,
        action: action,
        value: String(value)
      });
      
      // Key-Felder als einzelne Parameter hinzufügen (keyfield_FELDNAME=WERT)
      FORM_CONFIG.filter(f => f.keyfield).forEach(keyField => {
        if (currentRecord[keyField.fieldName] !== undefined) {
          params.append('keyfield_' + keyField.fieldName, String(currentRecord[keyField.fieldName]));
        }
      });
      
      const data = await apiGet('/dynamic-form', params);
      
      // Backend kann neue selectOptions zurückliefern
      if (data.selectOptions) {
        setSelectOptions(prev => ({ ...prev, ...data.selectOptions }));
      }
      
      // Backend kann auch Feldwerte aktualisieren
      if (data.fieldUpdates) {
        setCurrentRecord(prev => ({ ...prev, ...data.fieldUpdates }));
      }
    } catch (err) {
      console.error('Change action error:', err);
    }
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const form = document.querySelector('form');
      if (!form) return;
      
      const focusableElements = Array.from(
        form.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')
      );
      
      const currentIndex = focusableElements.indexOf(e.target);
      if (currentIndex > -1) {
        if (currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        } else {
          // Letztes Feld - automatisch speichern wenn im Edit-Modus
          if (mutationMode !== 'view') {
            handleSave();
          }
        }
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

  const handleFilterKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // IMMER Backend-Request bei ENTER (Server-Pagination)
      const newFilters = { ...columnFiltersTemp };
      columnFiltersRef.current = newFilters;
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

    // Clientseitiges Sortieren (case-insensitive wie Backend)
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        
        // Für Zahlen: direkter Vergleich
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Für Strings: case-insensitive Vergleich
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (aStr === bStr) return 0;
        if (sortDirection === 'asc') return aStr > bStr ? 1 : -1;
        return aStr < bStr ? 1 : -1;
      });
    }
    
    return filtered;
  };

  const handleSearchToggle = () => {
    if (!searchExpanded) {
      // Beim Öffnen: Filter zurücksetzen
      columnFiltersRef.current = {};
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
      <BaseLayout title={FORM_TITLE} showUserInfo={true} footerRight={FORM_ID}>
        <div className="container-app">
          <div className="spinner"></div>
          <p>Lade Daten...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title={FORM_TITLE} showUserInfo={true} footerRight={FORM_ID}>
      <style>{\`
        .form-compact .form-group { margin-bottom: 0.5rem; }
        .form-compact .input-field,
        .form-compact .select-field { height: 32px; padding: 4px 8px; font-size: 14px; }
        .form-compact .label { margin-bottom: 2px; font-size: 13px; }
        
        /* Number-Input ohne Spinner */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
        
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
                  const isSelectKeyfield = field.type === 'select' && field.keyfield;
                  
                  // Disabled-Logik:
                  // - View: alles disabled, AUSSER Select-Keyfields
                  // - Edit: alle Keyfields disabled
                  // - Add/Copy: nur Select-Keyfields disabled (andere Keyfields editierbar)
                  const isDisabled = !field.editable || 
                    (mutationMode === 'view' && !isSelectKeyfield) ||
                    (mutationMode === 'edit' && field.keyfield) ||
                    ((mutationMode === 'add' || mutationMode === 'copy') && isSelectKeyfield);
                  
                  // Für Select-Keyfields: Wert aus Filter-State (View/Add/Copy), sonst aus Record
                  const value = (isSelectKeyfield && mutationMode !== 'edit') 
                    ? (keyfieldValues[field.fieldName] ?? '') 
                    : (currentRecord[field.fieldName] ?? '');
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
                            onChange={(e) => {
                              // Keyfield-Select im View-Modus: Daten neu laden
                              if (field.keyfield && mutationMode === 'view') {
                                handleKeyfieldSelectChange(field.fieldName, e.target.value);
                              } else {
                                handleFieldChange(field.fieldName, e.target.value);
                                if (field.onChangeAction) {
                                  handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
                                }
                              }
                            }}
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
                            onChange={(e) => {
                              handleFieldChange(field.fieldName, e.target.checked);
                              if (field.onChangeAction) {
                                handleChangeAction(field.fieldName, e.target.checked, field.onChangeAction);
                              }
                            }}
                            onKeyDown={(e) => handleKeyDown(e, field)}
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
                            onBlur={(e) => {
                              if (field.onChangeAction) {
                                handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
                              }
                            }}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className={\`input-field\${(field.type === 'integer' || field.type === 'decimal') && !field.showSpinner ? ' no-spinner' : ''}\`}
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
                          onKeyDown={handleFilterKeyDown}
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