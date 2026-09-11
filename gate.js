'use strict';

(() => {
  // A playful client-side birthday reveal, not authentication or private hosting.
  const BIRTHDAY_CODE = '1209';
  const gate = $('#birthdayGate');
  const experience = $('#birthdayExperience');
  const code = $('#birthdayCode');
  let unlocking = false;
  experience.inert = true;
  experience.setAttribute('aria-hidden', 'true');
  gate.showModal();
  $('#gateTitle').focus({ preventScroll: true });
  gate.addEventListener('cancel', event => event.preventDefault());
  code.addEventListener('input', () => {
    code.value = code.value.replace(/[^0-9]/g, '').slice(0, 4);
    code.removeAttribute('aria-invalid');
    $('#gateMessage').textContent = 'Four little digits. A whole lot of love inside.';
    gate.classList.remove('wrong-key');
  });
  $('#birthdayUnlock').addEventListener('submit', event => {
    event.preventDefault();
    if (unlocking) return;
    if (code.value !== BIRTHDAY_CODE) {
      code.setAttribute('aria-invalid', 'true');
      $('#gateMessage').textContent = code.value.length !== 4 ? 'Just four digits, birthday boy. Day first, then month.' : 'Almost, little bhai. Think 12 September — day, then month.';
      gate.classList.add('wrong-key');
      code.focus(); code.select();
      return;
    }
    unlocking = true;
    $('#unlockButton').disabled = true;
    $('#gateMessage').textContent = 'That’s your key. Welcome to a lifetime of being loved. ♡';
    gate.classList.add('gate-unlocking');
    const reveal = () => {
      gate.close();
      document.body.classList.remove('birthday-locked');
      experience.inert = false;
      experience.removeAttribute('aria-hidden');
      // A bookmarked chapter must not skip the first memory after unlocking.
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('#heroTitle').tabIndex = -1;
      $('#heroTitle').focus({ preventScroll: true });
      window.dispatchEvent(new Event('navit:unlock'));
      updateScroll();
    };
    if (window.navitMotionPaused) reveal(); else setTimeout(reveal, 650);
  });
})();
