---
'@graph-sdk/io': patch
---

`fromDot` now reads quoted vertex names as opaque strings: `#`, `//`, `/*`, `;`, `=`, `[`, `{` or a line break inside quotes no longer corrupt the graph or drop edges.
