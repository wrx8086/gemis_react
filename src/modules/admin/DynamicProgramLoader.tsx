import React, { useState, useEffect } from 'react';
import { apiGet } from '../../shared/api/apiClient';
import BaseLayout from '../../components/layout/BaseLayout';
import { useParams } from 'react-router-dom';

const DynamicProgramLoader: React.FC = () => {
  const { programName } = useParams<{ programName: string }>();
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

      if (!data.program_code) {
        throw new Error('Kein Code zurückgegeben');
      }

      // Dynamisch kompilieren und laden
      const compiledComponent = compileComponent(data.program_code);
      setComponent(() => compiledComponent);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Load Program Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      setIsLoading(false);
    }
  };

  const compileComponent = (code: string): React.ComponentType => {
    try {
      // Entferne Import-Statements (werden nicht benötigt, da bereits geladen)
      const cleanCode = code
        .replace(/import.*from.*;/g, '')
        .replace(/export default .*;/g, '');

      // Erstelle Funktion mit React-Context
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'apiGet',
        'apiPost',
        'apiPatch',
        'apiDelete',
        'BaseLayout',
        `
        ${cleanCode}
        return ${programName};
        `
      );

      // Führe aus mit Abhängigkeiten
      const { useState, useEffect } = React;
      const CompiledComponent = componentFunction(
        React,
        useState,
        useEffect,
        apiGet,
        apiGet, // apiPost
        apiGet, // apiPatch
        apiGet, // apiDelete
        BaseLayout
      );

      return CompiledComponent;
    } catch (err) {
      console.error('Compile Error:', err);
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

  return <Component />;
};

export default DynamicProgramLoader;