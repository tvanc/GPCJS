export default class LmtNode {
  /* Pointer to bound list */
  first_bound

  /* Pointer to next local minimum */
  next

  constructor(yvalue) {
    /* Y coordinate at local minimum */
    this.y = yvalue
  }
}
