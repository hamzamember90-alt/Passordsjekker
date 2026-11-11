// app.js
// Connects the page (index.html) to the logic in pwned.js and strength.js.
// Text is written with textContent only, never innerHTML, so nothing the user
// types can be run as HTML.

import { checkPassword, API_URL } from './pwned.js';
import { estimateStrength } from './strength.js';

const $ = (id) => document.getElementById(id);

const form = $('check-form');
const input = $('password');
const showBox = $('show-password');
const button = $('check-button');
const meter = $('meter');
const strengthLabel = $('strength-label');
const strengthTips = $('strength-tips');
const resultBox = $('result-box');
const resultTitle = $('result-title');
const resultDetail = $('result-detail');
const hashPrefix = $('hash-prefix');
const requestLine = $('request-line');

const PLACEHOLDER = '?????';
const numberFormat = new Intl.NumberFormat('nb-NO');

// crypto.subtle only exists on https pages and on localhost.
const hashSupported = Boolean(window.crypto && window.crypto.subtle);

// Every check gets a number. If the user types again while a check is running,
// the number changes and the old answer is ignored.
let latestRun = 0;
let busy = false;

// Live and local: runs on every keystroke, never touches the network.
function showStrength() {
  const strength = estimateStrength(input.value);
  meter.dataset.level = String(strength.level);
  strengthLabel.textContent = strength.label;

  strengthTips.replaceChildren();
  for (const tip of strength.tips) {
    const item = document.createElement('li');
    item.textContent = tip;
    strengthTips.append(item);
  }
}

function showResult(state, title, detail) {
  resultBox.hidden = false;
  resultBox.dataset.state = state;
  resultTitle.textContent = title;
  resultDetail.textContent = detail;
}

function clearResult() {
  resultBox.hidden = true;
  resultTitle.textContent = '';
  resultDetail.textContent = '';
}

// The "what was sent" part of the page.
function showSent(prefix) {
  hashPrefix.textContent = prefix;
  // The <wbr> lets a narrow screen break the line right before the prefix.
  requestLine.replaceChildren('GET ' + API_URL, document.createElement('wbr'), prefix);
}

function resetSent() {
  showSent(PLACEHOLDER);
}

function setBusy(isBusy) {
  busy = isBusy;
  button.textContent = isBusy ? 'Sjekker …' : 'Sjekk passord';
  button.setAttribute('aria-busy', String(isBusy));
}

function showUnsupported() {
  showResult(
    'error',
    'Støttes ikke her',
    'Nettleseren kan bare regne ut hashen når siden åpnes via https eller localhost.'
  );
}

// The breach check only runs when the form is submitted, not on every key,
// because the API asks for that.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;

  if (!hashSupported) {
    showUnsupported();
    return;
  }

  const password = input.value;
  if (password === '') {
    showResult('neutral', 'Mangler passord', 'Skriv inn et passord først.');
    resetSent();
    input.focus();
    return;
  }

  const run = ++latestRun;
  setBusy(true);
  clearResult();
  resetSent();

  try {
    const { count, prefix } = await checkPassword(password);
    if (run !== latestRun) return; // the user typed again, so this answer is old

    showSent(prefix);
    if (count > 0) {
      const times = count === 1 ? 'gang' : 'ganger';
      showResult(
        'bad',
        'Funnet i lekkasjer',
        `Passordet er sett ${numberFormat.format(count)} ${times} i kjente datalekkasjer. Ikke bruk det noe sted.`
      );
    } else {
      showResult(
        'ok',
        'Ikke funnet',
        'Passordet står ikke i kjente datalekkasjer. Det betyr ikke at det er trygt, bare at det ikke finnes i dette datasettet.'
      );
    }
  } catch (error) {
    if (run !== latestRun) return;

    console.error(error);
    showResult(
      'error',
      'Sjekken feilet',
      'Fikk ikke kontakt med Pwned Passwords. Sjekk nettverket og prøv igjen.'
    );
  } finally {
    if (run === latestRun) setBusy(false);
  }
});

// Typing means the old result no longer belongs to the password in the field.
input.addEventListener('input', () => {
  latestRun++; // forget any check that is still running
  setBusy(false);
  clearResult();
  resetSent();
  showStrength();
});

showBox.addEventListener('change', () => {
  input.type = showBox.checked ? 'text' : 'password';
});

// Start state.
resetSent();
showStrength();
if (!hashSupported) showUnsupported();
