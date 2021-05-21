export default class IntersectionPoint {
  /**
   * @param {Point} p1
   * @param {Point} p2
   * @param {Point} p3
   */
  constructor(p1, p2, p3) {
    this.polygonPoint1 = p1
    this.polygonPoint2 = p2
    this.intersectionPoint = p3
  }

  toString() {
    return (
      "P1 :" +
      this.polygonPoint1.toString() +
      " P2:" +
      this.polygonPoint2.toString() +
      " IP:" +
      this.intersectionPoint.toString()
    )
  }
}
