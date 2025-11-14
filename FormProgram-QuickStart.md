# FormProgram - Quick Start Guide

## 🚀 In 5 Minuten zur ersten dynamischen Maske

### Schritt 1: Backend-Endpoint einrichten

1. Datei `formprogram.p` im PASOE REST Service erstellen
2. In `handler-config.xml` registrieren:

```xml
<resource name="formprogram" URI="/formprogram" handler="formprogram.p">
  <method name="GET" />
  <method name="POST" />
  <method name="PATCH" />
  <method name="DELETE" />
</resource>
```

3. PASOE neu starten

### Schritt 2: Erste Form im FormDesigner erstellen

1. Einloggen in GeMIS
2. Navigation: **Administration → Form Designer**
3. Neue Form erstellen:

```
Company: PRIME
User: walti
Language: Deutsch (1)
Form Title: Test Benutzer
Form ID: test_users
Tables: users
```

4. Felder hinzufügen:
   - **id** (integer, Key, nicht editierbar, in Tabelle)
   - **user_name** (character, required, in Tabelle)
   - **display_name** (character, in Tabelle)
   - **language_id** (integer, required, in Tabelle)
   - **password** (character, password=true)

5. **Speichern** klicken

### Schritt 3: Menu-Eintrag erstellen

1. Navigation: **Administration → Menu Designer**
2. Neuen Eintrag unter "Administration" hinzufügen:

```
Menu-Text: Test Benutzerverwaltung
Link: /formprogram?formid=test_users
Open Mode: simple
Admin: Ja
```

3. **Speichern** klicken

### Schritt 4: Testen!

1. Im Menu auf **"Test Benutzerverwaltung"** klicken
2. Du solltest jetzt die dynamische Maske sehen! 🎉

---

## ✅ Was funktioniert?

- ✅ **Neu**: Leeren Datensatz erstellen
- ✅ **Bearbeiten**: Bestehenden Datensatz ändern (Key-Felder readonly)
- ✅ **Kopieren**: Datensatz duplizieren (Key-Felder werden geleert)
- ✅ **Löschen**: Datensatz entfernen (mit Bestätigung)
- ✅ **Speichern**: Änderungen in DB schreiben
- ✅ **Abbrechen**: Änderungen verwerfen
- ✅ **Navigation**: Erster/Vorheriger/Nächster/Letzter Datensatz
- ✅ **Grid-Anzeige**: Alle Datensätze mit showInTable=true Feldern
- ✅ **ENTER = TAB**: Automatisches Springen zum nächsten Feld
- ✅ **Dirty-Flag**: Warnung bei ungespeicherten Änderungen
- ✅ **Session-Management**: Automatisches Filtern nach Mandant/User

---

## 🎯 Tipps & Tricks

### Verschiedene Feldtypen testen

```javascript
// Character/Text
type: "character", maxLength: 50

// Ganzzahl
type: "integer", align: "right"

// Dezimalzahl
type: "decimal", decimalPlaces: 2, align: "right"

// Checkbox
type: "logical"

// Datum
type: "date"

// Passwort
type: "character", password: true

// Verstecktes Feld
type: "character", hidden: true
```

### Key-Felder richtig setzen

```javascript
// Einfacher Key
fieldName: "id", keyfield: true

// Composite Key
fieldName: "company", keyfield: true
fieldName: "user_id", keyfield: true
```

### Grid-Spalten definieren

```javascript
// Wird in Tabelle angezeigt
showInTable: true

// Wird nur im Formular angezeigt
showInTable: false
```

### Felder gruppieren

```javascript
// Feld auf neue Zeile (volle Breite)
newLine: true

// Normales Feld (50% Breite in Grid)
newLine: false
```

---

## 🐛 Troubleshooting

### "Form nicht gefunden"

**Problem:** `formid` Parameter fehlt oder falsch

**Lösung:** 
```
URL muss sein: /formprogram?formid=EXAKT_WIE_IM_DESIGNER
```

### "Keine Datensätze"

**Problem:** Backend liefert leeres Array

**Lösung:** 
- Prüfen ob Tabelle Daten hat
- Prüfen ob Mandant-Filter korrekt
- Browser Console für API-Fehler prüfen

### "Key-Felder nicht readonly"

**Problem:** `keyfield` Flag nicht gesetzt

**Lösung:** 
```javascript
Im FormDesigner: Feld markieren → Keyfield Checkbox aktivieren
```

### "ENTER funktioniert nicht wie TAB"

**Problem:** Button-Typ falsch

**Lösung:** 
```html
Statt: <input type="submit">
Nutze: <button type="button">
```

---

## 📝 Nächste Schritte

### Phase 2: Combo-Box Implementation
- [ ] Backend-Endpoint für Dropdown-Optionen
- [ ] `field.source` auswerten (z.B. "languages", "companies")
- [ ] Dynamisches Laden der Select-Options

### Phase 3: Validierung
- [ ] Required-Felder vor Save prüfen
- [ ] Format-Validierung (Email, Tel, URL)
- [ ] Custom-Validierung per Config

### Phase 4: Multi-Table Support
- [ ] Master-Detail Beziehungen
- [ ] Sub-Grids für Child-Records
- [ ] JOIN-Queries

### Phase 5: Erweiterte Features
- [ ] Suche & Filter
- [ ] Sortierung
- [ ] Pagination
- [ ] Excel-Export
- [ ] Print-Funktion

---

## 📞 Support

Bei Fragen oder Problemen:
- Frontend: `src/modules/admin/FormProgram.tsx`
- Backend: `formprogram.p`
- Dokumentation: `FormProgram-README.md`

**Viel Erfolg! 🚀**
