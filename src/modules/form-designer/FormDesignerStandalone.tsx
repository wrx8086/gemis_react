import React, { useEffect } from 'react';
import { registerSessionGetter } from '../../shared/api/apiClient';
import FormDesigner from '../admin/FormDesigner';

/**
 * Standalone FormDesigner Wrapper
 * 
 * Dieser Wrapper ermöglicht es, den FormDesigner OHNE Login/Session zu starten.
 * Nützlich für:
 * - Entwicklung und Tests
 * - Eigenständige Nutzung außerhalb des Hauptsystems
 * - Demos
 * 
 * Der Wrapper stellt eine Mock-Session bereit, damit API-Calls funktionieren.
 */

const FormDesignerStandalone: React.FC = () => {
  useEffect(() => {
    // Mock-Session für API-Calls registrieren
    // Dies ermöglicht API-Calls ohne echte Anmeldung
    const mockSession = {
      session_token: 'STANDALONE_MODE',
      mandant_id: '1000',
      username: 'standalone',
      language_id: 1
    };

    // Session-Getter registrieren (wird vom apiClient verwendet)
    registerSessionGetter(() => mockSession);

    console.log('🎨 FormDesigner im Standalone-Modus gestartet');
    console.log('📝 Mock-Session:', mockSession);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: 0,
      margin: 0
    }}>
      {/* FormDesigner ohne zusätzliches Layout */}
      <FormDesigner />
    </div>
  );
};

export default FormDesignerStandalone;
