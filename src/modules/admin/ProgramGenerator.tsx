import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { Download, Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface FormConfig {
  formTitle: string;
  formId: string;
  selectedFields: any[];
  targetUser: string;
  targetLanguageId: string;
  targetCompany: string;
}

const ProgramGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formId, setFormId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [programName, setProgramName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [targetLanguageId, setTargetLanguageId] = useState('');
  const [targetCompany, setTargetCompany] = useState('');

  useEffect(() => {
    const urlFormId = searchParams.get('formId');
    if (urlFormId) {
      setFormId(urlFormId);
    }
  }, [searchParams]);

  const generateCode = async () => {
    if (!formId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        function: 'getformconfig',
        company: '1000',
        user: 'Admin',
        language_id: '1',
        form_id: formId
      });

      const data = await apiGet('/formprogram', params);
      const config: FormConfig = data;

      // Store target values for later use
      setTargetUser(config.targetUser);
      setTargetLanguageId(config.targetLanguageId);
      setTargetCompany(config.targetCompany);

      const code = `import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';

const ${toPascalCase(formId)}: React.FC = () => {
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({});
  const [editMode, setEditMode] = useState('view');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const params = new URLSearchParams({
      function: 'loadconfig',
      company: '${config.targetCompany}',
      user: '${config.targetUser}',
      language_id: '${config.targetLanguageId}',
      form_id: '${formId}'
    });
    const data = await apiGet('/formprogram', params);
    if (data.records) {
      setRecords(data.records);
      if (data.records.length > 0) {
        setCurrentRecord(data.records[0]);
      }
    }
  };

  const handleSave = async () => {
    // CRUD Logic here
    await loadRecords();
  };

  return (
    <BaseLayout title="${config.formTitle}" showUserInfo={false}>
      <div className="container-app">
        <h1 className="text-3xl font-bold mb-6">${config.formTitle}</h1>
        
        <div className="card">
          <div className="card-header">
            <h2>Formular</h2>
          </div>
          <div className="card-body">
            <form>
${config.selectedFields.map(field => `              <div className="form-group">
                <label className="form-label">${field.label}</label>
                <input
                  type="${getInputType(field.type)}"
                  className="input-field"
                  value={currentRecord['${field.fieldName}'] || ''}
                  onChange={(e) => setCurrentRecord(prev => ({...prev, ${field.fieldName}: e.target.value}))}
                  \${editMode === 'view' ? 'disabled' : ''}
                />
              </div>`).join('\n')}
            </form>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default ${toPascalCase(formId)};`;

      setGeneratedCode(code);
      setProgramName(toPascalCase(formId));
    } catch (err) {
      console.error('Generate Error:', err);
    }
    setIsLoading(false);
  };

  const saveProgram = async () => {
    if (!programName || !generatedCode) return;

    try {
      await apiPost('/program-generator', {
        function: 'save',
        program_name: programName,
        program_code: generatedCode,
        form_id: formId,
        target_user: targetUser,
        target_language_id: targetLanguageId,
        target_company: targetCompany
      });
      alert('Programm gespeichert!');
    } catch (err) {
      console.error('Save Error:', err);
      alert('Fehler beim Speichern');
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${programName}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <BaseLayout title="Programm Generator" showUserInfo={true}>
      <div className="container-app">
        <h1 className="text-3xl font-bold mb-6">Programm Generator</h1>

        <div className="card mb-6">
          <div className="card-header">
            <h2>Schritt 1: Formular-ID eingeben</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Formular-ID</label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="input-field"
                  placeholder="z.B. users_view-01"
                />
              </div>
              <div className="form-group">
                <button onClick={generateCode} className="btn btn-primary" disabled={isLoading}>
                  Code generieren
                </button>
              </div>
            </div>
          </div>
        </div>

        {generatedCode && (
          <>
            <div className="card mb-6">
              <div className="card-header">
                <h2>Schritt 2: Programm-Informationen</h2>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ziel-Firma</label>
                    <input
                      type="text"
                      value={targetCompany}
                      className="input-field"
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ziel-Benutzer</label>
                    <input
                      type="text"
                      value={targetUser}
                      className="input-field"
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ziel-Sprache</label>
                    <input
                      type="text"
                      value={targetLanguageId}
                      className="input-field"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-6">
              <div className="card-header">
                <h2>Schritt 3: Generierter Code</h2>
                <div className="flex gap-2">
                  <button onClick={downloadCode} className="btn btn-secondary flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download .tsx
                  </button>
                  <button onClick={saveProgram} className="btn btn-success flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    In DB speichern
                  </button>
                </div>
              </div>
              <div className="card-body">
                <pre className="code-block">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Schritt 4: Programm-Name</h2>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Programm-Name (PascalCase)</label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  );
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function getInputType(fieldType: string): string {
  switch (fieldType) {
    case 'integer':
    case 'decimal':
      return 'number';
    case 'date':
      return 'date';
    case 'checkbox':
    case 'logical':
      return 'checkbox';
    default:
      return 'text';
  }
}

export default ProgramGenerator;