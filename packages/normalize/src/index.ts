export { canonicalize, reindex, relabel, removeSelfLoops } from './normalize.js';
export {
  assertValidGraph,
  validateGraph,
  ValidationError,
  type GraphSchema,
  type IssueCode,
  type ValidationIssue,
  type WeightRule,
} from './validate.js';
