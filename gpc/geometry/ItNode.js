import Point from "./Point.js"

export default class ItNode {
  constructor(edge0, edge1, x, y, next) {
    this.ie = [] /* Intersecting edge (bundle) pair   */
    this.point = new Point(x, y) /* Point of intersection             */
    this.next = next /* The next intersection table node  */

    this.ie[0] = edge0
    this.ie[1] = edge1
  }
}
