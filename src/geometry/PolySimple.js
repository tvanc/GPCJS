import ArrayList from "../util/ArrayList.js"
import Point from "./Point.js"
import Clip from "./Clip.js"
import Rectangle from "./Rectangle.js"
import Polygon from "./Polygon"

/**
 * <code>PolySimple</code> is a simple polygon - contains only one inner polygon.
 * <p>
 * <strong>WARNING:</strong> This type of <code>Poly</code> cannot be used for an
 * inner polygon that is a hole.
 *
 * @author  Dan Bridenbecker, Solution Engineering, Inc.
 */
export default class PolySimple {
  constructor() {
    /**
     * The list of Point objects in the polygon.
     */
    this.m_List = new ArrayList()

    /** Flag used by the Clip algorithm */
    this.m_Contributes = true
  }

  /**
   * Return true if the given object is equal to this one.
   * <p>
   * <strong>WARNING:</strong> This method failse if the first point
   * appears more than once in the list.
   */
  equals(obj) {
    if (!(obj instanceof PolySimple)) {
      return false
    }

    const this_num = this.m_List.size()
    const that_num = obj.m_List.size()

    if (this_num !== that_num) return false

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // !!! WARNING: This is not the greatest algorithm.  It fails if !!!
    // !!! the first point in "this" poly appears more than once.    !!!
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if (this_num > 0) {
      let this_x = this.getX(0)
      let this_y = this.getY(0)
      let that_first_index = -1
      for (
        let that_index = 0;
        that_first_index === -1 && that_index < that_num;
        that_index++
      ) {
        let that_x = obj.getX(that_index)
        let that_y = obj.getY(that_index)
        if (this_x === that_x && this_y === that_y) {
          that_first_index = that_index
        }
      }
      if (that_first_index === -1) return false
      let that_index = that_first_index
      for (let this_index = 0; this_index < this_num; this_index++) {
        this_x = this.getX(this_index)
        this_y = this.getY(this_index)
        let that_x = obj.getX(that_index)
        let that_y = obj.getY(that_index)

        if (this_x !== that_x || this_y !== that_y) return false

        that_index++
        if (that_index >= that_num) {
          that_index = 0
        }
      }
    }
    return true
  }

  /**
   * Return the hashCode of the object.
   * <p>
   * <strong>WARNING:</strong>Hash and Equals break contract.
   *
   * @return an integer value that is the same for two objects
   * whenever their internal representation is the same (equals() is true)
   */
  hashCode() {
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // !!! WARNING:  This hash and equals break the contract. !!!
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    let result = 17
    result = 37 * result + this.m_List.hashCode()
    return result
  }

  /**
   * Return a string briefly describing the polygon.
   */
  toString() {
    return "PolySimple: num_points=" + this.getNumPoints()
  }

  // --------------------
  // --- Poly Methods ---
  // --------------------
  /**
   * Remove all of the points.  Creates an empty polygon.
   */
  clear() {
    this.m_List.clear()
  }

  add(arg0, arg1) {
    const args = []
    args[0] = arg0

    if (undefined !== arg1) {
      args[1] = arg1
    }

    if (args.length === 2) {
      this.addPointXY(args[0], args[1])
    } else if (args.length === 1) {
      if (args[0] instanceof Point) {
        this.addPoint(args[0])
      } else if (args[0] instanceof Polygon) {
        this.addPoly(args[0])
      } else if (args[0] instanceof Array) {
        for (let k = 0; k < args[0].length; k++) {
          const val = args[0][k]
          this.add(val)
        }
      }
    }
  }

  /**
   * Add a point to the first inner polygon.
   */
  addPointXY(x, y) {
    this.addPoint(new Point(x, y))
  }

  /**
   * Add a point to the first inner polygon.
   */
  addPoint(p) {
    this.m_List.add(p)
  }

  /**
   * Throws IllegalStateexception if called
   */
  addPoly() {
    alert("Cannot add poly to a simple poly.")
  }

  /**
   * Return true if the polygon is empty
   */
  isEmpty() {
    return this.m_List.isEmpty()
  }

  /**
   * Returns the bounding rectangle of this polygon.
   */
  getBounds() {
    let xmin = Number.MAX_VALUE
    let ymin = Number.MAX_VALUE
    let xmax = -Number.MAX_VALUE
    let ymax = -Number.MAX_VALUE

    for (let i = 0; i < this.m_List.size(); i++) {
      const x = this.getX(i)
      const y = this.getY(i)
      if (x < xmin) xmin = x
      if (x > xmax) xmax = x
      if (y < ymin) ymin = y
      if (y > ymax) ymax = y
    }

    return new Rectangle(xmin, ymin, xmax - xmin, ymax - ymin)
  }

