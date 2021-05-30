import ArrayList from "../util/ArrayList.js"
import { equals } from "../util/equals.js"
import Point from "./Point.js"
import Clip from "./Clip.js"
import ArrayHelper from "../util/ArrayHelper.js"
import PolySimple from "./PolySimple.js"
import Rectangle from "./Rectangle.js"

/**
 * <code>PolyDefault</code> is a default <code>Poly</code> implementation.
 * It provides support for both complex and simple polygons.  A <i>complex polygon</i>
 * is a polygon that consists of more than one polygon.  A <i>simple polygon</i> is a
 * more traditional polygon that contains of one inner polygon and is just a
 * collection of points.
 * <p>
 * <b>Implementation Note:</b> If a point is added to an empty <code>PolyDefault</code>
 * object, it will create an inner polygon of type <code>PolySimple</code>.
 *
 * @see PolySimple
 *
 * @author  Dan Bridenbecker, Solution Engineering, Inc.
 */
export default class PolyDefault {
  m_List = new ArrayList()

  constructor(isHole = false) {
    /**
     * Only applies to the first poly and can only be used with a poly that contains one poly
     */
    this.m_IsHole = isHole
  }

  /**
   * Return true if the given object is equal to this one.
   */
  equals(obj) {
    return (
      obj instanceof PolyDefault &&
      this.m_IsHole === obj.m_IsHole &&
      equals(this.m_List, obj.m_List)
    )
  }

  /**
   * Return the hashCode of the object.
   *
   * @return an integer value that is the same for two objects
   * whenever their internal representation is the same (equals() is true)
   **/
  hashCode() {
    // This is exactly what the original GPCJS code did. *shrug*
    return 37 * 17 + this.m_List.hashCode()
  }

  /**
   * Remove all points. Creates an empty polygon.
   */
  clear() {
    this.m_List.clear()
  }

  add(...args) {
    const [arg1, arg2] = args
    if (1 === arguments.length) {
      if (arg1 instanceof Point) {
        this.addPoint(arg1)
      } else if (arg1 instanceof PolySimple) {
        this.addPoly(arg1)
      } else if (arg1 instanceof Array) {
        // First argument is an array of two numbers
        if (
          arg1.length === 2 &&
          typeof arg1[0] === "number" &&
          typeof arg1[1] === "number"
        ) {
          this.addPointXY(arg1[0], arg1[1])
        }
        // first argument was an array of points
        else {
          for (let i = 0; i < args[0].length; i++) {
            this.add(args[0][i])
          }
        }
      }
    } else {
      this.addPointXY(arg1, arg2)
    }
  }
  /**
   * Add a point to the first inner polygon.
   * <p>
   * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
   * it will create an inner polygon of type <code>PolySimple</code>.
   */
  addPointXY(x, y) {
    this.addPoint(new Point(x, y))
  }
  /**
   * Add a point to the first inner polygon.
   * <p>
   * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
   * it will create an inner polygon of type <code>PolySimple</code>.
   */
  addPoint(p) {
    const m_List = this.m_List

    if (m_List.size() === 0) {
      m_List.add(new PolySimple())
    }
    m_List.get(0).addPoint(p)
  }
  /**
   * Add an inner polygon to this polygon - assumes that adding polygon does not
   * have any inner polygons.
   *
   * @throws IllegalStateException if the number of inner polygons is greater than
   * zero and this polygon was designated a hole.  This would break the assumption
   * that only simple polygons can be holes.
   */
  addPoly(p) {
    if (this.m_List.size() > 0 && this.m_IsHole) {
      alert("ERROR : Cannot add polys to something designated as a hole.")
    }

    this.m_List.add(p)
  }
  /**
   * Return true if the polygon is empty
   */
  isEmpty() {
    return this.m_List.isEmpty()
  }
  /**
   * Returns the bounding rectangle of this polygon.
   * <strong>WARNING</strong> Not supported on complex polygons.
   */
  getBounds() {
    const m_List = this.m_List
    if (m_List.size() === 0) {
      return new Rectangle()
    } else if (m_List.size() === 1) {
      const ip = this.getInnerPoly(0)
      return ip.getBounds()
    } else {
      console.log("getBounds not supported on complex poly.")
    }
  }
  /**
   * Returns the polygon at this index.
   */
  getInnerPoly(polyIndex) {
    return this.m_List.get(polyIndex)
  }
  /**
   * Returns the number of inner polygons - inner polygons are assumed to return one here.
   */
  getNumInnerPoly() {
    const m_List = this.m_List
    return m_List.size()
  }
  /**
   * Return the number points of the first inner polygon
   */
  getNumPoints() {
    return this.m_List.get(0).getNumPoints()
  }

