export {
  applyDiff,
  diffGraphs,
  invertDiff,
  isEmptyDiff,
  type EdgeChange,
  type GraphDiff,
} from './diff.js';
export {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
  type GraphHistory,
} from './history.js';
