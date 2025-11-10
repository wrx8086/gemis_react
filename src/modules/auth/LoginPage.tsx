import React, { useState, useEffect } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { Eye, EyeOff } from 'lucide-react';
import BaseLayout from '../../components/layout/BaseLayout';
import config from '../../config.json';

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

  // API-URLs aus config
  const apiBaseUrl = `${config.baseUrl}${config.apiPath}`;

  useEffect(() => {
    loadCompanies();
    const lastUserName = localStorage.getItem('lastUserName');
    if (lastUserName) {
      setUserName(lastUserName);
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/login/init`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        
        const selectedComp = data.companies.find((c: Company) => c.selected);
        if (selectedComp) {
          setSelectedCompany(selectedComp.company);
        } else {
          setSelectedCompany(data.companies[0].company);
        }
        
        if (data.user_name) {
          setUserName(data.user_name);
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 100);
        }
      } else {
        setCompanies([
          { company: '1000', company_name: 'Test AG', selected: true }
        ]);
        setSelectedCompany('1000');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Companies:', err);
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
      const response = await fetch(`${apiBaseUrl}/login`, {
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
        localStorage.setItem('lastUserName', user_name);
        
        setSession({
          session_token: data.session_token || '',
          company: data.company,
          user_name: data.user_name,
          display_name: data.display_name || data.user_name,
          language_id: data.language_id
        });
        
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
          <div className="card">
            {error && (
              <div className="alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Benutzername */}
              <div className="form-group">
                <label htmlFor="user_name" className="label">
                  Benutzer:
                </label>
                <input
                  id="user_name"
                  name="user_name"
                  type="text"
                  autoComplete="username"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Passwort */}
              <div className="form-group">
                <label htmlFor="password" className="label">
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
                    className="input-field pr-12"
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
              <div className="form-group">
                <label htmlFor="company" className="label">
                  Firma:
                </label>
                <select
                  id="company"
                  name="company"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="select-field"
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
                className="btn btn-secondary w-full"
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
