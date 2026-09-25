// Nach der E-Mail-Bestätigung hängt Supabase Sitzungs-Tokens als #-Fragment an diese Adresse.
// Die Seite braucht sie nicht — sofort aus Adresszeile und Verlauf entfernen. Trägt der Link
// stattdessen einen Fehler (abgelaufen, schon benutzt), sagt die Seite das statt „bestätigt".
(function () {
  if (!location.hash) return;
  var fehler = /(^#|&)error=/.test(location.hash);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  if (!fehler) return;
  var h = document.querySelector('h1'), p = document.querySelectorAll('.card > p');
  if (h) { h.textContent = 'Link ungültig oder abgelaufen'; h.style.color = '#c0392b'; }
  if (p[0]) p[0].textContent = 'Der Bestätigungslink wurde schon benutzt oder ist abgelaufen.';
  if (p[1]) p[1].textContent = 'Melde dich in der OfficePilotPro-App an — ist das Konto noch nicht bestätigt, schickt dir die App einen neuen Link.';
})();
