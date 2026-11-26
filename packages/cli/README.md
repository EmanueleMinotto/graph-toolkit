# @graph-sdk/cli

`graph-toolkit` command line. Depends on `core`, `io`, `generators` and `traversal`.

## Usage

```sh
npx @graph-sdk/cli convert --from edgelist --to dot graph.csv
graph-toolkit generate cycle 6 --to graphml
graph-toolkit generate random 50 --probability 0.1 --seed 7 --to json | graph-toolkit info --from json
```

Without a file argument, input is read from standard input; output goes to standard output.

| Command                          | Result                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `convert --from F --to T [file]` | The graph re-written in format `T`                                                                 |
| `generate <kind> <n> --to T`     | `path`, `cycle`, `complete`, `star`, `wheel`, `binary-tree`, `hypercube` (n = dimension), `random` |
| `info --from F [file]`           | JSON: `directed`, `vertices`, `edges`, `components`, `density`                                     |

Formats: `json`, `edgelist`, `csv`, `dot`, `graphml`, `gexf`, `gml`, `graph6`, `sparse6`, `pajek`, `dimacs`, `mermaid`. Errors print to standard error and exit with code 1.
