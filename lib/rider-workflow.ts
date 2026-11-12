export const CASH_DENOMINATIONS = [
  { key: 'coin_1', value: 1, kind: 'coin' },
  { key: 'coin_2', value: 2, kind: 'coin' },
  { key: 'coin_5', value: 5, kind: 'coin' },
  { key: 'coin_10', value: 10, kind: 'coin' },
  { key: 'note_10', value: 10, kind: 'note' },
  { key: 'note_20', value: 20, kind: 'note' },
  { key: 'note_50', value: 50, kind: 'note' },
  { key: 'note_100', value: 100, kind: 'note' },
  { key: 'note_500', value: 500, kind: 'note' },
  { key: 'note_1000', value: 1000, kind: 'note' },
  { key: 'note_5000', value: 5000, kind: 'note' },
] as const;
export type CashKey = typeof CASH_DENOMINATIONS[number]['key'];
export type CashCounts = Partial<Record<CashKey, number>>;
export const COLLECTION_STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'departed', label: 'On the way' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'counting', label: 'Counting cash' },
  { key: 'submitted', label: 'Submitted' },
] as const;
export type CollectionStage = typeof COLLECTION_STEPS[number]['key'];

export function countCash(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter the quantity of each coin and note.');
  const entries = Object.entries(input);
  if (entries.some(([key]) => !CASH_DENOMINATIONS.some(item => item.key === key))) throw new Error('An unsupported cash denomination was supplied.');
  const counts: CashCounts = {};
  let coins = 0, notes = 0;
  for (const denomination of CASH_DENOMINATIONS) {
    const quantity = (input as Record<string, unknown>)[denomination.key] ?? 0;
    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100_000_000) throw new Error('Cash quantities must be whole numbers from 0 to 100,000,000.');
    counts[denomination.key] = quantity;
    if (denomination.kind === 'coin') coins += quantity * denomination.value;
    else notes += quantity * denomination.value;
  }
  const total = coins + notes;
  if (!Number.isSafeInteger(total) || total > 100_000_000) throw new Error('The collection cannot exceed PKR 100,000,000.');
  return { counts, coins, notes, total };
}

export function canAdvanceCollection(current: string, next: string): boolean {
  const index = COLLECTION_STEPS.findIndex(step => step.key === current);
  return index >= 0 && index < 3 && COLLECTION_STEPS[index + 1].key === next;
}
