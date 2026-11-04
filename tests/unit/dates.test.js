import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMonthLabel,
  getCurrentMonthKey,
  getMonthKeyRange,
  getRecentMonthKeys,
  offsetMonthKey,
  toMonthKey,
} from '../../src/utils/dates.js';

test('toMonthKey formats local date without UTC boundary shift', () => {
  // Midnight on Nov 1st local time
  const localDate = new Date(2026, 10, 1, 0, 1, 0);
  assert.equal(toMonthKey(localDate), '2026-11');

  // Last second of Dec 31st local time
  const newYearEve = new Date(2026, 11, 31, 23, 59, 59);
  assert.equal(toMonthKey(newYearEve), '2026-12');
});

test('getCurrentMonthKey returns YYYY-MM matching current local date', () => {
  const currentKey = getCurrentMonthKey();
  assert.match(currentKey, /^\d{4}-(0[1-9]|1[0-2])$/);
  const now = new Date();
  const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
  const expected = `${now.getFullYear()}-${expectedMonth}`;
  assert.equal(currentKey, expected);
});

test('offsetMonthKey handles December to January transition', () => {
  assert.equal(offsetMonthKey('2026-12', 1), '2027-01');
  assert.equal(offsetMonthKey('2026-12', 2), '2027-02');
  assert.equal(offsetMonthKey('2026-12', 12), '2027-12');
});

test('offsetMonthKey handles January to December transition', () => {
  assert.equal(offsetMonthKey('2027-01', -1), '2026-12');
  assert.equal(offsetMonthKey('2027-01', -2), '2026-11');
});

test('getMonthKeyRange produces chronologically ordered past, center, and future months', () => {
  const range = getMonthKeyRange('2026-11', { pastCount: 5, futureCount: 1 });
  assert.deepEqual(range, [
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
  ]);
  assert.equal(range.length, 7);
  assert.equal(range[range.length - 1], '2026-12');
  assert.equal(range[range.length - 2], '2026-11');
});

test('formatMonthLabel formats month key into readable string', () => {
  assert.equal(formatMonthLabel('2026-11'), 'Nov 2026');
  assert.equal(formatMonthLabel('2027-01'), 'Jan 2027');
});

test('getRecentMonthKeys preserves backward compatibility', () => {
  const recent = getRecentMonthKeys('2026-10', 3);
  assert.deepEqual(recent, ['2026-08', '2026-09', '2026-10']);
});
