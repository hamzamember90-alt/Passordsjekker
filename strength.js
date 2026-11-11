// strength.js
// A rough, local estimate of how strong a password is. Nothing leaves the device.
//
// Idea: strength comes from length and unpredictability. We start with
// "number of characters x bits per character" and then remove the characters
// that are easy to guess: repeats, runs like abc or 321, and common passwords.
// It is only a guide. See the README for what it cannot do.

// Passwords and words that are guessed first. Checked in lower case.
const COMMON_WORDS = [
  'password', 'passord', '123456', '12345678', 'qwerty', 'qwertyuiop', 'asdfgh',
  'zxcvbn', 'abc123', 'letmein', 'welcome', 'admin', 'login', 'iloveyou',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'master', '111111',
  '123123', '1q2w3e4r', 'hallo', 'norge',
];

// People swap letters for symbols that look alike: p@ssw0rd.
const LOOK_ALIKES = {
  '@': 'a', '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '$': 's', '7': 't', '!': 'i',
};

// A level is chosen from the first row where bits is below the limit.
const LEVELS = [
  { below: 28, label: 'Veldig svak' },
  { below: 36, label: 'Svak' },
  { below: 60, label: 'Middels' },
  { below: 80, label: 'Sterk' },
  { below: Infinity, label: 'Veldig sterk' },
];

// How many different characters can each position hold?
// Norwegian letters count as ordinary letters, not as special characters.
function alphabetSize(password) {
  let size = 0;
  if (/[a-zæøå]/.test(password)) size += 29;
  if (/[A-ZÆØÅ]/.test(password)) size += 29;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-ZæøåÆØÅ0-9]/.test(password)) size += 33;
  return size;
}

// Counts characters that add (almost) nothing: the same character again (aa),
// or the next or previous one in a run (ab, 21).
function countPredictable(chars) {
  let count = 0;
  for (let i = 1; i < chars.length; i++) {
    const step = chars[i].codePointAt(0) - chars[i - 1].codePointAt(0);
    if (step >= -1 && step <= 1) count++;
  }
  return count;
}

function countOccurrences(text, word) {
  return text.split(word).length - 1;
}

// Total length of the common words found in the password.
// Look-alike symbols are undone first, so p@ssw0rd is seen as password.
function lengthOfCommonWords(password) {
  const lower = password.toLowerCase();
  const undone = Array.from(lower)
    .map((char) => LOOK_ALIKES[char] || char)
    .join('');

  let total = 0;
  for (const word of COMMON_WORDS) {
    const times = Math.max(countOccurrences(lower, word), countOccurrences(undone, word));
    total += times * word.length;
  }
  return total;
}

// Returns { level, label, bits, tips }. Level is 0 for an empty password, otherwise 1 to 5.
export function estimateStrength(password) {
  if (password.length === 0) {
    return { level: 0, label: '', bits: 0, tips: [] };
  }

  const chars = Array.from(password); // an emoji counts as one character
  const predictable = countPredictable(chars);
  const commonLength = lengthOfCommonWords(password);

  const effectiveLength = Math.max(chars.length - predictable - commonLength, 0);
  const bits = Math.round(effectiveLength * Math.log2(alphabetSize(password)));

  const level = LEVELS.findIndex((row) => bits < row.below) + 1;

  const tips = [];
  if (chars.length < 12) {
    tips.push('Lengde teller mest. Prøv minst 12 tegn, gjerne en setning med flere ord.');
  }
  if (commonLength > 0) {
    tips.push('Passordet inneholder et vanlig ord eller passord som er lett å gjette.');
  }
  if (predictable >= 2) {
    tips.push('Unngå gjentatte tegn og rekker som aaa eller 1234.');
  }

  return { level, label: LEVELS[level - 1].label, bits, tips };
}
