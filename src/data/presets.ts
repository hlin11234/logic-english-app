/** Example formula presets. */

export interface Preset {
  id: string;
  name: string;
  formula: string;
}

export const PRESETS: Preset[] = [
  { id: '1', name: 'Universal quantification', formula: '∀x ( P(x) )' },
  { id: '2', name: 'Existential quantification', formula: '∃x ( Q(x) )' },
  { id: '3', name: 'For all / There exists', formula: '∀x ( ∃y ( L(x,y) ) )' },
  { id: '4', name: 'Conjunction', formula: '( P(x) ) ∧ ( Q(x) )' },
  { id: '5', name: 'Implication', formula: '( P(x) ) → ( Q(x) )' },
  { id: '6', name: 'Negation of existential', formula: '¬( ∃x ( P(x) ) )' },
  { id: '7', name: 'Iff', formula: '( P(x) ) ↔ ( Q(x) )' },
  { id: '8', name: 'ASCII operators', formula: 'forall x ( P(x) -> Q(x) )' },
];
