#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { run } from './cli.js';

// eslint-disable-next-line functional/immutable-data -- the only way to set the exit code
process.exitCode = run(process.argv.slice(2), {
  readInput: (path) => readFileSync(path ?? 0, 'utf8'),
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
});
