// API Client für GEMIS React
// Zentrale API-Kommunikation mit Session-Management
import config from '../../config.json';

interface Config {
  baseUrl: string;
  apiPath: string;
  timeout?: number;
}

interface SessionData {
  session_token?: string;
  company?: string;
  user_name?: string;
  display_name?: string;
  language_id?: number;
}

// Typ für Session-Getter Funktion
type SessionGetter = () => SessionData | null;

// Globale Variable für Session-Getter
let getSessionData: SessionGetter = () => null;

// Funktion zum Registrieren des Session-Getters
export const registerSessionGetter = (getter: SessionGetter): void => {
  getSessionData = getter;
};

// Konfiguration aus config.json
const getConfig = (): Config => {
  return config;
};

// Basis-URL konstruieren
const getBaseURL = (): string => {
  return `${config.baseUrl}${config.apiPath}`;
};

// Session-Header hinzufügen
const addSessionHeaders = (headers: HeadersInit): HeadersInit => {
  let session = getSessionData();
  
  // FALLBACK: Wenn Session aus Context null ist, direkt aus sessionStorage lesen
  if (!session) {
    const sessionToken = sessionStorage.getItem('X-SESSION-TOKEN');
    const company = sessionStorage.getItem('X-COMPANY');
    const userName = sessionStorage.getItem('X-USER-NAME');
    const displayName = sessionStorage.getItem('X-DISPLAY-NAME');
    const languageId = sessionStorage.getItem('X-LANGUAGE-ID');
    
    if (company || userName) {
      session = {
        session_token: sessionToken || undefined,
        company: company || undefined,
        user_name: userName || undefined,
        display_name: displayName || undefined,
        language_id: languageId ? parseInt(languageId) : undefined
      };
    }
  }
  
  if (session) {
    const h = headers as Record<string, string>;
    
    if (session.session_token) {
      h['X-SESSION-TOKEN'] = session.session_token;
    }
    if (session.company) {
      h['X-COMPANY'] = session.company;
    }
    if (session.user_name) {
      h['X-USER-NAME'] = session.user_name;
    }
    if (session.display_name) {
      h['X-DISPLAY-NAME'] = session.display_name;
    }
    if (session.language_id !== undefined) {
      h['X-LANGUAGE-ID'] = String(session.language_id);
    }
  }
  
  return headers;
};

// GET Request
export const apiGet = async (
  endpoint: string,
  params?: URLSearchParams | Record<string, string>
): Promise<any> => {
  let url = `${getBaseURL()}${endpoint}`;
  
  // Parameter hinzufügen
  if (params) {
    const searchParams = params instanceof URLSearchParams 
      ? params 
      : new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  headers = addSessionHeaders(headers);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// POST Request
export const apiPost = async (
  endpoint: string,
  data: any
): Promise<any> => {
  const url = `${getBaseURL()}${endpoint}`;

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  headers = addSessionHeaders(headers);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// PUT Request
export const apiPut = async (
  endpoint: string,
  data: any
): Promise<any> => {
  const url = `${getBaseURL()}${endpoint}`;

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  headers = addSessionHeaders(headers);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// PATCH Request
export const apiPatch = async (
  endpoint: string,
  data: any
): Promise<any> => {
  const url = `${getBaseURL()}${endpoint}`;

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  headers = addSessionHeaders(headers);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// DELETE Request
export const apiDelete = async (
  endpoint: string,
  data?: any
): Promise<any> => {
  const url = `${getBaseURL()}${endpoint}`;

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  headers = addSessionHeaders(headers);

  const options: RequestInit = {
    method: 'DELETE',
    headers,
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Export der Config-Funktionen
export { getConfig };