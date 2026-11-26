/** Italian wording of the sentences algorithms report, keyed by their English text. */
export const SENTENCES: Readonly<Record<string, string>> = {
  'The graph is empty.': 'Il grafo è vuoto.',
  'Pick source and sink.': 'Scegli sorgente e pozzo.',
  'Pick two vertices.': 'Scegli due vertici.',
  'Pick a start vertex.': 'Scegli un vertice di partenza.',
  'Pick the root vertex.': 'Scegli il vertice radice.',
  'Pick a root vertex.': 'Scegli il vertice radice.',
  'Unreachable.': 'Non raggiungibile.',
  'Bipartite: two sides found.': 'Bipartito: trovate le due parti.',
  'Not bipartite (odd cycle).': 'Non bipartito (ciclo dispari).',
  'Has a cycle.': 'Ha un ciclo.',
  'Acyclic.': 'Aciclico.',
  'Planar.': 'Planare.',
  'Not planar.': 'Non planare.',
  'No topological order: the graph has a cycle.': 'Nessun ordine topologico: il grafo ha un ciclo.',
  'Analysis failed.': 'Analisi non riuscita.',
  'All-pairs distances (Johnson)': 'Distanze tra tutte le coppie (Johnson)',
  'Isomorphic to the second graph': 'Isomorfo al secondo grafo',
  'Not isomorphic to the second graph.': 'Non isomorfo al secondo grafo.',
  'Generate a second graph first.': 'Genera prima un secondo grafo.',
  'A tree: connected and acyclic.': 'Un albero: connesso e aciclico.',
  'The terminals are not all connected.': 'I terminali non sono tutti collegati.',
  'Compares with the second graph (Operations panel).':
    'Confronta con il secondo grafo (pannello Operazioni).',
  'Click the canvas to add a vertex; drag from one vertex to another to add an edge.':
    "Clicca sul disegno per aggiungere un vertice; trascina da un vertice all'altro per aggiungere un arco.",
  'Switch to edit to change the graph by hand.': 'Passa a Modifica per cambiare il grafo a mano.',
  'Adjacency matrix': 'Matrice di adiacenza',
  'Weighted adjacency matrix': 'Matrice di adiacenza pesata',
  'Laplacian matrix': 'Matrice laplaciana',
  center: 'centro',
  'a forest (acyclic, not connected)': 'una foresta (aciclica, non connessa)',
  'not a forest (has a cycle)': 'non una foresta (ha un ciclo)',
};

const WORDS: Readonly<Record<string, readonly [string, string]>> = {
  bridge: ['ponte', 'ponti'],
  'articulation point': ['punto di articolazione', 'punti di articolazione'],
  'biconnected component': ['componente biconnessa', 'componenti biconnesse'],
  component: ['componente', 'componenti'],
  'strongly connected component': [
    'componente fortemente connessa',
    'componenti fortemente connesse',
  ],
  'maximal clique': ['clique massimale', 'clique massimali'],
  community: ['comunità', 'comunità'],
  arc: ['arco', 'archi'],
};

type Group = (index: number) => string;
type Rule = readonly [RegExp, (group: Group, translate: (text: string) => string) => string];

const singular = (word: string): string =>
  word === 'communities' ? 'community' : word.replace(/s$/u, '');

function counted(count: string, word: string): string {
  const forms = WORDS[singular(word)];

  if (forms === undefined) {
    return `${count} ${word}`;
  }

  return `${count} ${count === '1' ? forms[0] : forms[1]}`;
}

const shown = (count: string): string => (count === '' ? '' : `, prime ${count} mostrate`);
const arrival = (name: string): string => (name === '' ? '' : ` e l'arrivo (${name})`);
const verdict = (plural: string, one: string, many: string): string =>
  plural === '1' ? one : many;

