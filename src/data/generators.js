import { createGeneratorChain } from './generatorFactory.js';

/** Ids stay `upgrade-N` for save compatibility; labels are player-facing. */
export const CLICKER_GENERATORS = createGeneratorChain([
  { id: 'upgrade-1', label: 'Generator 1', baseCost: 100, baseValue: 1 },
  { id: 'upgrade-2', label: 'Generator 2', baseCost: 1100, baseValue: 8 },
  { id: 'upgrade-3', label: 'Generator 3', baseCost: 12000, baseValue: 47 },
  { id: 'upgrade-4', label: 'Generator 4', baseCost: 130000, baseValue: 260 },
  { id: 'upgrade-5', label: 'Generator 5', baseCost: 1400000, baseValue: 1400 },
  { id: 'upgrade-6', label: 'Generator 6', baseCost: 20000000, baseValue: 7800 },
  { id: 'upgrade-7', label: 'Generator 7', baseCost: 330000000, baseValue: 44000 },
  { id: 'upgrade-8', label: 'Generator 8', baseCost: 5100000000, baseValue: 260000 },
  { id: 'upgrade-9', label: 'Generator 9', baseCost: 75000000000, baseValue: 1600000 },
  { id: 'upgrade-10', label: 'Generator 10', baseCost: '1000000000000', baseValue: 10000000 },
  { id: 'upgrade-11', label: 'Generator 11', baseCost: '14000000000000', baseValue: 65000000 },
  { id: 'upgrade-12', label: 'Generator 12', baseCost: '200000000000000', baseValue: 400000000 },
  { id: 'upgrade-13', label: 'Generator 13', baseCost: '2800000000000000', baseValue: 2600000000 },
  { id: 'upgrade-14', label: 'Generator 14', baseCost: '40000000000000000', baseValue: 17000000000 },
  { id: 'upgrade-15', label: 'Generator 15', baseCost: '560000000000000000', baseValue: 110000000000 },
  { id: 'upgrade-16', label: 'Generator 16', baseCost: '7800000000000000000', baseValue: 700000000000 },
  { id: 'upgrade-17', label: 'Generator 17', baseCost: '110000000000000000000', baseValue: 4500000000000 },
  { id: 'upgrade-18', label: 'Generator 18', baseCost: '1500000000000000000000', baseValue: 30000000000000 },
  { id: 'upgrade-19', label: 'Generator 19', baseCost: '21000000000000000000000', baseValue: 200000000000000 },
  { id: 'upgrade-20', label: 'Generator 20', baseCost: '300000000000000000000000', baseValue: 1300000000000000 },
]);
