---
'@graph-sdk/io': patch
---

`fromJson` now throws `ParseError` on malformed JSON instead of letting `SyntaxError` escape.
