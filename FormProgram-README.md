# FormProgram - Dynamic CRUD System

## Übersicht

FormProgram ist ein dynamisches CRUD-System, das auf Form-Definitionen aus dem FormDesigner basiert. Es ermöglicht die automatische Generierung von Bearbeitungsmasken ohne Code-Änderungen.

## URL-Struktur

```
/formprogram?formid=users
/formprogram?formid=addresses
/formprogram?formid=xyz
```

Der Parameter `formid` entspricht der `formId` aus der FormDesigner-Konfiguration.

## Session-Headers (automatisch gesetzt)

Alle Requests enthalten folgende Header:
- `X-SESSION-TOKEN`: Session-Token des Benutzers
- `X-COMPANY`: Mandant/Company
- `X-USER-NAME`: Benutzername
- `X-LANGUAGE-ID`: Sprach-ID (1=DE, 2=EN, 3=FR)

## Backend-Endpoints (PASOE REST Service)

### 1. Form-Konfiguration laden

**Endpoint:** `GET /web/formprogram?function=init&form_id={formId}`

**Request Headers:**
```
X-SESSION-TOKEN: abc123
X-COMPANY: PRIME
X-USER-NAME: walti
X-LANGUAGE-ID: 1
```

**Response:**
```json
{
  "dsResponse": {
    "config": "{\"formTitle\":\"Benutzerverwaltung\",\"formId\":\"users\",\"fields\":[...]}"
  }
}
```

Die `config` ist ein JSON-String der FormDesigner-Konfiguration.

---

### 2. Datensätze laden

**Endpoint:** `GET /web/formprogram?function=read&table={tableName}`

**Request Headers:** (wie oben)

**Response:**
```json
{
  "dsResponse": {
    "records": [
      {
        "id": 1,
        "user_name": "walti",
        "display_name": "Walter Schwab",
        "language_id": 1
      },
      {
        "id": 2,
        "user_name": "admin",
        "display_name": "Administrator",
        "language_id": 1
      }
    ]
  }
}
```

**Wichtig:** 
- Feldnamen müssen exakt mit `field.fieldName` aus der Config übereinstimmen
- Filtering nach Mandant (X-COMPANY) erfolgt automatisch im Backend

---

### 3. Datensatz erstellen (ADD/COPY)

**Endpoint:** `POST /web/formprogram`

**Request Headers:** (wie oben)

**Request Body:**
```json
{
  "table": "users",
  "record": {
    "user_name": "new_user",
    "display_name": "New User",
    "language_id": 1,
    "password": "secret123"
  }
}
```

**Response:**
```json
{
  "dsResponse": {
    "success": true,
    "message": "Datensatz erstellt",
    "id": 3
  }
}
```

---

### 4. Datensatz aktualisieren (UPDATE)

**Endpoint:** `PATCH /web/formprogram`

**Request Headers:** (wie oben)

**Request Body:**
```json
{
  "table": "users",
  "record": {
    "id": 2,
    "user_name": "admin",
    "display_name": "Super Administrator",
    "language_id": 2
  }
}
```

**Response:**
```json
{
  "dsResponse": {
    "success": true,
    "message": "Datensatz aktualisiert"
  }
}
```

**Wichtig:** Key-Felder (field.keyfield=true) müssen im Record enthalten sein!

---

### 5. Datensatz löschen (DELETE)

**Endpoint:** `DELETE /web/formprogram?table={tableName}&{keyField}={keyValue}`

**Beispiele:**
```
DELETE /web/formprogram?table=users&id=3
DELETE /web/formprogram?table=addresses&company=PRIME&address_id=123
```

**Request Headers:** (wie oben)

**Response:**
```json
{
  "dsResponse": {
    "success": true,
    "message": "Datensatz gelöscht"
  }
}
```

---

## Field-Types Mapping

Der FormProgram-Component unterstützt folgende Feldtypen:

| Field Type | HTML Input | Notes |
|------------|------------|-------|
| `character` / `text` | `<input type="text">` | Mit maxLength |
| `integer` | `<input type="number" step="1">` | Rechts ausgerichtet |
| `decimal` | `<input type="number" step="0.01">` | Rechts ausgerichtet |
| `logical` | `<input type="checkbox">` | Boolean |
| `date` | `<input type="date">` | ISO Format |
| `datetime` | `<input type="datetime-local">` | ISO Format |
| `combo-box` | `<select>` | TODO: Dynamische Optionen |
| `password` | `<input type="password">` | Wenn field.password=true |

---

## Field-Flags & Behavior

### `field.keyfield = true`
- Bei UPDATE: Feld wird readonly angezeigt
- Bei DELETE: Wird als URL-Parameter verwendet
- Beispiel: `id`, `company`, `mandant_id`

### `field.required = true`
- Roter Stern (*) wird angezeigt
- TODO: Frontend-Validierung vor Save

