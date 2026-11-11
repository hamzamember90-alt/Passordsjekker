import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateStrength } from '../strength.js';

test('an empty password has level 0 and no tips', () => {
  assert.deepEqual(estimateStrength(''), { level: 0, label: '', bits: 0, tips: [] });
});

test('common passwords are very weak', () => {
  for (const password of ['password', 'Password', 'qwerty', '123456', 'passord']) {
    assert.equal(estimateStrength(password).level, 1, password);
  }
});

test('look-alike symbols do not hide a common password', () => {
  assert.equal(estimateStrength('P@ssw0rd').level, 1);
});

test('repeats and runs are penalised', () => {
  assert.equal(estimateStrength('aaaaaaaaaaaa').level, 1);
  assert.equal(estimateStrength('abcdefghijkl').level, 1);
  assert.ok(estimateStrength('abcabcabc').bits < estimateStrength('xk3mq9zt1').bits);
});

test('a long random password is very strong and gets no tips', () => {
  const result = estimateStrength('k8#Vq2!zLm9@Xw4p');
  assert.equal(result.level, 5);
  assert.equal(result.label, 'Veldig sterk');
  assert.deepEqual(result.tips, []);
});

test('longer is stronger when the characters are of the same kind', () => {
  assert.ok(estimateStrength('vkqjxmwpzlfa').bits > estimateStrength('vkqjxmwp').bits);
});

test('short passwords get a tip about length', () => {
  const { tips } = estimateStrength('Xk9!');
  assert.ok(tips.some((tip) => tip.includes('12 tegn')));
});

test('æøå count as ordinary letters, not as special characters', () => {
  assert.equal(estimateStrength('qzjxkvmæ').bits, estimateStrength('qzjxkvmw').bits);
});

test('the level never goes down when the password gets longer with new characters', () => {
  let previous = 0;
  for (const password of ['k', 'k8', 'k8#', 'k8#V', 'k8#Vq2', 'k8#Vq2!z', 'k8#Vq2!zLm9@', 'k8#Vq2!zLm9@Xw4p']) {
    const { level } = estimateStrength(password);
    assert.ok(level >= previous, password);
    previous = level;
  }
});
