// Testseite (nur E2E): Läuft sql-asm.js unter der CSP der App ohne WebAssembly (im Hauptthread)?
// Ergebnis in window.asmErgebnis = { modus, werte } bzw. { fehler }.
window.cspVerletzungen = [];
document.addEventListener('securitypolicyviolation', (e) => {
  window.cspVerletzungen.push(`${e.violatedDirective} ${e.blockedURI}`);
});
window.asmErgebnis = (async () => {
  try {
    const SQL = await window.initSqlJs();
    const db = new SQL.Database();
    db.exec('CREATE TABLE Probe (Nr INTEGER PRIMARY KEY, Wert TEXT)');
    db.exec("INSERT INTO Probe VALUES (1, 'eins'), (2, 'zwei')");
    const werte = db.exec('SELECT Nr, Wert FROM Probe ORDER BY Nr')[0].values;
    db.close();
    return { webAssembly: typeof WebAssembly, werte };
  } catch (fehler) {
    return { fehler: (fehler && fehler.message) || String(fehler) };
  }
})();
