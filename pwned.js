// pwned.js
// Logic for checking a password against Pwned Passwords (Have I Been Pwned).
// There is no DOM code in this file, so it can be tested with Node.
//
// How it works (k-anonymity):
//   1. Hash the password with SHA-1 (done here, on the user's device).
//   2. Send only the first 5 characters of the hash to the API.
//   3. The API answers with every hash ending that starts with those 5 characters.
//   4. Look for our own ending in that list (done here, on the user's device).

// Exported so the page can show the exact address that is called.
export const API_URL = 'https://api.pwnedpasswords.com/range/';

// SHA-1 of a text, returned as 40 uppercase hex characters.
export async function sha1Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// The first 5 characters are sent. The other 35 never leave the device.
export function splitHash(hash) {
  return { prefix: hash.slice(0, 5), suffix: hash.slice(5) };
}

// Turns the answer from the API ("SUFFIX:COUNT" on every line) into a list.
// It throws if the answer does not look like that. A proxy or a login page on
// public wifi can return an HTML page with status 200, and that must never be
// read as "password not found".
export function parseRange(text) {
  const entries = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (!/^[0-9A-F]{35}:\d+$/i.test(trimmed)) {
      throw new Error('Unexpected answer from Pwned Passwords');
    }

    const [suffix, count] = trimmed.split(':');
    entries.push({ suffix: suffix.toUpperCase(), count: Number(count) });
  }

  if (entries.length === 0) {
    throw new Error('Empty answer from Pwned Passwords');
  }
  return entries;
}

// How many times the suffix is found in the leaks. 0 means not found.
// (Rows with count 0 are padding from the API, so they also give 0.)
export function findCount(entries, suffix) {
  const match = entries.find((entry) => entry.suffix === suffix.toUpperCase());
  return match ? match.count : 0;
}

// The whole check. fetchFn can be replaced in tests, so no real network is needed.
// Returns how many times the password was seen, and the prefix that was sent.
export async function checkPassword(password, fetchFn = fetch) {
  const hash = await sha1Hex(password);
  const { prefix, suffix } = splitHash(hash);

  const response = await fetchFn(API_URL + prefix);
  if (!response.ok) {
    throw new Error('Pwned Passwords answered with status ' + response.status);
  }

  const entries = parseRange(await response.text());
  return { count: findCount(entries, suffix), prefix };
}
