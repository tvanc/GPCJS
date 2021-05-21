export default class ScanBeamTree {
  /* Pointer to nodes with lower y     */
  less

  /* Pointer to nodes with higher y    */
  more

  constructor(y) {
    /* Scanbeam node y value             */
    this.y = y
  }
}
