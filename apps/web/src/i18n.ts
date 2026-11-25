/* eslint-disable functional/no-let, functional/immutable-data, unicorn/no-top-level-assignment-in-function -- `t` is called from anywhere, so the active language is one module-level value */
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'it';

const STORAGE_KEY = 'graph-toolkit.lang';

/** Interface text, keyed by its English wording. Algorithm names and results stay in English. */
const IT: Readonly<Record<string, string>> = {
  Analysis: 'Analisi',
  Algorithm: 'Algoritmo',
  'New graph': 'Nuovo grafo',
  Kind: 'Tipo',
  Size: 'Dimensione',
  Directed: 'Orientato',
  Seed: 'Seme',
  random: 'casuale',
  Probability: 'Probabilità',
  auto: 'auto',
  Layout: 'Disposizione',
  'Import / export': 'Importa / esporta',
  Format: 'Formato',
  'Directed (edge list / CSV)': 'Orientato (lista archi / CSV)',
  'Graph text': 'Testo del grafo',
  'Edit graph': 'Modifica grafo',
  'Edge weight': "Peso dell'arco",
  'Allow parallel edges': 'Consenti archi paralleli',
  Step: 'Passo',
  Graph: 'Grafo',
  Undo: 'Annulla',
  Redo: 'Ripristina',
  'Toggle color scheme': 'Cambia tema',
  Operations: 'Operazioni',
  'Second graph': 'Secondo grafo',
  Vertices: 'Vertici',
  Operation: 'Operazione',
  Examples: 'Esempi',
  Validation: 'Validazione',
  'Allow self-loops': 'Consenti cappi',
  'Allow isolated vertices': 'Consenti vertici isolati',
  'Must be connected': 'Deve essere connesso',
  'Max vertices': 'Vertici max',
  'Max edges': 'Archi max',
  'Min weight': 'Peso min',
  'Max weight': 'Peso max',
  'Integer weights only': 'Solo pesi interi',
  'Vertex id pattern (regex)': 'Schema degli id (regex)',
  'Running…': 'In esecuzione…',
  Cancel: 'Annulla',
  'Export SVG': 'Esporta SVG',
  'Export PNG': 'Esporta PNG',
  'Reset view': 'Reimposta vista',
  Import: 'Importa',
  'Export current': 'Esporta corrente',
  Download: 'Scarica',
  Validate: 'Valida',
  Generate: 'Genera',
  Move: 'Sposta',
  'Copy link to this graph': 'Copia il link a questo grafo',
  'Link copied': 'Link copiato',
  'Play animation': 'Avvia animazione',
  'Pause animation': "Metti in pausa l'animazione",
  'Switch language': 'Cambia lingua',
};

const detect = (): Lang => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'it') return saved;
  return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en';
};

let current: Lang = detect();
const listeners = new Set<() => void>();

/** Translates interface text; unknown text is returned as is. */
export const t = (text: string): string => (current === 'it' ? (IT[text] ?? text) : text);

export function setLang(next: Lang): void {
  current = next;
  localStorage.setItem(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

/** The active language; re-renders the caller (and so its children) when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
  );
}

/** For tests. */
export const dictionary = IT;
