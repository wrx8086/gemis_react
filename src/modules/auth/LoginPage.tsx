import React, { useState, useEffect } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { Eye, EyeOff } from 'lucide-react';
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

    if (!user_name.trim()) {
      setError('Bitte Benutzername eingeben');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_name: user_name,
          password: password,
          company: selectedCompany
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('lastUserName', user_name);
        
        // Backend gibt session-Daten verschachtelt zurück: data.session.session_token
        const sessionData = data.session || data;
        
        // Session-Token aus verschiedenen möglichen Feldnamen holen
        const sessionToken = sessionData.session_token || sessionData.sessionToken || data.session_token || data.token || '';
        
        // Debug: Was kommt vom Backend?
        console.log('Login Response:', data);
        console.log('Session Data:', sessionData);
        console.log('Session Token:', sessionToken);
        
        // Session-Daten im Context speichern - MIT session_token!
        setSession({
          session_token: sessionToken,
          company: sessionData.company || selectedCompany,
          user_name: sessionData.user_name || user_name,
          display_name: sessionData.display_name || user_name,
          language_id: sessionData.language_id || 1,
          labels: data.labels
        });

        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Login fehlgeschlagen');
      }
    } catch (err) {
      console.error('Login Fehler:', err);
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card-wrapper">
        <div className="login-card">
          {/* Logo & Header */}
          <div className="login-header">
            <h1 className="login-title">AnalytikData PRIME GmbH</h1>
            <p className="login-subtitle">GeMIS Anmeldung</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="login-form">
            {/* Benutzer */}
            <div className="form-group">
              <label htmlFor="username" className="label">
                Benutzer:
              </label>
              <input
                id="username"
                type="text"
                value={user_name}
                onChange={(e) => setUserName(e.target.value)}
                className="input-field"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            {/* Passwort */}
            <div className="form-group">
              <label htmlFor="password" className="label">
                Passwort:
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field password-field"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4" />
                  ) : (
                    <Eye className="w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Firma */}
            <div className="form-group">
              <label htmlFor="company" className="label">
                Firma:
              </label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="select-field"
                disabled={isLoading}
              >
                {companies.map((company) => (
                  <option key={company.company} value={company.company}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-full-width"
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>

          {/* Footer */}
          <div className="layout-footer">
            © 2024 AnalytikData PRIME GmbH
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;