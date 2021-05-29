export default class StNode {
  /** Pointer to AET edge */
  edge

  /** Scanbeam bottom x coordinate */
  xb

  /** Scanbeam top x coordinate */
  xt

  /** Change in x for a unit y increase */
  dx

  /** Previous edge in sorted list */
  prev

  constructor(edge, prev) {
    this.edge = edge
    this.xb = edge.xb
    this.xt = edge.xt
    this.dx = edge.dx
    this.prev = prev
  }
}