/** Sentences with numbers or names in them; `g(n)` is capture group n ('' when absent). */
export const RULES: readonly Rule[] = [
  [/^(\d+) vertices reached$/u, (g) => `${g(1)} vertici raggiunti`],
  [/^(\d+) vertices ordered$/u, (g) => `${g(1)} vertici ordinati`],
  [
    /^(.+): (\d+) of (\d+) vertices reachable$/u,
    (g) => `${g(1)}: ${g(2)} vertici su ${g(3)} raggiungibili`,
  ],
  [
    /^(.+): max flow (.+) → (.+) = (.+)$/u,
    (g) => `${g(1)}: flusso massimo ${g(2)} → ${g(3)} = ${g(4)}`,
  ],
  [/^(.+): total weight (.+)$/u, (g) => `${g(1)}: peso totale ${g(2)}`],
  [/^(\d+) colors (.*)$/u, (g) => `${g(1)} colori ${g(2)}`],
  [/^(\d+) edge colors \(greedy\)$/u, (g) => `${g(1)} colori degli archi (greedy)`],
  [/^(.+): empty graph$/u, (g) => `${g(1)}: grafo vuoto`],
  [/^(.+): highest is (.+)$/u, (g) => `${g(1)}: il più alto è ${g(2)}`],
  [/^(.+) found$/u, (g, t) => `${t(g(1))} trovato`],
  [/^No (.+)\.$/u, (g, t) => `Nessun ${t(g(1)).toLowerCase()}.`],
  [
    /^(\d+) ordered pairs(?:, first (\d+) shown)?$/u,
    (g) => `${g(1)} coppie ordinate${shown(g(2))}`,
  ],
  [/^Distances from (.+) on the DAG$/u, (g) => `Distanze da ${g(1)} sul DAG`],
  [/^Not a tree: it is (.+)\.$/u, (g, t) => `Non è un albero: è ${t(g(1))}.`],
  [/^Distance (.+) via (.+)$/u, (g) => `Distanza ${g(1)} passando per ${g(2)}`],
  [/^A\* distance (.+) via (.+)$/u, (g) => `Distanza A* ${g(1)} passando per ${g(2)}`],
  [
    /^(\d+) loopless paths?, best (.+)$/u,
    (g) => `${g(1)} ${verdict(g(1), 'cammino', 'cammini')} senza cicli, il migliore ${g(2)}`,
  ],
  [
    /^Lowest common ancestor of (.+) and (.+) is (.+) \(root (.+)\)$/u,
    (g) => `Antenato comune più basso di ${g(1)} e ${g(2)}: ${g(3)} (radice ${g(4)})`,
  ],
  [/^Maximum clique of size (\d+)$/u, (g) => `Clique massima di dimensione ${g(1)}`],
  [
    /^Maximum matching of size (\d+)( \(blossom\))?$/u,
    (g) => `Matching massimo di dimensione ${g(1)}${g(2)}`,
  ],
  [/^Minimum arborescence of weight (.+)$/u, (g) => `Arborescenza minima di peso ${g(1)}`],
  [
    /^Minimum cut (.+) \| (.+) has capacity (.+)$/u,
    (g) => `Il taglio minimo ${g(1)} | ${g(2)} ha capacità ${g(3)}`,
  ],
  [/^Rooted at (.+), height (.+)$/u, (g) => `Radice in ${g(1)}, altezza ${g(2)}`],
  [
    /^Steiner tree over (\d+) terminals, weight (.+)$/u,
    (g) => `Albero di Steiner su ${g(1)} terminali, peso ${g(2)}`,
  ],
  [
    /^The transitive closure has (\d+) arcs?$/u,
    (g) => `La chiusura transitiva ha ${counted(g(1), 'arc')}`,
  ],
  [
    /^Treewidth is at most (\d+) \(min-degree heuristic\)$/u,
    (g) => `Treewidth al massimo ${g(1)} (euristica del grado minimo)`,
  ],
  [/^(\d+) ([a-z ]+)$/u, (g) => counted(g(1), g(2))],
  [/^Algebraic connectivity (.+)$/u, (g) => `Connettività algebrica ${g(1)}`],
  [/^Diameter (.+), radius (.+)$/u, (g) => `Diametro ${g(1)}, raggio ${g(2)}`],
  [/^Highest core: (.+)$/u, (g) => `Core più alto: ${g(1)}`],
  [/^Average clustering (.+)$/u, (g) => `Clustering medio ${g(1)}`],
  [
    /^(\d+) × (\d+) is too large to display \(limit (\d+)\)$/u,
    (g) => `${g(1)} × ${g(2)} è troppo grande per essere mostrata (limite ${g(3)})`,
  ],
  [/^Walks of length (\d+) \((A\^\d+)\)$/u, (g) => `Cammini di lunghezza ${g(1)} (${g(2)})`],
  [
    /^Click vertices to choose start \(([^)]+)\)(?: and target \(([^)]+)\))?\.$/u,
    (g) => `Clicca i vertici per scegliere la partenza (${g(1)})${arrival(g(2))}.`,
  ],
  [
    /^Last seed: (\d+) \(type it in Seed to reproduce the graph\)$/u,
    (g) => `Ultimo seme: ${g(1)} (scrivilo in Seme per riprodurre il grafo)`,
  ],
  [/^(.+) \((needs an? (?:un)?directed graph)\)$/u, (g, t) => `${t(g(1))} (${t(g(2))})`],
];
