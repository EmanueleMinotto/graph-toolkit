/** Base class for all errors raised by graph-toolkit. */
export class GraphError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A vertex id was referenced that does not exist in the graph. */
export class UnknownVertexError extends GraphError {}

/** An edge was referenced that does not exist in the graph. */
export class UnknownEdgeError extends GraphError {}

/** The same vertex or edge was added twice. */
export class DuplicateError extends GraphError {}
