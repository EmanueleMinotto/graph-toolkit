import fc from 'fast-check';
import { globalParameters } from './runs.js';

fc.configureGlobal(globalParameters());
