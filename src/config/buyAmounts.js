/** Store bulk-buy modes (Cookie Clicker–style). */
export const BUY_AMOUNT_OPTIONS = Object.freeze([1, 10, 25, 'max']);

const NUMERIC_BUY_AMOUNTS = new Set(
  BUY_AMOUNT_OPTIONS.filter((option) => typeof option === 'number'),
);

export function normalizeBuyAmount(value) {
  if (value === 'max' || value === 'MAX') {
    return 'max';
  }
  const amount = Number(value);
  if (NUMERIC_BUY_AMOUNTS.has(amount)) {
    return amount;
  }
  // Legacy ×100 setting → nearest current bulk option.
  if (amount === 100) {
    return 25;
  }
  return 1;
}

export function buyAmountLabel(amount) {
  return amount === 'max' ? 'MAX' : `×${amount}`;
}
