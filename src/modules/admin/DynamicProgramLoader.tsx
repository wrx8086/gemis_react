import React, { useState, useEffect } from 'react';
// @ts-ignore - Babel standalone has no TypeScript definitions
import * as Babel from '@babel/standalone';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';
import {
  Save, Plus, Copy, Trash2, X,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  Edit2, AlertCircle, ArrowUp, ArrowDown, Search, Code, FilterX
} from 'lucide-react';

const DynamicProgramLoader: React.FC = () => {
  const [searchParams] = useSearchParams();
  const programName = searchParams.get('progname');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    loadProgram();
  }, [programName]);

  const loadProgram = async () => {
    if (!programName) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        function: 'load',
        program_name: programName
      });

      const data = await apiGet('/program-generator', params);

      // Versuche verschiedene mögliche Feldnamen für den Code
      let programCode = data.program_code 
        || data.programCode 
        || data.code 
        || data.tsx_code 
        || data.source_code
        || data.tsxCode
        || data.sourceCode;

      // Falls verschachtelt (z.B. data.result.program_code)
      if (!programCode && data.result) {
        programCode = data.result.program_code 
          || data.result.programCode 
          || data.result.code
          || data.result.tsx_code;
      }

      // Falls Array mit einem Element
      if (!programCode && Array.isArray(data) && data.length > 0) {
        programCode = data[0].program_code 
          || data[0].programCode 
          || data[0].code;
      }

      if (!programCode || programCode.length === 0) {
        throw new Error(`Kein Code zurückgegeben. Verfügbare Felder: ${Object.keys(data).join(', ')}`);
      }

      // Dynamisch kompilieren und laden
      const compiledComponent = compileComponent(programCode, programName);
      setComponent(() => compiledComponent);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      setIsLoading(false);
    }
  };

  const compileComponent = (code: string, componentName: string): React.ComponentType => {
    try {
      // Konvertiere escaped newlines
      const codeWithNewlines = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      
      // Entferne ALLE Import-Statements
      const lines = codeWithNewlines.split('\n');
      const nonImportLines: string[] = [];
      let inImport = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed.startsWith('import ')) {
          inImport = true;
        }
        
        if (inImport) {
          if (line.includes(';')) {
            inImport = false;
          }
          continue;
        }
        
        nonImportLines.push(line);
      }

      let cleanCode = nonImportLines.join('\n');
      
      // Entferne 'export default'
      cleanCode = cleanCode.replace(/export\s+default\s+\w+;?\s*/g, '');
      cleanCode = cleanCode.trim();

      // Prüfe ob noch Import-Statements vorhanden sind
      if (cleanCode.includes('import ')) {
        throw new Error('Code enthält noch Import-Statements!');
      }

      // Babel-Transpilation für JSX → JavaScript
      let transpiledCode: string;
      try {
        const babelResult = Babel.transform(cleanCode, {
          presets: ['react'],
          filename: `${componentName}.jsx`
        });
        transpiledCode = babelResult.code || '';
      } catch (babelError) {
        throw new Error(`Babel-Fehler: ${babelError instanceof Error ? babelError.message : 'Unbekannt'}`);
      }

      // Erstelle Funktion mit React-Context und allen Dependencies
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'useRef',
        'apiGet',
        'apiPost',
        'apiPatch',
        'apiDelete',
        'BaseLayout',
        'useSession',
        'useNavigate',
        'Save',
        'Plus',
        'Copy',
        'Trash2',
        'X',
        'ChevronsLeft',
        'ChevronLeft',
        'ChevronRight',
        'ChevronsRight',
        'Edit2',
        'AlertCircle',
        'ArrowUp',
        'ArrowDown',
        'Search',
        'Code',
        'FilterX',
        transpiledCode + '\nreturn ' + componentName + ';'
      );

      // Führe aus mit Abhängigkeiten
      const { useState, useEffect, useRef } = React;
      const CompiledComponent = componentFunction(
        React,
        useState,
        useEffect,
        useRef,
        apiGet,
        apiPost,
        apiPatch,
        apiDelete,
        BaseLayout,
        useSession,
        useNavigate,
        Save,
        Plus,
        Copy,
        Trash2,
        X,
        ChevronsLeft,
        ChevronLeft,
        ChevronRight,
        ChevronsRight,
        Edit2,
        AlertCircle,
        ArrowUp,
        ArrowDown,
        Search,
        Code,
        FilterX
      );

      return CompiledComponent;
    } catch (err) {
      throw new Error('Fehler beim Kompilieren des Codes');
    }
  };

  if (isLoading) {
    return (
      <BaseLayout title={programName || 'Programm wird geladen'} showUserInfo={true}>
        <div className="container-app">
          <div className="spinner"></div>
          <p>Lade Programm...</p>
        </div>
      </BaseLayout>
    );
  }

  if (error) {
    return (
      <BaseLayout title="Fehler beim Laden" showUserInfo={true}>
        <div className="container-app">
          <div className="card">
            <div className="card-header">
              <h2>Fehler</h2>
            </div>
            <div className="card-body">
              <p className="text-danger">{error}</p>
            </div>
          </div>
        </div>
      </BaseLayout>
    );
  }

  if (!Component) {
    return (
      <BaseLayout title="Kein Programm" showUserInfo={true}>
        <div className="container-app">
          <p>Kein Programm geladen</p>
        </div>
      </BaseLayout>
    );
  }

  return <Component key={programName} />;
};

export default DynamicProgramLoader;