  /**
   * Return the X value of the point at the index in the first inner polygon
   */
  getX(index) {
    return this.m_List.get(0).getX(index)
  }
  getPoint(index) {
    return this.m_List.get(0).getPoint(index)
  }

  getPoints() {
    return this.m_List.get(0).getPoints()
  }

  isPointInside(point) {
    const m_List = this.m_List
    if (!m_List.get(0).isPointInside(point)) return false

    for (let i = 0; i < m_List.size(); i++) {
      const poly = m_List.get(i)
      if (poly.isHole() && poly.isPointInside(point)) return false
    }
    return true
  }
  /**
   * Return the Y value of the point at the index in the first inner polygon
   */
  getY(index) {
    return this.m_List.get(0).getY(index)
  }

  /**
   * Return true if this polygon is a hole.  Holes are assumed to be inner polygons of
   * a more complex polygon.
   *
   * @throws IllegalStateException if called on a complex polygon.
   */
  isHole() {
    if (this.m_List.size() > 1) {
      alert("Cannot call on a poly made up of more than one poly.")
    }

    return this.m_IsHole
  }

  /**
   * Set whether or not this polygon is a hole.  Cannot be called on a complex polygon.
   *
   * @throws IllegalStateException if called on a complex polygon.
   */
  setIsHole(isHole) {
    if (this.m_List.size() > 1) {
      alert("Cannot call on a poly made up of more than one poly.")
    }

    this.m_IsHole = isHole
  }

  /**
   * Return true if the given inner polygon is contributing to the set operation.
   * This method should NOT be used outside the Clip algorithm.
   */
  isContributing(polyIndex) {
    return this.m_List.get(polyIndex).isContributing(0)
  }

  /**
   * Set whether or not this inner polygon is constributing to the set operation.
   * This method should NOT be used outside the Clip algorithm.
   *
   * @throws IllegalStateException if called on a complex polygon
   */
  setContributing(polyIndex, contributes) {
    if (this.m_List.size() !== 1) {
      alert("Only applies to polys of size 1")
    }
    this.m_List.get(polyIndex).setContributing(0, contributes)
  }

  /**
   * Return a Poly that is the intersection of this polygon with the given polygon.
   * The returned polygon could be complex.
   *
   * @return the returned Poly will be an instance of PolyDefault.
   */
  intersection(p) {
    return Clip.intersection(p, this, "PolyDefault")
  }

  /**
   * Return a Poly that is the union of this polygon with the given polygon.
   * The returned polygon could be complex.
   *
   * @return the returned Poly will be an instance of PolyDefault.
   */
  union(p) {
    return Clip.union(p, this, "PolyDefault")
  }

  /**
   * Return a Poly that is the exclusive-or of this polygon with the given polygon.
   * The returned polygon could be complex.
   *
   * @return the returned Poly will be an instance of PolyDefault.
   */
  xor(p) {
    return Clip.xor(p, this, "PolyDefault")
  }

  /**
   * Return a Poly that is the difference of this polygon with the given polygon.
   * The returned polygon could be complex.
   *
   * @return the returned Poly will be an instance of PolyDefault.
   */
  difference(p) {
    return Clip.difference(p, this, "PolyDefault")
  }

  /**
   * Return the area of the polygon in square units.
   */
  getArea() {
    let area = 0.0
    for (let i = 0; i < this.getNumInnerPoly(); i++) {
      const p = this.getInnerPoly(i)
      const tarea = p.getArea() * (p.isHole() ? -1.0 : 1.0)
      area += tarea
    }
    return area
  }

  // -----------------------
  // --- Package Methods ---
  // -----------------------
  toString() {
    let res = ""
    for (let i = 0; i < this.m_List.size(); i++) {
      const p = this.getInnerPoly(i)

      res += "InnerPoly(" + i + ").hole=" + p.isHole()

      let points = []

      for (let j = 0; j < p.getNumPoints(); j++) {
        points.push(new Point(p.getX(j), p.getY(j)))
      }

      points = ArrayHelper.sortPointsClockwise(points)

      for (let k = 0; k < points.length; k++) {
        res += points[k].toString()
      }
    }
    return res
  }
}
