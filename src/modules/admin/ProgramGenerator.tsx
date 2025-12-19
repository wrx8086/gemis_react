import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { Download, Save, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { generateFormProgramCode } from './FormProgramTemplate';

interface FormConfig {
  formTitle: string;
  formId: string;
  selectedFields: any[];
  targetUser?: string;
  targetLanguageId?: string;
  targetCompany?: string;
  itemsPerPage?: number;
  tableMaxHeight?: string;
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
    const urlUser = searchParams.get('user');
    const urlCompany = searchParams.get('company');
    const urlLanguageId = searchParams.get('language_id');
    
    if (urlFormId) {
      setFormId(urlFormId);
    }
    if (urlUser) {
      setTargetUser(urlUser);
    }
    if (urlCompany) {
      setTargetCompany(urlCompany);
    }
    if (urlLanguageId) {
      setTargetLanguageId(urlLanguageId);
    }
  }, [searchParams]);

  const generateCode = async () => {
    if (!formId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        function: 'getformconfig',
        company: targetCompany || '1000',
        user: targetUser || 'admin',
        language_id: targetLanguageId || '1',
        form_id: formId
      });

      const data = await apiGet('/formprogram', params);
      
      // Debug: Was kommt vom Backend?
      console.log('Backend Response für getformconfig:', data);
      
      // Flexibel: Daten können direkt oder verschachtelt sein
      let config: FormConfig;
      if (data.config) {
        // Verschachtelt: { config: { formTitle, formId, selectedFields } }
        config = data.config;
      } else if (data.result) {
        // Alternative Verschachtelung: { result: { ... } }
        config = data.result;
      } else {
        // Direkt: { formTitle, formId, selectedFields }
        config = data;
      }

      // Validierung: Sind formTitle und formId vorhanden?
      if (!config.formTitle || !config.formId) {
        console.error('Backend Response fehlt formTitle oder formId:', config);
        alert(`Fehler: Backend hat keine gültige Konfiguration zurückgegeben.\n\nformTitle: ${config.formTitle}\nformId: ${config.formId}\n\nBitte prüfen Sie die Form-Konfiguration im FormDesigner.`);
        setIsLoading(false);
        return;
      }
      
      // Validierung: Sind Felder vorhanden?
      if (!config.selectedFields || config.selectedFields.length === 0) {
        console.error('Backend Response hat keine Felder:', config);
        alert('Fehler: Keine Felder in der Konfiguration gefunden.\n\nBitte prüfen Sie die Form-Konfiguration im FormDesigner.');
        setIsLoading(false);
        return;
      }

      const company = config.targetCompany || '1000';
      const user = config.targetUser || 'Admin';
      const langId = config.targetLanguageId || '1';

      setTargetUser(user);
      setTargetLanguageId(langId);
      setTargetCompany(company);

      const componentName = toPascalCase(formId);
      const code = generateFormProgramCode({
        componentName: componentName,
        formTitle: config.formTitle,
        formId: config.formId,
        targetCompany: company,
        targetUser: user,
        targetLanguageId: langId,
        fields: config.selectedFields
      });

      setGeneratedCode(code);
      setProgramName(componentName);
    } catch (err) {
      console.error('Generate Error:', err);
      alert(`Fehler beim Generieren: ${err instanceof Error ? err.message : 'Unbekannt'}`);
    }
    setIsLoading(false);
  };

  const saveProgram = async () => {
    if (!programName || !generatedCode) {
      return;
    }

    try {
      // Base64-Encoding um UTF-8/Sonderzeichen-Probleme zu vermeiden
      const base64Code = btoa(unescape(encodeURIComponent(generatedCode)));

      const payload = {
        function: 'save',
        program_name: programName,
        program_code_base64: base64Code,
        form_id: formId,
        target_user: targetUser || 'Admin',
        target_language_id: targetLanguageId || '1',
        target_company: targetCompany || '1000'
      };

      await apiPost('/program-generator', payload);
      alert('Programm gespeichert!');
    } catch (err) {
      console.error('Save Error:', err);
      alert('Fehler beim Speichern');
    }
  };

  const saveToFile = async () => {
    if (!programName || !generatedCode) return;

    try {
      await apiPost('/program-generator', {
        function: 'savefile',
        program_name: programName,
        program_code: generatedCode,
        target_path: 'src/modules/generated/'
      });
      alert(`Datei gespeichert!\nÖffne: /test-generated?progname=${programName}`);
    } catch (err) {
      console.error('Save File Error:', err);
      alert('Fehler beim Datei-Speichern');
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
            <h2>Schritt 1: Formular-Konfiguration</h2>
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
                <label className="form-label">Firma</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="input-field"
                  placeholder="z.B. 1000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Benutzer</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  className="input-field"
                  placeholder="z.B. admin"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sprache-ID</label>
                <input
                  type="text"
                  value={targetLanguageId}
                  onChange={(e) => setTargetLanguageId(e.target.value)}
                  className="input-field"
                  placeholder="z.B. 1"
                />
              </div>
              <div className="form-group" style={{ alignSelf: 'flex-end' }}>
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
                  <button onClick={saveToFile} className="btn btn-info flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Als Datei speichern
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

export default ProgramGenerator;