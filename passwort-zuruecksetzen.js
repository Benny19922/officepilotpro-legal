// Passwort-Reset-Seite: liest die Wiederherstellungs-Sitzung aus dem Link, prüft die
// Passwortregel (identisch mit Supabase und der App) und speichert das neue Passwort.
(function () {
  var SUPABASE_URL = 'https://smxskaqoijdagppikdsp.supabase.co';
  // Öffentlicher anon-Schlüssel — gewährt ohne Anmeldung keinen Datenzugriff.
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteHNrYXFvaWpkYWdwcGlrZHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTk2MTMsImV4cCI6MjA5Njc5NTYxM30._iIchkPdEHuuXwW4DImpR9risFRqsiNRgaH6M5Q9DcY';

  var $ = function (id) { return document.getElementById(id); };
  var msg = $('msg'), save = $('save'), form = $('form'), intro = $('intro');
  var hasSession = false;

  function show(text, ok) { msg.textContent = text; msg.className = 'msg ' + (ok ? 'ok' : 'err'); }

  // Tokens aus Adresszeile und Browserverlauf entfernen, sobald sie gelesen sind.
  function fragmentEntfernen() {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }

  function linkUngueltig() {
    form.classList.add('hidden');
    intro.textContent = 'Der Link ist ungültig oder abgelaufen. Bitte fordere in der App einen neuen an.';
  }

  // Dieselbe Regel wie in Supabase (Authentication → Passwörter) und in der App.
  function regelVerletzt(pw) {
    if (pw.length < 10) return 'Das Passwort braucht mindestens 10 Zeichen.';
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Das Passwort braucht Buchstaben und Ziffern.';
    return null;
  }

  // Abgleich mit bekannten Datenlecks (Have I Been Pwned, k-Anonymität): Nur die ersten
  // fünf Zeichen des SHA-1-Prüfwerts gehen raus, das Passwort selbst nie. Netzfehler → false,
  // damit ein Reset nicht an einem fremden Dienst hängen bleibt.
  async function geleakt(pw) {
    try {
      var buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pw));
      var hex = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase();
      var praefix = hex.slice(0, 5), suffix = hex.slice(5);
      var res = await fetch('https://api.pwnedpasswords.com/range/' + praefix, { headers: { 'Add-Padding': 'true' } });
      if (!res.ok) return false;
      var zeilen = (await res.text()).split(/\r?\n/);
      for (var i = 0; i < zeilen.length; i++) {
        var teile = zeilen[i].split(':');
        if (teile.length === 2 && teile[0].trim() === suffix && parseInt(teile[1], 10) > 0) return true;
      }
      return false;
    } catch (e) { return false; }
  }
  window.passwortGeleakt = geleakt; // für Prüfungen in der Browser-Konsole

  // Abgelaufener oder ungültiger Link: Supabase hängt #error=… an.
  if (/(^#|&)error=/.test(location.hash)) {
    fragmentEntfernen();
    linkUngueltig();
    return;
  }

  var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { detectSessionInUrl: true, flowType: 'implicit' }
  });

  function enableForm() {
    if (hasSession) return;
    hasSession = true;
    save.disabled = false;
    fragmentEntfernen();
  }

  client.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY' || session) enableForm();
  });

  setTimeout(function () {
    client.auth.getSession().then(function (res) {
      if (res.data && res.data.session) enableForm();
      else if (!hasSession) linkUngueltig();
    });
  }, 1500);

  save.addEventListener('click', async function () {
    var pw1 = $('pw1').value, pw2 = $('pw2').value;
    var fehler = regelVerletzt(pw1);
    if (fehler) { show(fehler, false); return; }
    if (pw1 !== pw2) { show('Die Passwörter stimmen nicht überein.', false); return; }
    save.disabled = true; show('Prüfe …', true);
    if (await geleakt(pw1)) {
      show('Dieses Passwort taucht in bekannten Datenlecks auf und darf nicht verwendet werden. Bitte ein anderes wählen.', false);
      save.disabled = false; return;
    }
    show('Speichern …', true);
    client.auth.updateUser({ password: pw1 }).then(function (res) {
      if (res.error) { show('Fehler: ' + res.error.message, false); save.disabled = false; return; }
      form.classList.add('hidden');
      intro.classList.add('hidden');
      show('✓ Passwort geändert. Du kannst dich jetzt in der OfficePilotPro-App mit dem neuen Passwort anmelden.', true);
      client.auth.signOut();
    });
  });
})();
