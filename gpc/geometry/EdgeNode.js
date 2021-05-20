import Point from "./Point.js"
import ArrayHelper from "../util/ArrayHelper.js"

export default class EdgeNode {
  constructor() {
    this.vertex = new Point() /* Piggy-backed contour vertex data  */
    this.bot = new Point() /* Edge lower (x, y) coordinate      */
    this.top = new Point() /* Edge upper (x, y) coordinate      */
    this.xb /* Scanbeam bottom x coordinate      */
    this.xt /* Scanbeam top x coordinate         */
    this.dx /* Change in x for a unit y increase */
    this.type /* Clip / subject edge flag          */
    this.bundle = ArrayHelper.create2DArray(
      2,
      2
    ) /* Bundle edge flags                 */
    this.bside = [] /* Bundle left / right indicators    */
    this.bstate = [] /* Edge bundle state                 */
    this.outp = [] /* Output polygon / tristrip pointer */
    this.prev /* Previous edge in the AET          */
    this.next /* Next edge in the AET              */
    this.pred /* Edge connected at the lower end   */
    this.succ /* Edge connected at the upper end   */
    this.next_bound /* Pointer to next bound in LMT      */
  }
}
