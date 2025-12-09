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
  Edit2, AlertCircle, ArrowUp, ArrowDown, Search, FilterX
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
  const [isFiltered, setIsFiltered] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'activeOnly', 'inactiveOnly'
  const activeFilterRef = useRef('all');
  const [hasActiveField, setHasActiveField] = useState(false); // Wird von init gesetzt
  const searchTermRef = useRef('');
  const [columnFiltersTemp, setColumnFiltersTemp] = useState({});
  const columnFiltersRef = useRef({});
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceReload, setForceReload] = useState(0);
  
  // Neue States für erweiterte Funktionalität
  const [fieldErrors, setFieldErrors] = useState({});       // Feld-Validierungsfehler
  const [disabledFields, setDisabledFields] = useState([]); // Dynamisch deaktivierte Felder
  const [hiddenFields, setHiddenFields] = useState([]);     // Dynamisch versteckte Felder
  const [messageBox, setMessageBox] = useState(null);       // MessageBox State
  const messageBoxResolveRef = useRef(null);                // Promise-Resolver für MessageBox
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default 50, kann von init überschrieben werden
  const itemsPerPageRef = useRef(50);
  const [tableMaxHeight, setTableMaxHeight] = useState('250px'); // Default 250px, kann von init überschrieben werden
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const inputRefs = useRef({});
  const searchInputRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const skipNextLoadRef = useRef(false);
  const [keyfieldValues, setKeyfieldValues] = useState({});
  const keyfieldValuesRef = useRef({});
  const currentRecordRef = useRef({});
  const currentIndexRef = useRef(0);

  // Label aus Session holen mit optionalen Parametern
  const getLabel = (key, params) => {
    let text = session?.labels?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(\`\\\\{\${param}\\\\}\`, 'g'), String(value));
      });
    }
    return text;
  };

  // MessageBox anzeigen (Promise-basiert)
  const showMessage = (config) => {
    return new Promise((resolve) => {
      messageBoxResolveRef.current = resolve;
      setMessageBox({
        type: config.type || 'info',
        title: config.title || '',
        text: config.text || config.messageId ? getLabel(config.messageId, config.params) : '',
        params: config.params
      });
    });
  };

  // MessageBox schliessen
  const closeMessageBox = (result) => {
    if (messageBoxResolveRef.current) {
      messageBoxResolveRef.current(result);
      messageBoxResolveRef.current = null;
    }
    setMessageBox(null);
  };

  // Browser-Tab Titel setzen
  useEffect(() => {
    document.title = FORM_TITLE + ' - GeMIS';
    return () => {
      document.title = 'GeMIS';
    };
  }, []);

  // Refs synchron halten mit State
  useEffect(() => {
    currentRecordRef.current = currentRecord;
    currentIndexRef.current = currentIndex;
  }, [currentRecord, currentIndex]);

  // Keyboard Navigation für Tabelle (↑↓)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
      const isInFilterInput = isInInput && activeElement.closest('thead');
      
      // ESC: Suchfeld schließen wenn offen
      if (e.key === 'Escape' && searchExpanded) {
        e.preventDefault();
        setSearchExpanded(false);
        return;
      }
      
      // ESC: Abbruch im Edit/Add/Copy-Modus
      if (e.key === 'Escape' && mutationMode !== 'view') {
        e.preventDefault();
        handleCancel();
        return;
      }
      
      // Ab hier nur View-Modus
      if (mutationMode !== 'view' || records.length === 0) return;
      
      // Nicht reagieren wenn Input fokussiert ist (inkl. Filter) oder Suchfeld offen
      if (isInInput || isInFilterInput || searchExpanded) return;
      
      const filteredRecords = getFilteredAndSortedRecords();
      if (filteredRecords.length === 0) return;
      
      // CTRL+HOME: Zur ersten Zeile springen
      if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault();
        const firstRecord = filteredRecords[0];
        currentRecordRef.current = firstRecord;
        currentIndexRef.current = 0;
        setCurrentRecord(firstRecord);
        setCurrentIndex(0);
        
        setTimeout(() => {
          const rowElement = document.getElementById(\`row-0\`);
          if (rowElement) {
            scrollToRow(rowElement);
            rowElement.focus();
          }
        }, 10);
        return;
      }
      
      // CTRL+END: Zur letzten Zeile springen
      if (e.key === 'End' && e.ctrlKey) {
        e.preventDefault();
        const lastIndex = filteredRecords.length - 1;
        const lastRecord = filteredRecords[lastIndex];
        currentRecordRef.current = lastRecord;
        currentIndexRef.current = lastIndex;
        setCurrentRecord(lastRecord);
        setCurrentIndex(lastIndex);
        
        setTimeout(() => {
          const rowElement = document.getElementById(\`row-\${lastIndex}\`);
          if (rowElement) {
            scrollToRow(rowElement);
            rowElement.focus();
          }
        }, 10);
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        // In Edit-Modus wechseln mit aktuellem Datensatz aus Ref
        setCurrentRecord(currentRecordRef.current);
        setCurrentIndex(currentIndexRef.current);
        setMutationMode('edit');
        setTimeout(() => {
          const firstEditableField = FORM_CONFIG.find(f => f.editable && !f.hidden && !f.keyfield);
          if (firstEditableField && inputRefs.current[firstEditableField.uniqueId]) {
            inputRefs.current[firstEditableField.uniqueId].focus();
          }
        }, 50);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Finde aktuellen Index via Object-Referenz
        const currentFilteredIndex = filteredRecords.findIndex(r => r === currentRecordRef.current);
        
        if (currentFilteredIndex !== -1 && currentFilteredIndex < filteredRecords.length - 1) {
          const nextIndex = currentFilteredIndex + 1;
          const nextRecord = filteredRecords[nextIndex];
          // Refs SYNCHRON aktualisieren
          currentRecordRef.current = nextRecord;
          currentIndexRef.current = nextIndex;
          // State aktualisieren
          setCurrentRecord(nextRecord);
          setCurrentIndex(nextIndex);
          
          // Scroll zur Zeile und Focus setzen
          setTimeout(() => {
            const rowElement = document.getElementById(\`row-\${nextIndex}\`);
            if (rowElement) {
              const tableScroll = rowElement.closest('.table-scroll');
              if (tableScroll) {
                // INSTANT scrolling für zuverlässiges Verhalten
                const thead = tableScroll.querySelector('thead');
                const theadHeight = thead ? thead.offsetHeight : 80;
                const rowOffsetTop = rowElement.offsetTop;
                const rowHeight = rowElement.offsetHeight;
                const containerHeight = tableScroll.clientHeight;
                const currentScrollTop = tableScroll.scrollTop;
                
                // Ist Zeile bereits sichtbar?
                const rowVisualTop = rowOffsetTop - currentScrollTop;
                const rowVisualBottom = rowVisualTop + rowHeight;
                const isVisible = rowVisualTop >= theadHeight + 10 && rowVisualBottom <= containerHeight - 10;
                
                if (!isVisible) {
                  if (rowVisualTop < theadHeight + 10) {
                    // Zeile ist oben (unter Header) verdeckt
                    tableScroll.scrollTop = Math.max(0, rowOffsetTop - theadHeight - 10);
                  } else {
                    // Zeile ist unten verdeckt
                    tableScroll.scrollTop = rowOffsetTop - containerHeight + rowHeight + 10;
                  }
                }
              }
              rowElement.focus();
            }
          }, 10);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Finde aktuellen Index via Object-Referenz
        const currentFilteredIndex = filteredRecords.findIndex(r => r === currentRecordRef.current);
        
        if (currentFilteredIndex > 0) {
          const prevIndex = currentFilteredIndex - 1;
          const prevRecord = filteredRecords[prevIndex];
          // Refs SYNCHRON aktualisieren
          currentRecordRef.current = prevRecord;
          currentIndexRef.current = prevIndex;
          // State aktualisieren
          setCurrentRecord(prevRecord);
          setCurrentIndex(prevIndex);
          
          // Scroll zur Zeile und Focus setzen
          setTimeout(() => {
            const rowElement = document.getElementById(\`row-\${prevIndex}\`);
            if (rowElement) {
              const tableScroll = rowElement.closest('.table-scroll');
              if (tableScroll) {
                // INSTANT scrolling (kein smooth) für zuverlässiges Verhalten
                // Für die ersten 5 Zeilen: IMMER zu scrollTop=0
                if (prevIndex <= 4) {
                  tableScroll.scrollTop = 0;
                } else {
                  // Für andere Zeilen: scrolle so dass Zeile sichtbar ist
                  const thead = tableScroll.querySelector('thead');
                  const theadHeight = thead ? thead.offsetHeight : 80;
                  const rowOffsetTop = rowElement.offsetTop;
                  
                  // Scrolle so dass Zeile unter dem Header sichtbar ist
                  const targetScrollTop = rowOffsetTop - theadHeight - 10;
                  tableScroll.scrollTop = Math.max(0, targetScrollTop);
                }
              }
              rowElement.focus();
            }
          }, 10);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mutationMode, records, columnFiltersTemp, sortField, sortDirection, isDirty, searchExpanded]);

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
      
      // ActiveFilter vom Backend laden (gespeicherte Benutzer-Einstellung)
      if (data.activeFilter && ['all', 'activeOnly', 'inactiveOnly'].includes(data.activeFilter)) {
        activeFilterRef.current = data.activeFilter;
        setActiveFilter(data.activeFilter);
      }
      
      // hasActiveField vom Backend laden (ob Tabelle ein active-Feld hat)
      if (data.hasActiveField !== undefined) {
        setHasActiveField(data.hasActiveField);
      }
      
      // itemsPerPage vom Backend laden (Anzahl Datensätze pro Seite)
      if (data.itemsPerPage && Number.isInteger(data.itemsPerPage) && data.itemsPerPage > 0) {
        itemsPerPageRef.current = data.itemsPerPage;
        setItemsPerPage(data.itemsPerPage);
      }
      
      // tableMaxHeight vom Backend laden (Tabellenhöhe, z.B. '300px', '50vh')
      if (data.tableMaxHeight) {
        setTableMaxHeight(data.tableMaxHeight);
      }
      
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
        limit: String(itemsPerPageRef.current)
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
      
      // ActiveFilter hinzufügen (nur wenn nicht 'all')
      if (activeFilterRef.current && activeFilterRef.current !== 'all') {
        params.append('activeFilter', activeFilterRef.current);
      }
      
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
        setTotalPages(data.pageCount || Math.ceil((data.maxRecords || data.records.length) / itemsPerPageRef.current));
        
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

  const handleAdd = async () => {
    if (isDirty) {
      const result = await showMessage({
        type: 'confirm',
        title: getLabel('MSG_CONFIRM'),
        text: getLabel('MSG_DISCARD_CHANGES')
      });
      if (result !== 'ok') return;
    }
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
    setFieldErrors({});
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
      // Feld-Fehler zurücksetzen
      setFieldErrors({});
      
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
        
        // Fehlerbehandlung mit fieldErrors
        if (response.success === false) {
          if (response.fieldErrors) {
            setFieldErrors(response.fieldErrors);
          }
          if (response.showMessage) {
            await showMessage(response.showMessage);
          } else {
            await showMessage({ type: 'info', title: getLabel('MSG_ERROR'), text: response.message || getLabel('MSG_SAVE_ERROR') });
          }
          return;
        }
        
        // Erfolgs-Message anzeigen wenn vom Backend gewünscht
        if (response.showMessage) {
          await showMessage(response.showMessage);
        }
        
        // Smart Jump: Backend gibt Position des neuen Datensatzes zurück
        if (response.position) {
          const { page, index, totalRecords } = response.position;
          
          // Update Pagination Info
          setTotalRecords(totalRecords);
          setTotalPages(Math.ceil(totalRecords / itemsPerPageRef.current));
          
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
              const rowElement = document.getElementById(\`row-\${index}\`);
              if (rowElement) {
                scrollToRow(rowElement);
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
        
        // Fehlerbehandlung mit fieldErrors
        if (response.success === false) {
          if (response.fieldErrors) {
            setFieldErrors(response.fieldErrors);
          }
          if (response.showMessage) {
            await showMessage(response.showMessage);
          } else {
            await showMessage({ type: 'info', title: getLabel('MSG_ERROR'), text: response.message || getLabel('MSG_SAVE_ERROR') });
          }
          return;
        }
        
        // Erfolgs-Message anzeigen wenn vom Backend gewünscht
        if (response.showMessage) {
          await showMessage(response.showMessage);
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
      await showMessage({ type: 'info', title: getLabel('MSG_ERROR'), text: \`\${getLabel('MSG_SAVE_ERROR')}: \${err instanceof Error ? err.message : 'Unbekannt'}\` });
    }
  };

  const handleDelete = async () => {
    if (records.length === 0) return;
    
    // Bestätigung über MessageBox
    const result = await showMessage({
      type: 'confirm',
      title: getLabel('MSG_CONFIRM'),
      text: getLabel('MSG_DELETE_CONFIRM')
    });
    if (result !== 'ok') return;
    
    try {
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'delete'
      });
      const response = await apiDelete(\`/dynamic-form?\${params.toString()}\`, { record: currentRecord });
      
      // Fehlerbehandlung
      if (response.success === false) {
        if (response.showMessage) {
          await showMessage(response.showMessage);
        } else {
          await showMessage({ type: 'info', title: getLabel('MSG_ERROR'), text: response.message || getLabel('MSG_DELETE_ERROR') });
        }
        return;
      }
      
      // Smart Jump: Backend gibt Position zurück
      if (response.position) {
        const { page, index, totalRecords } = response.position;
        
        // Update Pagination Info
        setTotalRecords(totalRecords);
        setTotalPages(Math.ceil(totalRecords / itemsPerPageRef.current));
        
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
          let selectedIndex = index;
          let selectedRecord = null;
          if (loadedRecords && loadedRecords.length > index) {
            selectedRecord = loadedRecords[index];
            setCurrentRecord(selectedRecord);
            setCurrentIndex(index);
          } else if (loadedRecords && loadedRecords.length > 0) {
            // Fallback: letzter Datensatz der Seite
            selectedIndex = loadedRecords.length - 1;
            selectedRecord = loadedRecords[selectedIndex];
            setCurrentRecord(selectedRecord);
            setCurrentIndex(selectedIndex);
          }
          
          // Scroll zur Zeile in der Tabelle
          if (selectedRecord) {
            setTimeout(() => {
              const rowElement = document.getElementById(\`row-\${selectedIndex}\`);
              if (rowElement) {
                scrollToRow(rowElement);
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
      await showMessage({ type: 'info', title: getLabel('MSG_ERROR'), text: \`\${getLabel('MSG_DELETE_ERROR')}: \${err instanceof Error ? err.message : 'Unbekannt'}\` });
    }
  };

  const handleCancel = async () => {
    if (isDirty) {
      const result = await showMessage({
        type: 'confirm',
        title: getLabel('MSG_CONFIRM'),
        text: getLabel('MSG_DISCARD_CHANGES')
      });
      if (result !== 'ok') return;
    }
    if (mutationMode === 'add' || mutationMode === 'copy') {
      if (records.length > 0) setCurrentRecord(records[currentIndex]);
      else setCurrentRecord({});
    } else {
      setCurrentRecord(records[currentIndex]);
    }
    setMutationMode('view');
    setIsDirty(false);
    setFieldErrors({});
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
      
      // Kompletter Record zurück - alle Felder aktualisieren
      if (data.record) {
        setCurrentRecord(data.record);
      }
      
      // Backend kann neue selectOptions zurückliefern
      if (data.selectOptions) {
        setSelectOptions(prev => ({ ...prev, ...data.selectOptions }));
      }
      
      // Dynamisch deaktivierte Felder
      if (data.disabledFields) {
        setDisabledFields(data.disabledFields);
      }
      
      // Dynamisch versteckte Felder
      if (data.hiddenFields) {
        setHiddenFields(data.hiddenFields);
      }
      
      // MessageBox anzeigen wenn vom Backend gewünscht
      if (data.showMessage) {
        await showMessage(data.showMessage);
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
          const nextElement = focusableElements[currentIndex + 1];
          nextElement.focus();
          // Bei Input/Textarea: Inhalt markieren
          if (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') {
            nextElement.select();
          }
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
      e.stopPropagation();
      
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
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 100);
    } else {
      // Beim Schließen: Suche zurücksetzen und alle Daten laden
      setSearchExpanded(false);
      if (searchTermRef.current) {
        searchTermRef.current = '';
        setSearchTerm('');
        setIsFiltered(false);
        setCurrentPage(1);
        loadRecords(1);
      }
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    // Bei leerem Suchfeld: Filter zurücksetzen
    const trimmedSearch = searchTerm.trim();
    searchTermRef.current = trimmedSearch;
    setCurrentPage(1);
    const loadedRecords = await loadRecords(1);
    
    if (loadedRecords && loadedRecords.length > 0) {
      // Datensätze gefunden -> Suchfeld schließen, Filter-Status setzen
      setSearchExpanded(false);
      setIsFiltered(trimmedSearch !== '');
    } else {
      // Keine Datensätze -> Suchfeld offen lassen, Text markieren
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 50);
    }
  };

  const handleClearFilter = async () => {
    // Filter zurücksetzen
    searchTermRef.current = '';
    setSearchTerm('');
    setIsFiltered(false);
    
    try {
      setIsLoading(true);
      
      // API-Call mit rebuild und Keyfields des aktuellen Datensatzes
      const params = new URLSearchParams({
        formId: FORM_ID,
        function: 'rebuild',
        limit: String(itemsPerPageRef.current)
      });
      
      // Keyfields des aktuellen Datensatzes mitgeben
      FORM_CONFIG.filter(f => f.keyfield).forEach(field => {
        const value = currentRecordRef.current[field.fieldName];
        if (value !== undefined && value !== '') {
          params.append('keyfield_' + field.fieldName, String(value));
        }
      });
      
      const data = await apiGet('/dynamic-form', params);
      
      // SelectOptions aktualisieren falls vorhanden
      if (data.selectOptionsFix) setSelectOptionsFix(data.selectOptionsFix);
      if (data.selectOptions) setSelectOptions(data.selectOptions);
      
      if (data.records && Array.isArray(data.records)) {
        // Records setzen
        setRecords(data.records);
        setTotalRecords(data.maxRecords || data.records.length);
        setTotalPages(data.pageCount || Math.ceil((data.maxRecords || data.records.length) / itemsPerPageRef.current));
        
        // Position verarbeiten
        if (data.position) {
          const { page, index } = data.position;
          
          skipNextLoadRef.current = true;
          setCurrentPage(page);
          
          // Selektiere den Datensatz am Index vom Backend
          if (data.records.length > index) {
            const record = data.records[index];
            currentRecordRef.current = record;
            currentIndexRef.current = index;
            setCurrentRecord(record);
            setCurrentIndex(index);
            
            // Scroll zur Zeile
            setTimeout(() => {
              const rowElement = document.getElementById(\`row-\${index}\`);
              if (rowElement) {
                scrollToRow(rowElement);
                rowElement.focus();
              }
            }, 50);
          }
        } else if (data.records.length > 0) {
          // Kein Position-Objekt: ersten Datensatz selektieren
          currentRecordRef.current = data.records[0];
          currentIndexRef.current = 0;
          setCurrentRecord(data.records[0]);
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      setError(\`Fehler beim Rebuild: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler für Active-Filter Änderung
  const handleActiveFilterChange = async (newFilter) => {
    // State und Ref aktualisieren
    activeFilterRef.current = newFilter;
    setActiveFilter(newFilter);
    
    try {
      setIsLoading(true);
      
      // API-Call zum Speichern der Benutzer-Einstellung
      const saveParams = new URLSearchParams({
        formId: FORM_ID,
        function: 'saveActiveFilter',
        activeFilter: newFilter
      });
      
      await apiGet('/dynamic-form', saveParams);
      
      // Daten neu laden mit neuem Filter
      await loadRecords(1, false, false);
      
    } catch (err) {
      setError(\`Fehler beim Ändern des Filters: \${err instanceof Error ? err.message : 'Unbekannt'}\`);
    } finally {
      setIsLoading(false);
    }
  };

  // Hilfsfunktion: Scroll zur Zeile
  const scrollToRow = (rowElement) => {
    const tableScroll = rowElement?.closest('.table-scroll');
    if (tableScroll && rowElement) {
      // Hole Index aus row-id
      const rowId = rowElement.id;
      const match = rowId?.match(/row-(\d+)/);
      const index = match ? parseInt(match[1]) : -1;
      
      // INSTANT scrolling (kein smooth) für zuverlässiges Verhalten
      // Für die ersten 5 Zeilen: IMMER zu scrollTop=0
      if (index >= 0 && index <= 4) {
        tableScroll.scrollTop = 0;
        return;
      }
      
      // Für andere Zeilen: prüfen und scrollen wenn nötig
      const thead = tableScroll.querySelector('thead');
      const theadHeight = thead ? thead.offsetHeight : 80;
      const rowOffsetTop = rowElement.offsetTop;
      const rowHeight = rowElement.offsetHeight;
      const containerHeight = tableScroll.clientHeight;
      const currentScrollTop = tableScroll.scrollTop;
      
      // Ist Zeile bereits sichtbar?
      const rowVisualTop = rowOffsetTop - currentScrollTop;
      const rowVisualBottom = rowVisualTop + rowHeight;
      const isVisible = rowVisualTop >= theadHeight + 10 && rowVisualBottom <= containerHeight - 10;
      
      if (!isVisible) {
        // Scrolle so dass Zeile unter dem Header sichtbar ist
        tableScroll.scrollTop = Math.max(0, rowOffsetTop - theadHeight - 10);
      }
    }
  };

  const handleRowClick = (record, index) => {
    if (mutationMode !== 'view') return;
    // Refs SYNCHRON aktualisieren
    currentRecordRef.current = record;
    currentIndexRef.current = index;
    // State aktualisieren
    setCurrentIndex(index);
    setCurrentRecord(record);
  };

  const handleRowDoubleClick = (record, index) => {
    if (mutationMode !== 'view') return;
    // Refs SYNCHRON aktualisieren
    currentRecordRef.current = record;
    currentIndexRef.current = index;
    // State aktualisieren
    setCurrentIndex(index);
    setCurrentRecord(record);
    // In Edit-Modus wechseln und erstes editierbares Feld fokussieren
    setMutationMode('edit');
    setTimeout(() => {
      const firstEditableField = FORM_CONFIG.find(f => f.editable && !f.hidden && !f.keyfield);
      if (firstEditableField && inputRefs.current[firstEditableField.uniqueId]) {
        inputRefs.current[firstEditableField.uniqueId].focus();
      }
    }, 50);
  };

  const handleRowKeyDown = (e, record, index) => {
    if (e.key === 'Enter' && mutationMode === 'view') {
      e.preventDefault();
      handleRowDoubleClick(record, index);
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
          <p>{getLabel('MSG_LOADING')}</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout title={FORM_TITLE} showUserInfo={true} footerRight={FORM_ID}>
      <style>{\`
        .form-compact .form-group { margin-bottom: var(--spacing-sm); }
        .form-compact .input-field,
        .form-compact .select-field { height: 32px; padding: var(--spacing-xs) var(--spacing-sm); font-size: 14px; }
        .form-compact .label { margin-bottom: var(--spacing-xs); font-size: 13px; }
        
        /* Feld-Fehler (rote Umrandung) */
        .field-error {
          border-color: var(--color-danger, #dc2626) !important;
          box-shadow: 0 0 0 1px var(--color-danger, #dc2626);
        }
        .field-error-message {
          color: var(--color-danger, #dc2626);
          font-size: 12px;
          margin-top: 2px;
        }
        
        /* MessageBox Overlay */
        .message-box-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .message-box {
          background: white;
          border-radius: var(--radius-lg, 8px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 300px;
          max-width: 500px;
        }
        .message-box-header {
          padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
          border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
          font-weight: 600;
        }
        .message-box-body {
          padding: var(--spacing-lg, 16px);
        }
        .message-box-footer {
          padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
          border-top: 1px solid var(--color-gray-200, #e5e7eb);
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm, 8px);
        }
        
        /* Number-Input ohne Spinner */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
        
        /* Focus-Style für Tabellenzeilen */
        .table-scroll tbody tr:focus {
          outline: 2px solid var(--color-primary, #3b82f6);
          outline-offset: -2px;
        }
        
        .table-scroll { 
          max-height: \${tableMaxHeight}; 
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
          <div className="form-toolbar">
            <div className="form-toolbar-buttons">
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
                  {isFiltered && !searchExpanded && (
                    <button 
                      onClick={handleClearFilter} 
                      className="btn btn-warning flex items-center gap-2" 
                      title="Filter aufheben"
                    >
                      <FilterX className="w-4 h-4" />
                    </button>
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
              <div className="form-fields-container">
                {FORM_CONFIG.filter(f => !f.hidden && !hiddenFields.includes(f.fieldName)).map((field) => {
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
                          <hr className="form-separator" />
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
                                if (fieldErrors[field.fieldName]) {
                                  setFieldErrors(prev => ({ ...prev, [field.fieldName]: null }));
                                }
                                if (field.onChangeAction) {
                                  handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
                                }
                              }
                            }}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled || disabledFields.includes(field.fieldName)}
                            className={\`select-field\${fieldErrors[field.fieldName] ? ' field-error' : ''}\`}
                            style={{ textAlign: field.align || 'left' }}
                          >
                            <option value="">{getLabel('LBL_SELECT_CHOOSE')}</option>
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
                            disabled={isDisabled || disabledFields.includes(field.fieldName)}
                            className="checkbox"
                          />
                        ) : (
                          <input
                            ref={(el) => (inputRefs.current[field.uniqueId] = el)}
                            type={field.password ? 'password' : field.type === 'date' ? 'date' : field.type === 'integer' || field.type === 'decimal' ? 'number' : 'text'}
                            name={field.fieldName}
                            value={value}
                            onChange={(e) => {
                              handleFieldChange(field.fieldName, e.target.value);
                              if (fieldErrors[field.fieldName]) {
                                setFieldErrors(prev => ({ ...prev, [field.fieldName]: null }));
                              }
                            }}
                            onBlur={(e) => {
                              if (field.onChangeAction) {
                                handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
                              }
                            }}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled || disabledFields.includes(field.fieldName)}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className={\`input-field\${(field.type === 'integer' || field.type === 'decimal') && !field.showSpinner ? ' no-spinner' : ''}\${fieldErrors[field.fieldName] ? ' field-error' : ''}\`}
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
                        {fieldErrors[field.fieldName] && (
                          <div className="field-error-message">{fieldErrors[field.fieldName]}</div>
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
                  title={getLabel('BTN_PREVIOUS')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="record-counter">
                  {getLabel('LBL_RECORD_OF', { current: currentIndex + 1, total: records.length })}
                </span>
                <button 
                  onClick={() => { if (currentIndex < records.length - 1) { setCurrentIndex(currentIndex + 1); setCurrentRecord(records[currentIndex + 1]); } }}
                  disabled={currentIndex >= records.length - 1}
                  className="btn btn-secondary" 
                  title={getLabel('BTN_NEXT')}
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
                      <th key={\`filter-\${field.uniqueId}\`} className="table-filter-cell">
                        <input
                          type="text"
                          value={columnFiltersTemp[field.fieldName] || ''}
                          onChange={(e) => handleFilterChange(field.fieldName, e.target.value)}
                          onKeyDown={handleFilterKeyDown}
                          placeholder="Filter... (Enter)"
                          className="input-field table-filter-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedRecords().length === 0 ? (
                    <tr><td colSpan={tableFields.length} className="px-4 py-8 text-center text-gray-500">{getLabel('MSG_NO_RECORDS')}</td></tr>
                  ) : (
                    getFilteredAndSortedRecords().map((record, index) => {
                      // Object-Referenz-Vergleich für korrekte Selektion
                      const isCurrentRecord = record === currentRecord;
                      const isInactive = record.active === false;
                      // Color-Feature: inaktive immer rot, sonst aus color-Feld
                      const rowColor = isInactive ? 'red' : (record.color || '');
                      const colorClass = rowColor && ['red', 'green', 'yellow', 'blue'].includes(rowColor) 
                        ? \`table-row-\${rowColor}\` 
                        : '';
                      return (
                        <tr 
                          key={index} 
                          id={\`row-\${index}\`}
                          tabIndex={0}
                          onClick={() => handleRowClick(record, index)} 
                          onDoubleClick={() => handleRowDoubleClick(record, index)}
                          onKeyDown={(e) => handleRowKeyDown(e, record, index)}
                          className={\`cursor-pointer hover:bg-gray-50 \${isCurrentRecord && mutationMode === 'view' ? 'table-row-active' : ''} \${colorClass}\`}
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
          
          {/* Footer - immer sichtbar */}
          <div className="table-footer">
              
            {/* Links: Active-Filter (nur wenn active-Feld existiert) */}
            <div className="table-footer-left">
              {hasActiveField && (
                <select
                  value={activeFilter}
                  onChange={(e) => handleActiveFilterChange(e.target.value)}
                  className="select-field active-filter-select"
                  title={getLabel('LBL_FILTER_ALL')}
                >
                  <option value="all">{getLabel('LBL_FILTER_ALL')}</option>
                  <option value="activeOnly">{getLabel('LBL_FILTER_ACTIVE')}</option>
                  <option value="inactiveOnly">{getLabel('LBL_FILTER_INACTIVE')}</option>
                </select>
              )}
            </div>
            
            {/* Mitte: Pagination (nur wenn > 1 Seite) */}
            <div className="table-footer-center">
              {totalPages > 1 && (
                <>
                  <button 
                    onClick={() => handlePageChange(1)} 
                    disabled={currentPage === 1}
                    className="btn btn-secondary btn-pagination"
                    title="Erste Seite"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="btn btn-secondary btn-pagination"
                    title="Vorherige Seite"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="pagination-info">
                    {getLabel('LBL_PAGE_OF', { current: currentPage, total: totalPages })}
                  </span>
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary btn-pagination"
                    title="Nächste Seite"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handlePageChange(totalPages)} 
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary btn-pagination"
                    title="Letzte Seite"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            
            {/* Rechts: Datensatz-Anzahl */}
            <div className="table-footer-right">
              {getLabel('LBL_RECORDS_COUNT', { count: totalRecords })}
            </div>
          </div>
        </div>
      </div>
      
      {/* MessageBox */}
      {messageBox && (
        <div className="message-box-overlay">
          <div className="message-box">
            <div className="message-box-header">
              {messageBox.title}
            </div>
            <div className="message-box-body">
              {messageBox.text}
            </div>
            <div className="message-box-footer">
              {messageBox.type === 'info' && (
                <button className="btn btn-primary" onClick={() => closeMessageBox('ok')}>
                  {getLabel('BTN_OK')}
                </button>
              )}
              {messageBox.type === 'confirm' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('cancel')}>
                    {getLabel('BTN_CANCEL')}
                  </button>
                  <button className="btn btn-primary" onClick={() => closeMessageBox('ok')}>
                    {getLabel('BTN_OK')}
                  </button>
                </>
              )}
              {messageBox.type === 'yesno' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('no')}>
                    {getLabel('BTN_NO')}
                  </button>
                  <button className="btn btn-primary" onClick={() => closeMessageBox('yes')}>
                    {getLabel('BTN_YES')}
                  </button>
                </>
              )}
              {messageBox.type === 'yesnocancel' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('cancel')}>
                    {getLabel('BTN_CANCEL')}
                  </button>
                  <button className="btn btn-danger" onClick={() => closeMessageBox('no')}>
                    {getLabel('BTN_NO')}
                  </button>
                  <button className="btn btn-primary" onClick={() => closeMessageBox('yes')}>
                    {getLabel('BTN_YES')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseLayout>
  );
};

export default ${config.componentName};`;
};