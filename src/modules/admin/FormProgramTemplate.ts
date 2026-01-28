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
  const [showSearch, setShowSearch] = useState(true); // Wird von init gesetzt (lSearch)
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
  const messageBoxButtonRef = useRef(null);                 // Ref für primären Button (Fokus)
  
  // Lookup/Autocomplete States
  const [lookupState, setLookupState] = useState({
    isOpen: false,
    fieldName: null,
    results: [],
    selectedIndex: 0,
    isLoading: false,
    position: { top: 0, left: 0, width: 0 }
  });
  const lookupTimeoutRef = useRef(null);
  const lookupInputRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default 50, kann von init überschrieben werden
  const itemsPerPageRef = useRef(50);
  const [tableMaxHeight, setTableMaxHeight] = useState('250px'); // Default 250px, kann von init überschrieben werden
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [recordCount, setRecordCount] = useState(0); // Anzahl Records im aktuellen Dataset
  
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
        text: config.text || (config.messageId ? getLabel(config.messageId, config.params) : ''),
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
      // Wenn MessageBox oder Lookup offen ist, nicht reagieren
      if (messageBox) return;
      if (lookupState.isOpen) return;
      
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
  }, [mutationMode, records, columnFiltersTemp, sortField, sortDirection, isDirty, searchExpanded, messageBox, lookupState.isOpen]);

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

  // MessageBox: Fokus auf primären Button setzen
  useEffect(() => {
    if (messageBox && messageBoxButtonRef.current) {
      setTimeout(() => {
        messageBoxButtonRef.current?.focus();
      }, 50);
    }
  }, [messageBox]);

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
      
      // showSearch vom Backend laden (ob Suchfeld angezeigt wird)
      if (data.lSearch !== undefined) {
        setShowSearch(data.lSearch);
      } else if (data.showSearch !== undefined) {
        setShowSearch(data.showSearch);
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
        const recCount = data.recordCount !== undefined ? data.recordCount : data.records.length;
        
        setRecords(data.records);
        setRecordCount(recCount);
        setTotalRecords(data.maxRecords || data.totalRecords || data.records.length);
        setTotalPages(data.pageCount || data.totalPages || Math.ceil((data.maxRecords || data.records.length) / itemsPerPageRef.current));
        
        // Seite vom Backend übernehmen (falls vorhanden)
        if (data.currentPage !== undefined) {
          setCurrentPage(data.currentPage);
        } else if (data.page !== undefined) {
          setCurrentPage(data.page);
        }
        
        // Index vom Backend übernehmen (falls vorhanden), sonst Standard-Logik
        if (data.currentIndex !== undefined && data.records[data.currentIndex]) {
          setCurrentIndex(data.currentIndex);
          setCurrentRecord(data.records[data.currentIndex]);
        } else if (!skipSelect && recCount > 0) {
          setCurrentRecord(data.records[0]);
          setCurrentIndex(0);
        }
        
        setIsLoading(false);
        return data.records;
      } else {
        setRecords([]);
        setRecordCount(0);
        if (!skipSelect) {
          setCurrentRecord({});
          setCurrentIndex(0);
        }
        setTotalRecords(0);
        setTotalPages(0);
        setCurrentPage(1);
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
        
        // Select-Keyfield-Werte in Record mergen (diese sind in keyfieldValuesRef, nicht in currentRecord)
        const recordToSave = { ...currentRecordRef.current };
        FORM_CONFIG.filter(f => f.keyfield && f.type === 'select').forEach(field => {
          const value = keyfieldValuesRef.current[field.fieldName];
          if (value !== undefined && value !== '') {
            recordToSave[field.fieldName] = value;
          }
        });
        
        const response = await apiPost(\`/dynamic-form?\${params.toString()}\`, { record: recordToSave });
        
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
          
          // Verhindere dass useEffect nochmal loadRecords aufruft (nur wenn Seite sich ändert)
          if (page !== currentPage) {
            skipNextLoadRef.current = true;
            setCurrentPage(page);
          }
          
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
        const response = await apiPatch(\`/dynamic-form?\${params.toString()}\`, { record: currentRecordRef.current });
        
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
        
        // Backend kann eine Frage stellen (z.B. "Datensatz aktivieren?")
        if (response.askQuestion) {
          const questionResult = await showMessage(response.askQuestion);
          if (questionResult === 'yes' && response.askQuestion.fieldUpdate) {
            // Bei "Ja": Felder aus fieldUpdate in Record übernehmen und normalen Update senden
            const updatedRecord = { ...currentRecordRef.current, ...response.askQuestion.fieldUpdate };
            
            const updateParams = new URLSearchParams({
              formId: FORM_ID,
              function: 'update'
            });
            const updateResponse = await apiPatch(\`/dynamic-form?\${updateParams.toString()}\`, { 
              record: updatedRecord
            });
            
            // Aktualisierten Record übernehmen
            if (updateResponse.record) {
              const updatedRecords = [...records];
              updatedRecords[currentIndex] = updateResponse.record;
              setRecords(updatedRecords);
              setCurrentRecord(updateResponse.record);
            }
          }
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
        function: 'delete',
        page: String(currentPage),
        index: String(currentIndex)
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
        
        // Verhindere dass useEffect nochmal loadRecords aufruft (nur wenn Seite sich ändert)
        if (page !== currentPage) {
          skipNextLoadRef.current = true;
          setCurrentPage(page);
        }
        
        if (totalRecords === 0) {
          // Keine Datensätze mehr
          setRecords([]);
          setRecordCount(0);
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
    // Ref synchron aktualisieren (für sofortige Verfügbarkeit in Lookup etc.)
    currentRecordRef.current = { ...currentRecordRef.current, [fieldName]: value };
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
        changedField: fieldName,
        changedValue: String(value)
      });
      
      // Alle aktuellen Feldwerte als Query-Parameter hinzufügen
      FORM_CONFIG.forEach(field => {
        const fieldValue = currentRecord[field.fieldName];
        if (fieldValue !== undefined && fieldValue !== null) {
          params.append(field.fieldName, String(fieldValue));
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

  // ============ LOOKUP/AUTOCOMPLETE FUNKTIONEN ============
  
  const handleLookupSearch = async (fieldName, searchValue, field) => {
    if (!field.lookup || !field.lookup.enabled) return;
    
    const minChars = field.lookup.minChars || 2;
    
    // Zu wenig Zeichen - Lookup schliessen
    if (!searchValue || searchValue.length < minChars) {
      setLookupState(prev => ({ ...prev, isOpen: false, results: [], fieldName: null }));
      return;
    }
    
    // Timeout für Debouncing
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }
    
    lookupTimeoutRef.current = setTimeout(async () => {
      try {
        setLookupState(prev => ({ ...prev, isLoading: true }));
        
        const params = new URLSearchParams({
          formId: FORM_ID,
          function: 'lookup',
          lookupField: fieldName,
          search: searchValue
        });
        
        // displayFields mitsenden (damit Backend weiss welche Felder zurückzugeben sind)
        if (field.lookup.displayFields && field.lookup.displayFields.length > 0) {
          params.append('displayFields', field.lookup.displayFields.filter(f => f).join(','));
        }
        
        // Alle aktuellen Feldwerte als Query-Parameter hinzufügen (für Kontext, z.B. Lkz)
        FORM_CONFIG.forEach(f => {
          const fieldValue = currentRecordRef.current[f.fieldName];
          if (fieldValue !== undefined && fieldValue !== null) {
            params.append(f.fieldName, String(fieldValue));
          }
        });
        
        const data = await apiGet('/dynamic-form', params);
        
        if (data.results && Array.isArray(data.results)) {
          // Position des Input-Feldes ermitteln
          const inputElement = inputRefs.current[field.uniqueId];
          let position = { top: 0, left: 0, width: 300 };
          
          if (inputElement) {
            const rect = inputElement.getBoundingClientRect();
            const containerRect = inputElement.closest('.container-app')?.getBoundingClientRect() || { top: 0, left: 0 };
            position = {
              top: rect.bottom - containerRect.top + window.scrollY,
              left: rect.left - containerRect.left,
              width: Math.max(rect.width, 300)
            };
          }
          
          setLookupState({
            isOpen: true,
            fieldName: fieldName,
            results: data.results,
            selectedIndex: 0,
            isLoading: false,
            position: position,
            field: field
          });
          
          lookupInputRef.current = inputElement;
        }
      } catch (err) {
        console.error('Lookup error:', err);
        setLookupState(prev => ({ ...prev, isOpen: false, isLoading: false }));
      }
    }, 300); // 300ms Debounce
  };
  
  const handleLookupSelect = (result) => {
    if (!lookupState.field || !lookupState.field.lookup) return;
    
    const lookup = lookupState.field.lookup;
    const fieldName = lookupState.fieldName;
    
    // Hauptwert übernehmen
    const valueField = lookup.valueField || fieldName;
    const newValue = result[valueField];
    
    // Record aktualisieren
    const updatedRecord = { ...currentRecordRef.current, [fieldName]: newValue };
    
    // Zusätzliche Felder übernehmen (returnFields)
    if (lookup.returnFields) {
      Object.entries(lookup.returnFields).forEach(([sourceField, targetField]) => {
        if (result[sourceField] !== undefined) {
          updatedRecord[targetField] = result[sourceField];
        }
      });
    }
    
    // Ref und State aktualisieren
    currentRecordRef.current = updatedRecord;
    setCurrentRecord(updatedRecord);
    setIsDirty(true);
    setLookupState(prev => ({ ...prev, isOpen: false, results: [], fieldName: null }));
    
    // Fokus zurück aufs Input
    if (lookupInputRef.current) {
      lookupInputRef.current.focus();
    }
  };
  
  const handleLookupKeyDown = (e, field) => {
    if (!lookupState.isOpen || lookupState.fieldName !== field.fieldName) return false;
    
    const results = lookupState.results;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setLookupState(prev => ({
        ...prev,
        selectedIndex: Math.min(prev.selectedIndex + 1, results.length - 1)
      }));
      return true;
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLookupState(prev => ({
        ...prev,
        selectedIndex: Math.max(prev.selectedIndex - 1, 0)
      }));
      return true;
    }
    
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      handleLookupSelect(results[lookupState.selectedIndex]);
      return true;
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      setLookupState(prev => ({ ...prev, isOpen: false, results: [], fieldName: null }));
      return true;
    }
    
    if (e.key === 'Tab') {
      setLookupState(prev => ({ ...prev, isOpen: false, results: [], fieldName: null }));
      return false; // Tab normal weiterleiten
    }
    
    return false;
  };
  
  const closeLookup = () => {
    setLookupState(prev => ({ ...prev, isOpen: false, results: [], fieldName: null }));
  };

  // ============ ENDE LOOKUP FUNKTIONEN ============

  const handleKeyDown = (e, field) => {
    // Lookup-Tastatureingaben zuerst prüfen
    if (field.lookup && field.lookup.enabled) {
      const handled = handleLookupKeyDown(e, field);
      if (handled) return;
    }
    
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
    const newFilters = { ...columnFiltersRef.current, [fieldName]: value };
    columnFiltersRef.current = newFilters;  // Synchron für Live-Filterung
    setColumnFiltersTemp(newFilters);
  };

  // Filter-Focus: Wert vom aktuellen Datensatz vorschlagen und markieren
  const handleFilterFocus = (e, fieldName) => {
    const currentValue = currentRecordRef.current[fieldName];
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      const stringValue = String(currentValue);
      const newFilters = { ...columnFiltersRef.current, [fieldName]: stringValue };
      columnFiltersRef.current = newFilters;  // Synchron für Live-Filterung
      setColumnFiltersTemp(newFilters);
      // Text komplett markieren nach kurzer Verzögerung (damit React den Wert setzt)
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
  };

  const handleFilterKeyDown = async (e, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      // IMMER Backend-Request bei ENTER (Server-Pagination)
      setCurrentPage(1);
      
      // Direkt laden - die ref ist bereits aktualisiert durch handleFilterChange
      await loadRecords(1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      
      // Filter-Inhalt für dieses Feld löschen (Ref und State)
      const newFilters = { ...columnFiltersRef.current };
      delete newFilters[fieldName];
      columnFiltersRef.current = newFilters;
      setColumnFiltersTemp(newFilters);
      
      // Fokus zurück zur Tabelle (aktuell selektierte Zeile)
      const activeRow = document.getElementById(\`row-\${currentIndex}\`);
      if (activeRow) {
        activeRow.focus();
      }
    }
  };

  const getFilteredAndSortedRecords = () => {
    let filtered = [...records];
    
    // Clientseitiges Filtern mit Ref (synchron aktualisiert)
    const currentFilters = columnFiltersRef.current;
    filtered = filtered.filter(record => {
      return Object.keys(currentFilters).every(fieldName => {
        const filterValue = currentFilters[fieldName];
        if (!filterValue) return true;
        
        const recordValue = record[fieldName];
        
        // Spezieller Check für Boolean-Filter (true/false)
        if (filterValue === 'true' || filterValue === 'false') {
          const filterBool = filterValue === 'true';
          // Verschiedene Werte als "truthy" interpretieren
          const recordBool = recordValue === true || recordValue === 1 || recordValue === '1' || recordValue === 'true' || recordValue === 'yes';
          return filterBool === recordBool;
        }
        
        // Standard: String-Substring-Vergleich
        const recordStr = String(recordValue || '').toLowerCase();
        return recordStr.includes(filterValue.toLowerCase());
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
        const recCount = data.recordCount !== undefined ? data.recordCount : data.records.length;
        
        // Records setzen
        setRecords(data.records);
        setRecordCount(recCount);
        setTotalRecords(data.maxRecords || data.records.length);
        setTotalPages(data.pageCount || Math.ceil((data.maxRecords || data.records.length) / itemsPerPageRef.current));
        
        // Seite vom Backend übernehmen (falls vorhanden)
        const newPage = data.currentPage ?? data.position?.page ?? currentPage;
        
        // WICHTIG: skipNextLoadRef nur setzen wenn sich die Seite tatsächlich ändert
        // Sonst wird useEffect nicht getriggert und skipNextLoadRef bleibt true
        if (newPage !== currentPage) {
          skipNextLoadRef.current = true;
          setCurrentPage(newPage);
        }
        
        // Index vom Backend übernehmen
        if (data.currentIndex !== undefined && data.records[data.currentIndex]) {
          currentRecordRef.current = data.records[data.currentIndex];
          currentIndexRef.current = data.currentIndex;
          setCurrentRecord(data.records[data.currentIndex]);
          setCurrentIndex(data.currentIndex);
          
          // Scroll zur Zeile
          setTimeout(() => {
            const rowElement = document.getElementById(\`row-\${data.currentIndex}\`);
            if (rowElement) {
              scrollToRow(rowElement);
              rowElement.focus();
            }
          }, 50);
        } else if (data.position?.index !== undefined && data.records[data.position.index]) {
          // Fallback: Position-Objekt
          const index = data.position.index;
          currentRecordRef.current = data.records[index];
          currentIndexRef.current = index;
          setCurrentRecord(data.records[index]);
          setCurrentIndex(index);
          
          setTimeout(() => {
            const rowElement = document.getElementById(\`row-\${index}\`);
            if (rowElement) {
              scrollToRow(rowElement);
              rowElement.focus();
            }
          }, 50);
        } else if (recCount > 0) {
          // Kein Index: ersten Datensatz selektieren
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
        
        /* Lookup/Autocomplete Overlay */
        .lookup-overlay {
          position: absolute;
          background: white;
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: var(--radius-md, 6px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 300px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .lookup-loading {
          padding: 12px;
          text-align: center;
          color: var(--color-text-muted, #6b7280);
        }
        .lookup-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .lookup-table thead {
          background: var(--color-bg-secondary, #f3f4f6);
          position: sticky;
          top: 0;
        }
        .lookup-table th {
          padding: 8px 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid var(--color-border, #d1d5db);
          white-space: nowrap;
        }
        .lookup-table tbody {
          overflow-y: auto;
          max-height: 250px;
        }
        .lookup-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border-light, #e5e7eb);
          white-space: nowrap;
        }
        .lookup-table tr.lookup-row {
          cursor: pointer;
          transition: background 0.1s;
        }
        .lookup-table tr.lookup-row:hover {
          background: var(--color-bg-hover, #f9fafb);
        }
        .lookup-table tr.lookup-row.selected {
          background: var(--color-primary-light, #dbeafe);
        }
        .lookup-no-results {
          padding: 12px;
          text-align: center;
          color: var(--color-text-muted, #6b7280);
          font-style: italic;
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
                  {showSearch && (
                    <>
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
                              // Lookup-Suche auslösen
                              if (field.lookup && field.lookup.enabled) {
                                handleLookupSearch(field.fieldName, e.target.value, field);
                              }
                            }}
                            onBlur={(e) => {
                              if (field.onChangeAction) {
                                handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
                              }
                              // Lookup mit Verzögerung schliessen (damit Klick funktioniert)
                              if (field.lookup && field.lookup.enabled) {
                                setTimeout(() => closeLookup(), 200);
                              }
                            }}
                            onKeyDown={(e) => handleKeyDown(e, field)}
                            disabled={isDisabled || disabledFields.includes(field.fieldName)}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            className={\`input-field\${(field.type === 'integer' || field.type === 'decimal') && !field.showSpinner ? ' no-spinner' : ''}\${fieldErrors[field.fieldName] ? ' field-error' : ''}\`}
                            style={{ textAlign: field.align || 'left' }}
                            autoComplete={
                              field.lookup && field.lookup.enabled ? 'off' :
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
                  {getLabel('LBL_RECORD_OF', { current: currentIndex + 1, total: recordCount })}
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
                        {field.type === 'checkbox' || field.type === 'logical' ? (
                          <select
                            value={columnFiltersTemp[field.fieldName] || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Neuen Filter-State direkt berechnen (nicht aus altem State)
                              const newFilters = { ...columnFiltersRef.current };
                              if (newValue) {
                                newFilters[field.fieldName] = newValue;
                              } else {
                                delete newFilters[field.fieldName];
                              }
                              // Ref UND State synchron setzen
                              columnFiltersRef.current = newFilters;
                              setColumnFiltersTemp(newFilters);
                              // Sofort laden
                              setCurrentPage(1);
                              loadRecords(1);
                            }}
                            className="select-field table-filter-input"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Alle</option>
                            <option value="true">Ja</option>
                            <option value="false">Nein</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={columnFiltersTemp[field.fieldName] || ''}
                            onChange={(e) => handleFilterChange(field.fieldName, e.target.value)}
                            onKeyDown={(e) => handleFilterKeyDown(e, field.fieldName)}
                            onFocus={(e) => handleFilterFocus(e, field.fieldName)}
                            placeholder="Filter... (Enter)"
                            className="input-field table-filter-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
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
                      
                      // Inaktiv-Check: verschiedene Feldnamen und Werte unterstützen
                      const isInactive = record.active === false || record.active === 0 || record.active === '0' ||
                                        record.is_active === false || record.is_active === 0 || record.is_active === '0' ||
                                        record.deleted === true || record.deleted === 1 || record.deleted === '1';
                      
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
      
      {/* Lookup/Autocomplete Overlay */}
      {lookupState.isOpen && lookupState.field && (
        <div 
          className="lookup-overlay"
          style={{
            top: lookupState.position.top,
            left: lookupState.position.left,
            width: lookupState.position.width,
            minWidth: '300px'
          }}
        >
          {lookupState.isLoading ? (
            <div className="lookup-loading">{getLabel('MSG_LOADING')}</div>
          ) : lookupState.results.length === 0 ? (
            <div className="lookup-no-results">{getLabel('MSG_NO_RECORDS')}</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
              <table className="lookup-table">
                <thead>
                  <tr>
                    {(lookupState.field.lookup.displayFields || [lookupState.fieldName]).filter(f => f).map(displayField => (
                      <th key={displayField}>{displayField}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lookupState.results.map((result, index) => (
                    <tr 
                      key={index}
                      className={\`lookup-row \${index === lookupState.selectedIndex ? 'selected' : ''}\`}
                      onClick={() => handleLookupSelect(result)}
                      onMouseEnter={() => setLookupState(prev => ({ ...prev, selectedIndex: index }))}
                    >
                      {(lookupState.field.lookup.displayFields || [lookupState.fieldName]).filter(f => f).map(displayField => (
                        <td key={displayField}>{result[displayField] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* MessageBox */}
      {messageBox && (
        <div 
          className="message-box-overlay"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              // Escape = sekundäre Aktion (Abbrechen/Nein)
              if (messageBox.type === 'info') closeMessageBox('ok');
              else if (messageBox.type === 'confirm') closeMessageBox('cancel');
              else if (messageBox.type === 'yesno' || messageBox.type === 'question') closeMessageBox('no');
              else if (messageBox.type === 'yesnocancel') closeMessageBox('cancel');
            }
          }}
        >
          <div className="message-box">
            <div className="message-box-header">
              {messageBox.title}
            </div>
            <div className="message-box-body">
              {messageBox.text}
            </div>
            <div className="message-box-footer">
              {messageBox.type === 'info' && (
                <button className="btn btn-primary" onClick={() => closeMessageBox('ok')} ref={messageBoxButtonRef}>
                  {getLabel('BTN_OK')}
                </button>
              )}
              {messageBox.type === 'confirm' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('cancel')}>
                    {getLabel('BTN_CANCEL')}
                  </button>
                  <button className="btn btn-primary" onClick={() => closeMessageBox('ok')} ref={messageBoxButtonRef}>
                    {getLabel('BTN_OK')}
                  </button>
                </>
              )}
              {messageBox.type === 'yesno' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('no')}>
                    {getLabel('BTN_NO')}
                  </button>
                  <button className="btn btn-primary" onClick={() => closeMessageBox('yes')} ref={messageBoxButtonRef}>
                    {getLabel('BTN_YES')}
                  </button>
                </>
              )}
              {messageBox.type === 'question' && (
                <>
                  <button className="btn btn-secondary" onClick={() => closeMessageBox('no')}>
                    {getLabel('BTN_NO')}
                  </button>
                  <button className="btn btn-success" onClick={() => closeMessageBox('yes')} ref={messageBoxButtonRef}>
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
                  <button className="btn btn-primary" onClick={() => closeMessageBox('yes')} ref={messageBoxButtonRef}>
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