### `field.editable = false`
- Feld ist immer readonly (grauer Hintergrund)
- Beispiel: Berechnete Felder, Timestamps

### `field.hidden = true`
- Feld wird nicht im Formular angezeigt
- Aber im currentRecord vorhanden

### `field.showInTable = true`
- Feld wird in der Datentabelle angezeigt
- Wenn mind. 1 Feld showInTable=true: Grid wird gerendert

---

## Edit-Modi

| Modus | Beschreibung | Actions verfügbar |
|-------|--------------|-------------------|
| `view` | Standard-Ansicht | Neu, Bearbeiten, Kopieren, Löschen, Navigation |
| `add` | Neuen Datensatz erstellen | Speichern, Abbrechen |
| `update` | Bestehenden Datensatz bearbeiten | Speichern, Abbrechen |
| `copy` | Datensatz kopieren (Key-Felder leer) | Speichern, Abbrechen |

**Wichtig:** Im Mutationsmodus (add/update/copy) sind alle anderen Aktionen gesperrt!

---

## Navigation

Verfügbar nur im `view`-Modus:

- **Erster Satz** (<<): `handleFirst()` → Springt zu Index 0
- **Vorheriger Satz** (<): `handlePrevious()` → Index - 1
- **Nächster Satz** (>): `handleNext()` → Index + 1
- **Letzter Satz** (>>): `handleLast()` → Springt zum letzten Index

---

## ENTER = TAB Funktionalität

**Verhalten:** 
- ENTER-Taste springt zum nächsten Input-Feld (wie TAB)
- **Ausnahme:** Buttons und Checkboxen (normales Verhalten)

**Implementation:**
```typescript
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Springe zum nächsten Feld...
  }
};
```

Selector für fokussierbare Felder:
```
input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), 
select, 
textarea
```

---

## Dirty-Flag & Confirmation

- `isDirty = true`: Sobald ein Feld geändert wird
- Bei Navigation/Cancel/New: Confirm-Dialog wenn `isDirty === true`
- Nach Save/Cancel: `isDirty = false`

---

## Menu-Integration

Im MenuDesigner kann ein Link so definiert werden:

```
menu_link: /formprogram?formid=users
menu_text: Benutzerverwaltung
openMode: simple
```

Dann wird beim Klick automatisch der FormProgram mit der User-Maske geladen!

---

## Beispiel: User-Form im FormDesigner

```json
{
  "formTitle": "Benutzerverwaltung",
  "formId": "users",
  "fields": [
    {
      "fieldName": "id",
      "label": "ID",
      "type": "integer",
      "table": "users",
      "keyfield": true,
      "editable": false,
      "showInTable": true
    },
    {
      "fieldName": "user_name",
      "label": "Benutzername",
      "type": "character",
      "table": "users",
      "required": true,
      "maxLength": 50,
      "showInTable": true
    },
    {
      "fieldName": "display_name",
      "label": "Anzeigename",
      "type": "character",
      "table": "users",
      "maxLength": 100,
      "showInTable": true
    },
    {
      "fieldName": "password",
      "label": "Passwort",
      "type": "character",
      "table": "users",
      "password": true,
      "maxLength": 100
    },
    {
      "fieldName": "language_id",
      "label": "Sprache",
      "type": "integer",
      "table": "users",
      "required": true,
      "showInTable": true
    }
  ]
}
```

---

## TODO / Erweiterungen

1. **Combo-Box Daten:** 
   - Backend-Endpoint für Dropdown-Optionen
   - `field.source` auswerten

2. **Validierung:**
   - Required-Felder vor Save prüfen
   - Format-Validierung (Email, URL, etc.)

3. **Multi-Table Support:**
   - Master-Detail Beziehungen
   - JOIN-Queries

4. **Suche & Filter:**
   - Suchfeld für Datensätze
   - Filterung nach Kriterien

5. **Sortierung:**
   - Grid-Spalten sortierbar machen

6. **Pagination:**
   - Für große Datenmengen

---

## Testing

### 1. FormDesigner verwenden
- Eine Form erstellen (z.B. "users")
- Felder hinzufügen mit verschiedenen Typen
- Config speichern

### 2. Menu-Eintrag erstellen
```
Menu-Text: Test Form
Link: /formprogram?formid=users
```

### 3. Testen
- Aufrufen über Menu
- Alle CRUD-Operationen testen
- Navigation prüfen
- ENTER=TAB Verhalten prüfen

---

## Ansprechpartner

Bei Fragen zur Implementation:
- Frontend: FormProgram.tsx
- Backend: PASOE REST Service /web/formprogram
- Session-Management: SessionContext.tsx + apiClient.ts

---

**Version:** 1.0  
**Datum:** November 2025  
**Status:** ✅ Frontend implementiert, Backend-Integration ausstehend
