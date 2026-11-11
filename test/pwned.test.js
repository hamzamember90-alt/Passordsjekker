import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha1Hex, splitHash, parseRange, findCount, checkPassword } from '../pwned.js';

// Known values for "password". They are also given by the sha1sum command.
const PASSWORD_HASH = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';
const PASSWORD_PREFIX = '5BAA6';
const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

// Made-up suffixes (35 hex characters each) to fill the fake answers.
const OTHER_A = 'A'.repeat(35);
const OTHER_B = 'B'.repeat(35);

// A fake fetch. It never uses the network and remembers what it was asked for.
function fakeFetch(body, status = 200) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  fn.calls = [];
  return fn;
}

test('sha1Hex gives the known hashes', async () => {
  assert.equal(await sha1Hex('password'), PASSWORD_HASH);
  assert.equal(await sha1Hex('P@ssw0rd'), '21BD12DC183F740EE76F27B78EB39C8AD972A757');
});

test('sha1Hex hashes æøå as UTF-8', async () => {
  assert.equal(await sha1Hex('blåbærsyltetøy'), '8BAE3ACD25817C7181168D4E3B7E8AB77B86759B');
});

test('splitHash gives 5 + 35 characters', () => {
  const { prefix, suffix } = splitHash(PASSWORD_HASH);
  assert.equal(prefix, PASSWORD_PREFIX);
  assert.equal(suffix, PASSWORD_SUFFIX);
  assert.equal(prefix.length, 5);
  assert.equal(suffix.length, 35);
});

test('parseRange reads lines with CRLF', () => {
  const entries = parseRange(`${OTHER_A}:1\r\n${OTHER_B}:22\r\n`);
  assert.deepEqual(entries, [
    { suffix: OTHER_A, count: 1 },
    { suffix: OTHER_B, count: 22 },
  ]);
});

test('parseRange also accepts LF and a missing last newline', () => {
  const entries = parseRange(`${OTHER_A}:1\n${OTHER_B}:2`);
  assert.equal(entries.length, 2);
});

test('parseRange throws when the answer is not a hash list', () => {
  assert.throws(() => parseRange('<html><body>Log in to the wifi</body></html>'));
  assert.throws(() => parseRange(''));
  assert.throws(() => parseRange('\r\n\r\n'));
  assert.throws(() => parseRange('ABC:5')); // the suffix is too short
  assert.throws(() => parseRange(`${OTHER_A}:1\r\nnot a hash line\r\n`)); // one bad line is enough
});

test('findCount finds the suffix, in upper or lower case', () => {
  const entries = [{ suffix: PASSWORD_SUFFIX, count: 7 }];
  assert.equal(findCount(entries, PASSWORD_SUFFIX), 7);
  assert.equal(findCount(entries, PASSWORD_SUFFIX.toLowerCase()), 7);
});

test('findCount gives 0 when the suffix is missing', () => {
  assert.equal(findCount([{ suffix: OTHER_A, count: 3 }], PASSWORD_SUFFIX), 0);
});

test('padding rows with count 0 do not count as a leak', () => {
  const entries = parseRange(`${OTHER_A}:0\r\n`);
  assert.equal(findCount(entries, OTHER_A), 0);
});

test('checkPassword reports the count when the suffix is in the answer', async () => {
  const body = [`${OTHER_A}:3`, `${PASSWORD_SUFFIX}:12345`, `${OTHER_B}:1`].join('\r\n');
  const result = await checkPassword('password', fakeFetch(body));
  assert.deepEqual(result, { count: 12345, prefix: PASSWORD_PREFIX });
});

test('checkPassword reports 0 when the suffix is not in the answer', async () => {
  const body = `${OTHER_A}:3\r\n${OTHER_B}:1\r\n`;
  const result = await checkPassword('password', fakeFetch(body));
  assert.deepEqual(result, { count: 0, prefix: PASSWORD_PREFIX });
});

test('checkPassword asks for the 5-character prefix and nothing else', async () => {
  const fetchFn = fakeFetch(`${OTHER_A}:1`);
  await checkPassword('password', fetchFn);

  assert.equal(fetchFn.calls.length, 1);
  assert.equal(fetchFn.calls[0][0], 'https://api.pwnedpasswords.com/range/5BAA6');
});

test('neither the password nor the rest of the hash is sent', async () => {
  const secret = 'my-very-secret-pw';
  const { prefix, suffix } = splitHash(await sha1Hex(secret));

  const fetchFn = fakeFetch(`${OTHER_A}:1`);
  await checkPassword(secret, fetchFn);

  const everythingSent = JSON.stringify(fetchFn.calls);
  assert.ok(everythingSent.includes(prefix));
  assert.ok(!everythingSent.includes(secret));
  assert.ok(!everythingSent.includes(suffix));
  assert.ok(!everythingSent.includes(suffix.slice(0, 8)));
});

test('checkPassword throws when the service answers with an error status', async () => {
  await assert.rejects(checkPassword('password', fakeFetch('Service unavailable', 503)), /503/);
});

test('checkPassword throws when the network fails', async () => {
  const failing = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(checkPassword('password', failing), TypeError);
});

test('an HTML page with status 200 is an error, not "not found"', async () => {
  const portal = fakeFetch('<html><body>Log in to the wifi</body></html>');
  await assert.rejects(checkPassword('password', portal));
});
