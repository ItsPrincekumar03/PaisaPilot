/**
 * DEMO DATA ONLY. These values are sample figures for the Module 1 layout preview.
 * They are not user data, are never written to Firestore, and must be replaced
 * with real service data in later modules.
 */

export const DEMO_MONTH_KEY = '2026-10';
export const DEMO_MONTHLY_BUDGET_PAISE = 4000000; // ₹40,000 (sample limit)

export const DEMO_CATEGORIES = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#36A66B' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#2AAEAA' },
  { id: 'rent', name: 'Rent', type: 'expense', color: '#7657E8' },
  { id: 'food', name: 'Food & groceries', type: 'expense', color: '#F16D65' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#F3B544' },
  { id: 'bills', name: 'Bills & utilities', type: 'expense', color: '#E66BA8' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#A58DF2' },
];

// Relative size of variable expenses by month (rent stays fixed).
const MONTH_SCALE = {
  '2026-05': 0.92,
  '2026-06': 0.98,
  '2026-07': 1.05,
  '2026-08': 0.95,
  '2026-09': 1.02,
  '2026-10': 1,
};

const MONTHLY_TEMPLATE = [
  { id: 'salary', categoryId: 'salary', type: 'income', day: '01', description: 'Monthly salary', amountPaise: 8500000, variable: false },
  { id: 'freelance', categoryId: 'freelance', type: 'income', day: '15', description: 'Freelance design project', amountPaise: 1200000, variable: false },
  { id: 'rent', categoryId: 'rent', type: 'expense', day: '05', description: 'Apartment rent', amountPaise: 2200000, variable: false },
  { id: 'groceries', categoryId: 'food', type: 'expense', day: '08', description: 'Weekly groceries', amountPaise: 540000, variable: true },
  { id: 'transport', categoryId: 'transport', type: 'expense', day: '10', description: 'Metro and fuel', amountPaise: 180000, variable: true },
  { id: 'bills', categoryId: 'bills', type: 'expense', day: '12', description: 'Electricity and internet', amountPaise: 260000, variable: true },
  { id: 'shopping', categoryId: 'shopping', type: 'expense', day: '20', description: 'Clothing and gadgets', amountPaise: 310000, variable: true },
];

export const DEMO_TRANSACTIONS = Object.keys(MONTH_SCALE).flatMap((monthKey) =>
  MONTHLY_TEMPLATE.map((item) => ({
    id: `${monthKey}-${item.id}`,
    type: item.type,
    categoryId: item.categoryId,
    date: `${monthKey}-${item.day}`,
    description: item.description,
    amountPaise: item.variable
      ? Math.round(item.amountPaise * MONTH_SCALE[monthKey])
      : item.amountPaise,
    source: 'demo',
  }))
);
