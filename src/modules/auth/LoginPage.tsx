import React, { useState, useEffect } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { Eye, EyeOff } from 'lucide-react';
import BaseLayout from '../../components/layout/BaseLayout';

interface Company {
  company: string;
  company_name: string;
  selected?: boolean;
}

const LoginPage: React.FC = () => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  const { setSession } = useSession();

  useEffect(() => {
    loadCompanies();
    // zuletzt benutzten Benutzernamen laden
    const lastUserName = localStorage.getItem('lastUserName');
    if (lastUserName) {
      setUserName(lastUserName);
      // Focus auf Passwort-Feld setzen
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch('http://APOHVM001.int.anadatprime.ch:8842/web/login/init', {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('📋 Companies geladen:', data);
      
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        
        // Vorausgewählte Company finden
        const selectedComp = data.companies.find((c: Company) => c.selected);
        if (selectedComp) {
          setSelectedCompany(selectedComp.company);
        } else {
          setSelectedCompany(data.companies[0].company);
        }
        
        // Benutzername vorausfüllen, falls vorhanden
        if (data.user_name) {
          setUserName(data.user_name);
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 100);
        }
      } else {
        // Fallback
        setCompanies([
          { company: '1000', company_name: 'Test AG', selected: true }
        ]);
        setSelectedCompany('1000');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Companies:', err);
      // Fallback
      setCompanies([
        { company: '1000', company_name: 'Test AG', selected: true }
      ]);
      setSelectedCompany('1000');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://APOHVM001.int.anadatprime.ch:8842/web/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_name,
          password,
          company: selectedCompany
        })
      });

      const data = await response.json();

      if (data.success) {
        // Benutzername für nächstes Mal speichern
        localStorage.setItem('lastUserName', user_name);
        
        // Session setzen
        setSession({
          session_token: data.session_token || '',
          company: data.company,
          user_name: data.user_name,
          display_name: data.display_name || data.user_name,
          language_id: data.language_id
        });
        
        // Kurz warten damit Session gespeichert wird, dann Seite neu laden
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setError(data.message || 'Anmeldung fehlgeschlagen');
      }
    } catch (err) {
      console.error('Login-Fehler:', err);
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseLayout 
      title="GeMIS Anmeldung"
      footerCenter="© 2024 AnalytikData PRIME GmbH"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Benutzername */}
              <div>
                <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Benutzer:
                </label>
                <input
                  id="user_name"
                  name="user_name"
                  type="text"
                  autoComplete="username"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Passwort */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort:
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Firma:
                </label>
                <select
                  id="company"
                  name="company"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {companies.map((c) => (
                    <option key={c.company} value={c.company}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Anmelden Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default LoginPage;