  /**
   * Returns <code>this</code> if <code>polyIndex = 0</code>, else it throws
   * IllegalStateException.
   */
  getInnerPoly(polyIndex) {
    if (polyIndex !== 0) {
      alert("PolySimple only has one poly")
    }
    return this
  }

  /**
   * Always returns 1.
   */
  getNumInnerPoly() {
    return 1
  }

  /**
   * Return the number points of the first inner polygon
   */
  getNumPoints() {
    return this.m_List.size()
  }

  /**
   * Return the X value of the point at the index in the first inner polygon
   */
  getX(index) {
    return this.m_List.get(index).x
  }

  /**
   * Return the Y value of the point at the index in the first inner polygon
   */
  getY(index) {
    return this.m_List.get(index).y
  }

  getPoint(index) {
    return this.m_List.get(index)
  }

  getPoints() {
    return this.m_List.toArray()
  }

  isPointInside(point) {
    const points = this.getPoints()
    let j = points.length - 1
    let oddNodes = false

    for (let i = 0; i < points.length; i++) {
      if (
        (points[i].y < point.y && points[j].y >= point.y) ||
        (points[j].y < point.y && points[i].y >= point.y)
      ) {
        if (
          points[i].x +
            ((point.y - points[i].y) / (points[j].y - points[i].y)) *
              (points[j].x - points[i].x) <
          point.x
        ) {
          oddNodes = !oddNodes
        }
      }
      j = i
    }
    return oddNodes
  }

  /**
   * Always returns false since PolySimples cannot be holes.
   */
  isHole() {
    return false
  }

  /**
   * Throws IllegalStateException if called.
   */
  setIsHole(isHole) {
    alert("PolySimple cannot be a hole")
  }

  /**
   * Return true if the given inner polygon is contributing to the set operation.
   * This method should NOT be used outside the Clip algorithm.
   *
   * @throws IllegalStateException if <code>polyIndex != 0</code>
   */
  isContributing(polyIndex) {
    if (polyIndex !== 0) {
      alert("PolySimple only has one poly")
    }
    return this.m_Contributes
  }

  /**
   * Set whether or not this inner polygon is constributing to the set operation.
   * This method should NOT be used outside the Clip algorithm.
   *
   * @throws IllegalStateException if <code>polyIndex != 0</code>
   */
  setContributing(polyIndex, contributes) {
    if (polyIndex !== 0) {
      alert("PolySimple only has one poly")
    }
    this.m_Contributes = contributes
  }

  /**
   * Return a Poly that is the intersection of this polygon with the given polygon.
   * The returned polygon is simple.
   *
   * @return The returned Poly is of type PolySimple
   */
  intersection(p) {
    return Clip.intersection(this, p, "PolySimple")
  }

  /**
   * Return a Poly that is the union of this polygon with the given polygon.
   * The returned polygon is simple.
   *
   * @return The returned Poly is of type PolySimple
   */
  union(p) {
    return Clip.union(this, p, "PolySimple")
  }

  /**
   * Return a Poly that is the exclusive-or of this polygon with the given polygon.
   * The returned polygon is simple.
   *
   * @return The returned Poly is of type PolySimple
   */
  xor(p) {
    return Clip.xor(p, this, "PolySimple")
  }

  /**
   * Return a Poly that is the difference of this polygon with the given polygon.
   * The returned polygon could be complex.
   *
   * @return the returned Poly will be an instance of PolyDefault.
   */
  difference(p) {
    return Clip.difference(p, this, "PolySimple")
  }

  /**
   * Returns the area of the polygon.
   * <p>
   * The algorithm for the area of a complex polygon was take from
   * code by Joseph O'Rourke author of " Computational Geometry in C".
   */
  getArea() {
    if (this.getNumPoints() < 3) {
      return 0.0
    }
    const ax = this.getX(0)
    const ay = this.getY(0)

    let area = 0.0
    for (let i = 1; i < this.getNumPoints() - 1; i++) {
      const bx = this.getX(i)
      const by = this.getY(i)
      const cx = this.getX(i + 1)
      const cy = this.getY(i + 1)
      const tarea = (cx - bx) * (ay - by) - (ax - bx) * (cy - by)
      area += tarea
    }
    area = 0.5 * Math.abs(area)
    return area
  }
}
