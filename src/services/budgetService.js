import { BUDGET_LIMIT_MAX_PAISE, MONTH_KEY_PATTERN } from '../utils/budgetConstants.js';

const SIMULATED_LATENCY_MS = 150;
let budgetRecords = [];

export class BudgetServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BudgetServiceError';
    this.code = code;
  }
}

export function getBudgetId(monthKey, categoryId) {
  return `${monthKey}_${categoryId}`;
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

function requireOwner(ownerId) {
  if (typeof ownerId !== 'string' || ownerId.length === 0) {
    throw new BudgetServiceError('unauthenticated', 'You must be signed in to manage budgets.');
  }
}

function requireValidLimit(limitPaise) {
  if (!Number.isSafeInteger(limitPaise) || limitPaise <= 0 || limitPaise > BUDGET_LIMIT_MAX_PAISE) {
    throw new BudgetServiceError('invalid-limit', 'The budget limit must be a positive amount within the allowed range.');
  }
}

function findOwned(ownerId, budgetId) {
  return budgetRecords.find((record) => record.ownerId === ownerId && record.id === budgetId) ?? null;
}

function toPublic(record) {
  return {
    id: record.id,
    monthKey: record.monthKey,
    categoryId: record.categoryId,
    limitPaise: record.limitPaise,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listBudgets(ownerId) {
  requireOwner(ownerId);
  await wait();
  return budgetRecords.filter((record) => record.ownerId === ownerId).map(toPublic);
}

export async function createBudget(ownerId, { monthKey, categoryId, limitPaise }) {
  requireOwner(ownerId);
  await wait();

  if (!MONTH_KEY_PATTERN.test(String(monthKey ?? ''))) {
    throw new BudgetServiceError('invalid-month', 'Choose a valid month.');
  }
  if (typeof categoryId !== 'string' || categoryId.length === 0) {
    throw new BudgetServiceError('invalid-category', 'Choose a category.');
  }
  requireValidLimit(limitPaise);

  const id = getBudgetId(monthKey, categoryId);
  if (findOwned(ownerId, id)) {
    throw new BudgetServiceError('duplicate', 'This category already has a budget for this month.');
  }

  const now = new Date().toISOString();
  const record = { id, ownerId, monthKey, categoryId, limitPaise, createdAt: now, updatedAt: now };
  budgetRecords = [...budgetRecords, record];
  return toPublic(record);
}

export async function updateBudget(ownerId, budgetId, { limitPaise }) {
  requireOwner(ownerId);
  await wait();
  requireValidLimit(limitPaise);

  const existing = findOwned(ownerId, budgetId);
  if (!existing) {
    throw new BudgetServiceError('not-found', 'That budget could not be found.');
  }

  const updated = { ...existing, limitPaise, updatedAt: new Date().toISOString() };
  budgetRecords = budgetRecords.map((record) => (record === existing ? updated : record));
  return toPublic(updated);
}

export async function deleteBudget(ownerId, budgetId) {
  requireOwner(ownerId);
  await wait();

  const existing = findOwned(ownerId, budgetId);
  if (!existing) {
    throw new BudgetServiceError('not-found', 'That budget could not be found.');
  }

  budgetRecords = budgetRecords.filter((record) => record !== existing);
}
