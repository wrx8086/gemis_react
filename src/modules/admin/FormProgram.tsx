import React, { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import {
  Save, Plus, Copy, Trash2, X,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Edit2, AlertCircle, ArrowUp, ArrowDown, Search, Code
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSession } from '../../contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

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
  onChangeAction?: string;
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
  const { session } = useSession();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [formId, setFormId] = useState<string>('');

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [selectOptionsFix, setSelectOptionsFix] = useState<SelectOptions>({});
  const [selectOptions, setSelectOptions] = useState<SelectOptions>({});
  
  // Labels aus Session via getLabel (mit Fallback)
  const getLabel = (key: string, fallback: string): string => {
    return session?.labels?.[key] || fallback;
  };
  
  const [records, setRecords] = useState<RecordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentRecord, setCurrentRecord] = useState<RecordData>({});
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFiltersTemp, setColumnFiltersTemp] = useState<{ [key: string]: string }>({});
  const columnFiltersRef = useRef<{ [key: string]: string }>({});
  
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchTermRef = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [recordCount, setRecordCount] = useState<number>(0); // Anzahl Records im aktuellen Dataset

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
        const data = await apiGet('/formprogram?function=init');

        const companies = data.companies || data.dsResponse?.companies || [];
        const users = data.users || data.dsResponse?.users || [];
        const languages = data.languages || data.dsResponse?.languages || [];

        setCompanies(companies);
        setUsers(users);
        setLanguages(languages);

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
        console.error('Init Error:', err);
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

      if (data.selectOptionsFix) {
        setSelectOptionsFix(data.selectOptionsFix);
      }

      if (data.selectOptions) {
        setSelectOptions(data.selectOptions);
      }

      setFormConfig(config);
      setIsLoaded(true);

      // Process records from same response (Variante 2: 1 Call)
      if (data.records && Array.isArray(data.records)) {
        setRecords(data.records);
        if (data.records.length > 0) {
          setCurrentRecord(data.records[0]);
          setCurrentIndex(0);
        }
      } else if (data.dsResponse && Array.isArray(data.dsResponse.records)) {
        setRecords(data.dsResponse.records);
        if (data.dsResponse.records.length > 0) {
          setCurrentRecord(data.dsResponse.records[0]);
          setCurrentIndex(0);
        }
      } else {
        setRecords([]);
        setCurrentRecord({});
        setCurrentIndex(0);
      }

      setIsLoading(false);
    } catch (err) {
      setError(`Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      setIsLoading(false);
    }
  };

  const loadRecords = async (pageOverride?: number, skipSelect?: boolean): Promise<RecordData[]> => {
    if (!selectedCompany || !selectedUser || !selectedLanguage || !formId || !formConfig) {
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const pageToLoad = pageOverride !== undefined ? pageOverride : currentPage;
      const tables = Array.from(new Set(formConfig.selectedFields.map(f => getTableFromFieldName(f.fieldName)).filter(Boolean)));
      const tableName = tables[0];

      const params = new URLSearchParams({
        function: 'loaddata',
        table: tableName,
        company: selectedCompany,
        user: selectedUser,
        language_id: selectedLanguage,
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
          params.append(`filter_${key}`, columnFiltersRef.current[key]);
        }
      });

      const data = await apiGet('/formprogram', params);

      if (data.selectOptionsFix) setSelectOptionsFix(data.selectOptionsFix);
      if (data.selectOptions) setSelectOptions(data.selectOptions);

      let loadedRecords: RecordData[] = [];

      if (data.records && Array.isArray(data.records)) {
        const recCount = data.recordCount !== undefined ? data.recordCount : data.records.length;
        
        loadedRecords = data.records;
        setRecords(data.records);
        setRecordCount(recCount);
        setTotalRecords(data.maxRecords || data.totalRecords || data.records.length);
        setTotalPages(data.pageCount || data.totalPages || Math.ceil((data.maxRecords || data.records.length) / itemsPerPage));
        
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
        } else if (!skipSelect) {
          setCurrentRecord({});
          setCurrentIndex(0);
        }
      } else if (data.dsResponse && Array.isArray(data.dsResponse.records)) {
        const recCount = data.dsResponse.recordCount !== undefined ? data.dsResponse.recordCount : data.dsResponse.records.length;
        
        loadedRecords = data.dsResponse.records;
        setRecords(data.dsResponse.records);
        setRecordCount(recCount);
        setTotalRecords(data.dsResponse.maxRecords || data.dsResponse.totalRecords || data.dsResponse.records.length);
        setTotalPages(data.dsResponse.pageCount || data.dsResponse.totalPages || Math.ceil((data.dsResponse.maxRecords || data.dsResponse.records.length) / itemsPerPage));
        
        // Seite vom Backend übernehmen (falls vorhanden)
        if (data.dsResponse.currentPage !== undefined) {
          setCurrentPage(data.dsResponse.currentPage);
        } else if (data.dsResponse.page !== undefined) {
          setCurrentPage(data.dsResponse.page);
        }

        // Index vom Backend übernehmen (falls vorhanden), sonst Standard-Logik
        if (data.dsResponse.currentIndex !== undefined && data.dsResponse.records[data.dsResponse.currentIndex]) {
          setCurrentIndex(data.dsResponse.currentIndex);
          setCurrentRecord(data.dsResponse.records[data.dsResponse.currentIndex]);
        } else if (!skipSelect && recCount > 0) {
          setCurrentRecord(data.dsResponse.records[0]);
          setCurrentIndex(0);
        } else if (!skipSelect) {
          setCurrentRecord({});
          setCurrentIndex(0);
        }
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
      }

      setIsLoading(false);
      return loadedRecords;
    } catch (err) {
      setError(`Fehler beim Laden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      setIsLoading(false);
      return [];
    }
  };

  const handleAdd = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;

    const emptyRecord: RecordData = {};
    formConfig?.selectedFields.forEach(field => {
      if (field.type === 'select') {
        emptyRecord[field.fieldName] = currentRecord[field.fieldName] || '';
      } else if (field.type === 'logical' || field.type === 'checkbox') {
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
    
    setTimeout(() => {
      const firstInput = formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      firstInput?.focus();
    }, 50);
  };

  const handleUpdate = () => {
    if (editMode !== 'view') return;
    setEditMode('update');
    
    setTimeout(() => {
      const firstInput = formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      firstInput?.focus();
    }, 50);
  };

  const handleCopy = () => {
    if (isDirty && !confirm('Änderungen verwerfen?')) return;

    const copiedRecord = { ...currentRecord };

    setCurrentRecord(copiedRecord);
    setEditMode('add');
    setIsDirty(false);
    
    setTimeout(() => {
      const firstInput = formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      firstInput?.focus();
    }, 50);
  };

  const handleDelete = async () => {
    if (editMode !== 'view') return;
    if (!confirm(`Datensatz wirklich löschen?`)) return;

    try {
      const tables = Array.from(new Set(formConfig!.selectedFields.map(f => getTableFromFieldName(f.fieldName)).filter(Boolean)));
      const tableName = tables[0];

      const keyFields = formConfig!.selectedFields.filter(f => f.keyfield);
      const keyParams = keyFields.map(f => `${f.fieldName}=${currentRecord[f.fieldName]}`).join('&');

      const response = await apiDelete(`/formprogram?table=${tableName}&company=${selectedCompany}&user=${selectedUser}&language_id=${selectedLanguage}&${keyParams}`);

      // Fehlerbehandlung
      if (response.success === false) {
        alert(response.message || 'Fehler beim Löschen');
        return;
      }

      alert('Datensatz erfolgreich gelöscht');
      
      // Smart Jump: Backend gibt Position zurück
      if (response.position) {
        const { page, index, totalRecords } = response.position;
        
        // Update Pagination Info
        setTotalRecords(totalRecords);
        setTotalPages(Math.ceil(totalRecords / itemsPerPage));
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
          if (loadedRecords && loadedRecords.length > index) {
            setCurrentRecord(loadedRecords[index]);
            setCurrentIndex(index);
          } else if (loadedRecords && loadedRecords.length > 0) {
            // Fallback: letzter Datensatz der Seite
            setCurrentRecord(loadedRecords[loadedRecords.length - 1]);
            setCurrentIndex(loadedRecords.length - 1);
          }
        }
      } else {
        // Fallback: Normale Reload
        await loadFormConfiguration();
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
        const response = await apiPost('/formprogram', {
          table: tableName,
          company: selectedCompany,
          user: selectedUser,
          language_id: selectedLanguage,
          record: currentRecord
        });
        
        // Fehlerbehandlung
        if (response.success === false) {
          alert(response.message || 'Fehler beim Erstellen');
          return;
        }
        
        alert('Datensatz erfolgreich erstellt');
        
        // Smart Jump: Backend gibt Position des neuen Datensatzes zurück
        if (response.position) {
          const { page, index, totalRecords } = response.position;
          
          // Update Pagination Info
          setTotalRecords(totalRecords);
          setTotalPages(Math.ceil(totalRecords / itemsPerPage));
          setCurrentPage(page);
          
          // Lade Seite OHNE automatische Selektion
          const loadedRecords = await loadRecords(page, true);
          
          // Selektiere den neuen Datensatz am Index vom Backend
          if (loadedRecords && loadedRecords.length > index) {
            setCurrentRecord(loadedRecords[index]);
            setCurrentIndex(index);
          }
        } else {
          // Fallback: Normale Reload
          await loadFormConfiguration();
        }
      } else if (editMode === 'update') {
        const keyFields = formConfig!.selectedFields.filter(f => f.keyfield);
        const keyParams = keyFields.map(f => `${f.fieldName}=${currentRecord[f.fieldName]}`).join('&');

        const response = await apiPatch(`/formprogram?table=${tableName}&company=${selectedCompany}&user=${selectedUser}&language_id=${selectedLanguage}&${keyParams}`, {
          record: currentRecord
        });
        
        // Fehlerbehandlung
        if (response.success === false) {
          alert(response.message || 'Fehler beim Aktualisieren');
          return;
        }
        
        alert('Datensatz erfolgreich aktualisiert');
        
        // Nach UPDATE: Nur den aktualisierten Datensatz im Array ersetzen
        if (response.record) {
          const updatedRecords = [...records];
          updatedRecords[currentIndex] = response.record;
          setRecords(updatedRecords);
          setCurrentRecord(response.record);
        }
      }

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

  const handleRowClick = (record: RecordData) => {
    if (editMode !== 'view') return;
    if (isDirty && !confirm('Änderungen verwerfen?')) return;
    
    const originalIndex = records.findIndex(r => {
      const keyFields = formConfig?.selectedFields.filter(f => f.keyfield) || [];
      if (keyFields.length === 0) return r === record;
      return keyFields.every(kf => r[kf.fieldName] === record[kf.fieldName]);
    });
    
    if (originalIndex !== -1) {
      setCurrentIndex(originalIndex);
      setCurrentRecord(record);
      setIsDirty(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setCurrentRecord(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setIsDirty(true);
  };

  const handleChangeAction = async (fieldName: string, value: any, action: string) => {
    if (!action || !formId) return;
    
    try {
      const params = new URLSearchParams({
        function: 'change',
        form_id: formId,
        company: selectedCompany,
        user: selectedUser,
        language_id: selectedLanguage,
        field: fieldName,
        action: action,
        value: String(value)
      });
      
      // Key-Felder als einzelne Parameter hinzufügen (keyfield_FELDNAME=WERT)
      formConfig?.selectedFields.filter(f => f.keyfield).forEach(keyField => {
        if (currentRecord[keyField.fieldName] !== undefined) {
          params.append('keyfield_' + keyField.fieldName, String(currentRecord[keyField.fieldName]));
        }
      });
      
      const data = await apiGet('/formprogram', params);
      
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
      if (currentIndex > -1) {
        if (currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        } else {
          if (editMode !== 'view' && editMode !== 'delete') {
            handleSave();
          } else {
            focusableElements[0].focus();
          }
        }
      }
    }
  };

  const handleSort = (fieldName: string) => {
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
      setCurrentPage(1);
      loadRecords(1);
    }
  };

  const handleFilterChange = (fieldName: string, value: string) => {
    setColumnFiltersTemp(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Filter-Focus: Wert vom aktuellen Datensatz vorschlagen und markieren
  const handleFilterFocus = (e: React.FocusEvent<HTMLInputElement>, fieldName: string) => {
    const currentValue = currentRecord[fieldName];
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      const stringValue = String(currentValue);
      setColumnFiltersTemp(prev => ({ ...prev, [fieldName]: stringValue }));
      // Text komplett markieren nach kurzer Verzögerung
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
  };

  const handleFilterKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // IMMER Backend-Request bei ENTER (Server-Pagination)
      const newFilters = { ...columnFiltersTemp };
      columnFiltersRef.current = newFilters;
      setCurrentPage(1);
      
      await loadRecords(1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      
      // Filter-Inhalt für dieses Feld löschen
      setColumnFiltersTemp(prev => ({ ...prev, [fieldName]: '' }));
      
      // Fokus zurück zur Tabelle (aktuell selektierte Zeile)
      const activeRow = document.getElementById(`row-${currentIndex}`);
      if (activeRow) {
        activeRow.focus();
      }
    }
  };

  const getFilteredAndSortedRecords = () => {
    let filtered = [...records];

    // Clientseitiges Filtern mit TEMP-Filtern (live während Eingabe)
    Object.keys(columnFiltersTemp).forEach(fieldName => {
      const filterValue = columnFiltersTemp[fieldName]?.toLowerCase();
      if (filterValue) {
        filtered = filtered.filter(record => {
          const value = String(record[fieldName] || '').toLowerCase();
          return value.includes(filterValue);
        });
      }
    });

    // Clientseitiges Sortieren (case-insensitive wie Backend)
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
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

  const handleSearchSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    
    // Ref aktualisieren und Backend-Request
    searchTermRef.current = searchTerm;
    setCurrentPage(1);
    await loadRecords(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadRecords(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
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

  const renderField = (field: Field) => {
    const value = currentRecord[field.fieldName] ?? '';
    const isDisabled = 
      editMode === 'view' || 
      editMode === 'delete' || 
      !field.editable || 
      (editMode === 'update' && field.keyfield);
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
          onChange={(e) => {
            handleFieldChange(field.fieldName, e.target.checked);
            if (field.onChangeAction) {
              handleChangeAction(field.fieldName, e.target.checked, field.onChangeAction);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className="checkbox"
        />
      );
    }

    if (field.type === 'select') {
      const options = selectOptionsFix[field.fieldName] || selectOptions[field.fieldName] || [];
      return (
        <select
          name={field.fieldName}
          value={value}
          onChange={(e) => {
            handleFieldChange(field.fieldName, e.target.value);
            if (field.onChangeAction) {
              handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
            }
          }}
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
        onBlur={(e) => {
          if (field.onChangeAction) {
            handleChangeAction(field.fieldName, e.target.value, field.onChangeAction);
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        className={inputClassName}
        style={{ textAlign: field.align || 'left' }}
        autoComplete={field.password ? 'current-password' : undefined}
      />
    );
  };

  if (isLoading && companies.length === 0) {
    return (
      <BaseLayout title="Form Program" showUserInfo={true} showNavigation={false} footerRight={formId}>
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
    <BaseLayout title="Form Program" showUserInfo={true} showNavigation={false} footerRight={formId}>
      <div className="container-app">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Form Program</h1>

        <div className="card mb-6">
          <div className="card-header">
            <h2>{getLabel('BTN_LOAD', 'Laden')}</h2>
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
                  {getLabel('BTN_LOAD', 'Laden')}
                </button>
              </div>
              <div className="form-group">
                <button 
                  onClick={() => navigate(`/program-generator?formId=${formId}&company=${selectedCompany}&user=${selectedUser}&language_id=${selectedLanguage}`)} 
                  className="btn btn-info flex items-center gap-2"
                  disabled={!formId}
                  title="Code Generator"
                >
                  <Code className="w-4 h-4" />
                  Code generieren
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
                  {editMode === 'view' && recordCount > 0 && ` - Datensatz ${currentIndex + 1} von ${recordCount}`}
                  {editMode === 'view' && records.length === 0 && ' - Keine Datensätze'}
                </h2>

                <div className="flex gap-2">
                  {editMode === 'view' && (
                    <>
                      <button onClick={handleAdd} className="btn btn-success flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {getLabel('BTN_NEW', 'Neu')}
                      </button>
                      <button onClick={handleUpdate} className="btn btn-primary flex items-center gap-2" disabled={records.length === 0}>
                        <Edit2 className="w-4 h-4" />
                        {getLabel('BTN_EDIT', 'Bearbeiten')}
                      </button>
                      <button onClick={handleCopy} className="btn btn-info flex items-center gap-2" disabled={records.length === 0}>
                        <Copy className="w-4 h-4" />
                        {getLabel('BTN_COPY', 'Kopieren')}
                      </button>
                      <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2" disabled={records.length === 0}>
                        <Trash2 className="w-4 h-4" />
                        {getLabel('BTN_DELETE', 'Löschen')}
                      </button>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          onClick={handleSearchToggle} 
                          className="btn btn-secondary flex items-center gap-2"
                          title="Suche"
                        >
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
                            style={{ 
                              width: '250px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        )}
                      </div>
                    </>
                  )}

                  {editMode !== 'view' && (
                    <>
                      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {getLabel('BTN_SAVE', 'Speichern')}
                      </button>
                      <button onClick={handleCancel} className="btn btn-secondary flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {getLabel('BTN_CANCEL', 'Abbrechen')}
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
                                <span className="required-indicator">*</span>
                              )}
                              {field.keyfield && (
                                <span className="keyfield-indicator">
                                  (Key)
                                </span>
                              )}
                              {!field.editable && (
                                <span className="readonly-indicator">
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
                      title={getLabel('BTN_FIRST', 'Erste')}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0 || records.length === 0}
                      className="btn btn-secondary"
                      title={getLabel('BTN_PREVIOUS', 'Vorherige')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex >= records.length - 1 || records.length === 0}
                      className="btn btn-secondary"
                      title={getLabel('BTN_NEXT', 'Nächste')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleLast}
                      disabled={currentIndex >= records.length - 1 || records.length === 0}
                      className="btn btn-secondary"
                      title={getLabel('BTN_LAST', 'Letzte')}
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
                  <h2 className="text-xl font-semibold">Alle Datensätze ({getFilteredAndSortedRecords().length} / {records.length})</h2>
                </div>
                <div className="table-container table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        {tableFields.map(field => (
                          <th
                            key={field.uniqueId}
                            onClick={() => handleSort(field.fieldName)}
                            style={{
                              textAlign: field.align || 'left',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span>{field.label}</span>
                              {field.keyfield && (
                                <span className="text-danger">🔑</span>
                              )}
                              {sortField === field.fieldName && (
                                sortDirection === 'asc' 
                                  ? <ArrowUp className="w-4 h-4" />
                                  : <ArrowDown className="w-4 h-4" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {tableFields.map(field => (
                          <th key={`filter-${field.uniqueId}`} style={{ padding: '4px' }}>
                            <input
                              type="text"
                              value={columnFiltersTemp[field.fieldName] || ''}
                              onChange={(e) => handleFilterChange(field.fieldName, e.target.value)}
                              onKeyDown={(e) => handleFilterKeyDown(e, field.fieldName)}
                              onFocus={(e) => handleFilterFocus(e, field.fieldName)}
                              placeholder="Filter... (Enter)"
                              className="input-field"
                              style={{ 
                                width: '100%', 
                                fontSize: '12px', 
                                padding: '4px 8px',
                                minWidth: '80px'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAndSortedRecords().length === 0 ? (
                        <tr>
                          <td colSpan={tableFields.length} className="px-4 py-8 text-center text-gray-500">
                            Keine Datensätze vorhanden
                          </td>
                        </tr>
                      ) : (
                        getFilteredAndSortedRecords().map((record, index) => {
                          const isCurrentRecord = formConfig?.selectedFields
                            .filter(f => f.keyfield)
                            .every(kf => record[kf.fieldName] === currentRecord[kf.fieldName]) || false;
                          
                          // Inaktiv-Check: verschiedene Feldnamen und Werte unterstützen
                          const isInactive = record.active === false || record.active === 0 || record.active === '0' ||
                                            record.is_active === false || record.is_active === 0 || record.is_active === '0' ||
                                            record.deleted === true || record.deleted === 1 || record.deleted === '1';
                          
                          // Color-Feature: inaktive immer rot, sonst aus color-Feld
                          const rowColor = isInactive ? 'red' : (record.color || '');
                          const colorClass = rowColor && ['red', 'green', 'yellow', 'blue'].includes(rowColor) 
                            ? `table-row-${rowColor}` 
                            : '';
                          
                          return (
                          <tr
                            key={index}
                            id={`row-${index}`}
                            tabIndex={0}
                            onClick={() => handleRowClick(record)}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              isCurrentRecord && editMode === 'view' ? 'table-row-active' : ''
                            } ${colorClass}`}
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
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
                          <span key={`ellipsis-${idx}`} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
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
            )}
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default FormProgram;