import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// These tests read the files as text. They guard against typos and against
// breaking promises that the README makes.
const js = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('every id that app.js looks up exists in index.html', () => {
  const used = [...js.matchAll(/\$\('([\w-]+)'\)/g)].map((match) => match[1]);
  const defined = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map((match) => match[1]));

  assert.ok(used.length > 0, 'found no ids in app.js');
  for (const id of used) {
    assert.ok(defined.has(id), `index.html has no element with id="${id}"`);
  }
});

test('ids in index.html are unique', () => {
  const ids = [...html.matchAll(/\sid="([\w-]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('app.js does not write HTML into the page', () => {
  // Looks for the calls, so a comment that only mentions the word is fine.
  assert.ok(!/\.(innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write/.test(js));
});

test('the password field has no name, so it can never end up in a URL', () => {
  const field = html.match(/<input[^>]*id="password"[^>]*>/)[0];
  assert.ok(!/\sname=/.test(field));
});

test('the page may only call the Pwned Passwords API', () => {
  assert.match(html, /connect-src https:\/\/api\.pwnedpasswords\.com[;"]/);
});
