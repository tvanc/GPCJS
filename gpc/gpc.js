import ArrayHelper from "./util/ArrayHelper.js"
import Point from "./geometry/Point.js"
import ArrayList from "./util/ArrayList.js"
import Clip from "./geometry/Clip.js"
import AetTree from "./geometry/AetTree.js"
import BundleState from "./geometry/BundleState.js"
import EdgeNode from "./geometry/EdgeNode.js"
import EdgeTable from "./geometry/EdgeTable.js"
import HState from "./geometry/HState.js"
import IntersectionPoint from "./geometry/IntersectionPoint.js"
import ItNode from "./geometry/ItNode.js"
import ItNodeTable from "./geometry/ItNodeTable.js"
import LineHelper from "./geometry/LineHelper.js"
import LineIntersection from "./geometry/LineIntersection.js"

const gpcas = {
  geometry: {
    Clip,
    AetTree,
    BundleState,
    EdgeNode,
    EdgeTable,
    HState,
    IntersectionPoint,
    ItNode,
    ItNodeTable,
    LineHelper,
    LineIntersection,
  },
}

///////////  LmtNode //////////////////////////

gpcas.geometry.LmtNode = function (yvalue) {
  this.y = yvalue /* Y coordinate at local minimum     */
  this.first_bound /* Pointer to bound list             */
  this.next /* Pointer to next local minimum     */
}

////////////// LmtTable ///////////////

gpcas.geometry.LmtTable = function () {
  this.top_node
}
gpcas.geometry.LmtTable.prototype.print = function () {
  var n = 0
  var lmt = this.top_node
  while (lmt != null) {
    //console.log("lmt("+n+")");
    for (var edge = lmt.first_bound; edge != null; edge = edge.next_bound) {
      //console.log("edge.vertex.x="+edge.vertex.x+"  edge.vertex.y="+edge.vertex.y);
    }
    n++
    lmt = lmt.next
  }
}

/////////////   OperationType //////////////////////////////////
gpcas.geometry.OperationType = function (type) {
  this.m_Type = type
}
gpcas.geometry.OperationType.GPC_DIFF = new gpcas.geometry.OperationType(
  "Difference"
)
gpcas.geometry.OperationType.GPC_INT = new gpcas.geometry.OperationType(
  "Intersection"
)
gpcas.geometry.OperationType.GPC_XOR = new gpcas.geometry.OperationType(
  "Exclusive or"
)
gpcas.geometry.OperationType.GPC_UNION = new gpcas.geometry.OperationType(
  "Union"
)

//////////// Poly  /////////////////////
// ---> an interface

/////////////// PolyDefault  /////////////////////
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
gpcas.geometry.PolyDefault = function (isHole) {
  if (isHole == null) isHole = false

  /**
   * Only applies to the first poly and can only be used with a poly that contains one poly
   */
  this.m_IsHole = isHole
  this.m_List = new ArrayList()
}
/**
 * Return true if the given object is equal to this one.
 */
gpcas.geometry.PolyDefault.prototype.equals = function (obj) {
  if (!(obj instanceof PolyDefault)) {
    return false
  }
  var that = obj

  if (this.m_IsHole != that.m_IsHole) return false
  if (!equals(this.m_List, that.m_List)) return false

  return true
}
/**
 * Return the hashCode of the object.
 *
 * @return an integer value that is the same for two objects
 * whenever their internal representation is the same (equals() is true)
 **/
gpcas.geometry.PolyDefault.prototype.hashCode = function () {
  var m_List = this.m_List

  var result = 17
  result = 37 * result + m_List.hashCode()
  return result
}
/**
 * Remove all of the points.  Creates an empty polygon.
 */
gpcas.geometry.PolyDefault.prototype.clear = function () {
  this.m_List.clear()
}

gpcas.geometry.PolyDefault.prototype.add = function (arg0, arg1) {
  var args = []

  args[0] = arg0
  if (undefined !== arg1) {
    args[1] = arg1
  }
  if (args.length == 2) {
    this.addPointXY(args[0], args[1])
  } else if (args.length == 1) {
    if (args[0] instanceof Point) {
      this.addPoint(args[0])
    } else if (args[0] instanceof gpcas.geometry.PolySimple) {
      this.addPoly(args[0])
    } else if (args[0] instanceof Array) {
      var arr = args[0]
      if (
        arr.length == 2 &&
        arr[0] instanceof Number &&
        arr[1] instanceof Number
      ) {
        this.add(arr[0], arr[1])
      } else {
        for (var i = 0; i < args[0].length; i++) {
          this.add(args[0][i])
        }
      }
    }
  }
}
/**
 * Add a point to the first inner polygon.
 * <p>
 * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
 * it will create an inner polygon of type <code>PolySimple</code>.
 */
gpcas.geometry.PolyDefault.prototype.addPointXY = function (x, y) {
  this.addPoint(new Point(x, y))
}
/**
 * Add a point to the first inner polygon.
 * <p>
 * <b>Implementation Note:</b> If a point is added to an empty PolyDefault object,
 * it will create an inner polygon of type <code>PolySimple</code>.
 */
gpcas.geometry.PolyDefault.prototype.addPoint = function (p) {
  var m_List = this.m_List

  if (m_List.size() == 0) {
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
gpcas.geometry.PolyDefault.prototype.addPoly = function (p) {
  var m_IsHole = this.m_IsHole
  var m_List = this.m_List

  if (m_List.size() > 0 && m_IsHole) {
    alert("ERROR : Cannot add polys to something designated as a hole.")
  }
  m_List.add(p)
}
/**
 * Return true if the polygon is empty
 */
gpcas.geometry.PolyDefault.prototype.isEmpty = function () {
  return this.m_List.isEmpty()
}
/**
 * Returns the bounding rectangle of this polygon.
 * <strong>WARNING</strong> Not supported on complex polygons.
 */
gpcas.geometry.PolyDefault.prototype.getBounds = function () {
  var m_List = this.m_List
  if (m_List.size() == 0) {
    return new Rectangle()
  } else if (m_List.size() == 1) {
    var ip = this.getInnerPoly(0)
    return ip.getBounds()
  } else {
    console.log("getBounds not supported on complex poly.")
  }
}
/**
 * Returns the polygon at this index.
 */
gpcas.geometry.PolyDefault.prototype.getInnerPoly = function (polyIndex) {
  return this.m_List.get(polyIndex)
}
/**
 * Returns the number of inner polygons - inner polygons are assumed to return one here.
 */
gpcas.geometry.PolyDefault.prototype.getNumInnerPoly = function () {
  var m_List = this.m_List
  return m_List.size()
}
/**
 * Return the number points of the first inner polygon
 */
gpcas.geometry.PolyDefault.prototype.getNumPoints = function () {
  return this.m_List.get(0).getNumPoints()
}

/**
 * Return the X value of the point at the index in the first inner polygon
 */
gpcas.geometry.PolyDefault.prototype.getX = function (index) {
  return this.m_List.get(0).getX(index)
}
gpcas.geometry.PolyDefault.prototype.getPoint = function (index) {
  return this.m_List.get(0).getPoint(index)
}

gpcas.geometry.PolyDefault.prototype.getPoints = function () {
  return this.m_List.get(0).getPoints()
}

gpcas.geometry.PolyDefault.prototype.isPointInside = function (point) {
  var m_List = this.m_List
  if (!m_List.get(0).isPointInside(point)) return false

  for (var i = 0; i < m_List.size(); i++) {
    var poly = m_List.get(i)
    if (poly.isHole() && poly.isPointInside(point)) return false
  }
  return true
}
/**
 * Return the Y value of the point at the index in the first inner polygon
 */
gpcas.geometry.PolyDefault.prototype.getY = function (index) {
  var m_List = this.m_List
  return m_List.get(0).getY(index)
}

/**
 * Return true if this polygon is a hole.  Holes are assumed to be inner polygons of
 * a more complex polygon.
 *
 * @throws IllegalStateException if called on a complex polygon.
 */
gpcas.geometry.PolyDefault.prototype.isHole = function () {
  var m_List = this.m_List
  var m_IsHole = this.m_IsHole

  if (m_List.size() > 1) {
    alert("Cannot call on a poly made up of more than one poly.")
  }
  return m_IsHole
}

/**
 * Set whether or not this polygon is a hole.  Cannot be called on a complex polygon.
 *
 * @throws IllegalStateException if called on a complex polygon.
 */
gpcas.geometry.PolyDefault.prototype.setIsHole = function (isHole) {
  var m_List = this.m_List
  if (m_List.size() > 1) {
    alert("Cannot call on a poly made up of more than one poly.")
  }
  this.m_IsHole = isHole
}

/**
 * Return true if the given inner polygon is contributing to the set operation.
 * This method should NOT be used outside the Clip algorithm.
 */
gpcas.geometry.PolyDefault.prototype.isContributing = function (polyIndex) {
  var m_List = this.m_List
  return m_List.get(polyIndex).isContributing(0)
}

/**
 * Set whether or not this inner polygon is constributing to the set operation.
 * This method should NOT be used outside the Clip algorithm.
 *
 * @throws IllegalStateException if called on a complex polygon
 */
gpcas.geometry.PolyDefault.prototype.setContributing = function (
  polyIndex,
  contributes
) {
  var m_List = this.m_List
  if (m_List.size() != 1) {
    alert("Only applies to polys of size 1")
  }
  m_List.get(polyIndex).setContributing(0, contributes)
}

/**
 * Return a Poly that is the intersection of this polygon with the given polygon.
 * The returned polygon could be complex.
 *
 * @return the returned Poly will be an instance of PolyDefault.
 */
gpcas.geometry.PolyDefault.prototype.intersection = function (p) {
  return Clip.intersection(p, this, "PolyDefault")
}

/**
 * Return a Poly that is the union of this polygon with the given polygon.
 * The returned polygon could be complex.
 *
 * @return the returned Poly will be an instance of PolyDefault.
 */
gpcas.geometry.PolyDefault.prototype.union = function (p) {
  return Clip.union(p, this, "PolyDefault")
}

/**
 * Return a Poly that is the exclusive-or of this polygon with the given polygon.
 * The returned polygon could be complex.
 *
 * @return the returned Poly will be an instance of PolyDefault.
 */
gpcas.geometry.PolyDefault.prototype.xor = function (p) {
  return Clip.xor(p, this, "PolyDefault")
}

/**
 * Return a Poly that is the difference of this polygon with the given polygon.
 * The returned polygon could be complex.
 *
 * @return the returned Poly will be an instance of PolyDefault.
 */
gpcas.geometry.PolyDefault.prototype.difference = function (p) {
  return Clip.difference(p, this, "PolyDefault")
}

/**
 * Return the area of the polygon in square units.
 */
gpcas.geometry.PolyDefault.prototype.getArea = function () {
  var area = 0.0
  for (var i = 0; i < getNumInnerPoly(); i++) {
    var p = getInnerPoly(i)
    var tarea = p.getArea() * (p.isHole() ? -1.0 : 1.0)
    area += tarea
  }
  return area
}

// -----------------------
// --- Package Methods ---
// -----------------------
gpcas.geometry.PolyDefault.prototype.toString = function () {
  var res = ""
  var m_List = this.m_List
  for (var i = 0; i < m_List.size(); i++) {
    var p = this.getInnerPoly(i)
    res += "InnerPoly(" + i + ").hole=" + p.isHole()
    var points = []
    for (var j = 0; j < p.getNumPoints(); j++) {
      points.push(new Point(p.getX(j), p.getY(j)))
    }
    points = ArrayHelper.sortPointsClockwise(points)

    for (var k = 0; k < points.length; k++) {
      res += points[k].toString()
    }
  }
  return res
}

///////////////  Polygon   /////////////////////////////////
gpcas.geometry.Polygon = function () {
  this.maxTop
  this.maxBottom
  this.maxLeft
  this.maxRight
  this.vertices /* of Point */
}
gpcas.geometry.Polygon.prototype.fromArray = function (v) {
  this.vertices = []

  for (var i = 0; i < v.length; i++) {
    var pointArr = v[i]
    this.vertices.push(new Point(pointArr[0], pointArr[1]))
  }
}

/*Normalize vertices in polygon to be ordered clockwise from most left point*/
gpcas.geometry.Polygon.prototype.normalize = function () {
  return ArrayHelper.sortPointsClockwise(this.vertices)
}
gpcas.geometry.Polygon.prototype.getVertexIndex = function (vertex) {
  for (var i = 0; i < this.vertices.length; i++) {
    if (equals(vertices[i], vertex)) {
      return i
    }
  }
  return -1
}
gpcas.geometry.Polygon.prototype.insertVertex = function (
  vertex1,
  vertex2,
  newVertex
) {
  var vertex1Index = getVertexIndex(vertex1)
  var vertex2Index = getVertexIndex(vertex2)
  if (vertex1Index == -1 || vertex2Index == -1) {
    return false
  }

  if (vertex2Index < vertex1Index) {
    var i = vertex1Index
    vertex1Index = vertex2Index
    vertex2Index = i
  }
  if (vertex2Index == vertex1Index + 1) {
    var newVertices = []
    for (var i = 0; i <= vertex1Index; i++) {
      newVertices[i] = this.vertices[i]
    }
    newVertices[vertex2Index] = newVertex
    for (var i = vertex2Index; i < this.vertices.length; i++) {
      newVertices[i + 1] = this.vertices[i]
    }
    this.vertices = newVertices
  } else if (vertex2Index == vertices.length - 1 && vertex1Index == 0) {
    this.vertices.push(newVertex)
  }
  return true
}
gpcas.geometry.Polygon.prototype.clone = function () {
  var res = new Polygon()
  res.vertices = vertices.slice(this.vertices.length - 1)
  return res
}
gpcas.geometry.Polygon.prototype.toString = function () {
  var vertices = this.vertices
  var res = "["
  for (var i = 0; i < vertices.length; i++) {
    var vertex = vertices[i]
    res += (i > 0 ? "," : "") + "[" + vertex.x + "," + vertex.y + "]"
  }
  res += "]"
  return res
}

////////////////////  PolygonNode ///////////////////////////
gpcas.geometry.PolygonNode = function (next, x, y) {
  this.active /* Active flag / vertex count        */
  this.hole /* Hole / external contour flag      */
  this.v = [] /* Left and right vertex list ptrs   */
  this.next /* Pointer to next polygon contour   */
  this.proxy /* Pointer to actual structure used  */

  /* Make v[Clip.LEFT] and v[Clip.RIGHT] point to new vertex */
  var vn = new VertexNode(x, y)

  this.v[Clip.LEFT] = vn
  this.v[Clip.RIGHT] = vn

  this.next = next
  this.proxy = this /* Initialise proxy to point to p itself */
  this.active = 1 //TRUE
}
gpcas.geometry.PolygonNode.prototype.add_right = function (x, y) {
  var nv = new VertexNode(x, y)

  /* Add vertex nv to the right end of the polygon's vertex list */
  this.proxy.v[Clip.RIGHT].next = nv

  /* Update proxy->v[Clip.RIGHT] to point to nv */
  this.proxy.v[Clip.RIGHT] = nv
}
gpcas.geometry.PolygonNode.prototype.add_left = function (x, y) {
  var proxy = this.proxy

  var nv = new VertexNode(x, y)

  /* Add vertex nv to the left end of the polygon's vertex list */
  nv.next = proxy.v[Clip.LEFT]

  /* Update proxy->[Clip.LEFT] to point to nv */
  proxy.v[Clip.LEFT] = nv
}

//////////////////   PolySimple ////////////////

/**
 * <code>PolySimple</code> is a simple polygon - contains only one inner polygon.
 * <p>
 * <strong>WARNING:</strong> This type of <code>Poly</code> cannot be used for an
 * inner polygon that is a hole.
 *
 * @author  Dan Bridenbecker, Solution Engineering, Inc.
 */
gpcas.geometry.PolySimple = function () {
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
gpcas.geometry.PolySimple.prototype.equals = function (obj) {
  if (!(obj instanceof PolySimple)) {
    return false
  }

  var that = obj

  var this_num = this.m_List.size()
  var that_num = that.m_List.size()
  if (this_num != that_num) return false

  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // !!! WARNING: This is not the greatest algorithm.  It fails if !!!
  // !!! the first point in "this" poly appears more than once.    !!!
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  if (this_num > 0) {
    var this_x = this.getX(0)
    var this_y = this.getY(0)
    var that_first_index = -1
    for (
      var that_index = 0;
      that_first_index == -1 && that_index < that_num;
      that_index++
    ) {
      var that_x = that.getX(that_index)
      var that_y = that.getY(that_index)
      if (this_x == that_x && this_y == that_y) {
        that_first_index = that_index
      }
    }
    if (that_first_index == -1) return false
    var that_index = that_first_index
    for (var this_index = 0; this_index < this_num; this_index++) {
      this_x = this.getX(this_index)
      this_y = this.getY(this_index)
      var that_x = that.getX(that_index)
      var that_y = that.getY(that_index)

      if (this_x != that_x || this_y != that_y) return false

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
gpcas.geometry.PolySimple.prototype.hashCode = function () {
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // !!! WARNING:  This hash and equals break the contract. !!!
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  var result = 17
  result = 37 * result + this.m_List.hashCode()
  return result
}

/**
 * Return a string briefly describing the polygon.
 */
gpcas.geometry.PolySimple.prototype.toString = function () {
  return "PolySimple: num_points=" + getNumPoints()
}

// --------------------
// --- Poly Methods ---
// --------------------
/**
 * Remove all of the points.  Creates an empty polygon.
 */
gpcas.geometry.PolySimple.prototype.clear = function () {
  this.m_List.clear()
}

gpcas.geometry.PolySimple.prototype.add = function (arg0, arg1) {
  var args = []
  args[0] = arg0
  if (undefined !== arg1) {
    args[1] = arg1
  }

  if (args.length == 2) {
    this.addPointXY(args[0], args[1])
  } else if (args.length == 1) {
    if (args[0] instanceof Point) {
      this.addPoint(args[0])
    } else if (args[0] instanceof Poly) {
      this.addPoly(args[0])
    } else if (args[0] instanceof Array) {
      for (var k = 0; k < args[0].length; k++) {
        var val = args[0][k]
        this.add(val)
      }
    }
  }
}

/**
 * Add a point to the first inner polygon.
 */
gpcas.geometry.PolySimple.prototype.addPointXY = function (x, y) {
  this.addPoint(new Point(x, y))
}

/**
 * Add a point to the first inner polygon.
 */
gpcas.geometry.PolySimple.prototype.addPoint = function (p) {
  this.m_List.add(p)
}

/**
 * Throws IllegalStateexception if called
 */
gpcas.geometry.PolySimple.prototype.addPoly = function (p) {
  alert("Cannot add poly to a simple poly.")
}

/**
 * Return true if the polygon is empty
 */
gpcas.geometry.PolySimple.prototype.isEmpty = function () {
  return this.m_List.isEmpty()
}

/**
 * Returns the bounding rectangle of this polygon.
 */
gpcas.geometry.PolySimple.prototype.getBounds = function () {
  var xmin = Number.MAX_VALUE
  var ymin = Number.MAX_VALUE
  var xmax = -Number.MAX_VALUE
  var ymax = -Number.MAX_VALUE

  for (var i = 0; i < this.m_List.size(); i++) {
    var x = this.getX(i)
    var y = this.getY(i)
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
gpcas.geometry.PolySimple.prototype.getInnerPoly = function (polyIndex) {
  if (polyIndex != 0) {
    alert("PolySimple only has one poly")
  }
  return this
}

/**
 * Always returns 1.
 */
gpcas.geometry.PolySimple.prototype.getNumInnerPoly = function () {
  return 1
}

/**
 * Return the number points of the first inner polygon
 */
gpcas.geometry.PolySimple.prototype.getNumPoints = function () {
  return this.m_List.size()
}

/**
 * Return the X value of the point at the index in the first inner polygon
 */
gpcas.geometry.PolySimple.prototype.getX = function (index) {
  return this.m_List.get(index).x
}

/**
 * Return the Y value of the point at the index in the first inner polygon
 */
gpcas.geometry.PolySimple.prototype.getY = function (index) {
  return this.m_List.get(index).y
}

gpcas.geometry.PolySimple.prototype.getPoint = function (index) {
  return this.m_List.get(index)
}

gpcas.geometry.PolySimple.prototype.getPoints = function () {
  return this.m_List.toArray()
}

gpcas.geometry.PolySimple.prototype.isPointInside = function (point) {
  var points = this.getPoints()
  var j = points.length - 1
  var oddNodes = false

  for (var i = 0; i < points.length; i++) {
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
gpcas.geometry.PolySimple.prototype.isHole = function () {
  return false
}

/**
 * Throws IllegalStateException if called.
 */
gpcas.geometry.PolySimple.prototype.setIsHole = function (isHole) {
  alert("PolySimple cannot be a hole")
}

/**
 * Return true if the given inner polygon is contributing to the set operation.
 * This method should NOT be used outside the Clip algorithm.
 *
 * @throws IllegalStateException if <code>polyIndex != 0</code>
 */
gpcas.geometry.PolySimple.prototype.isContributing = function (polyIndex) {
  if (polyIndex != 0) {
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
gpcas.geometry.PolySimple.prototype.setContributing = function (
  polyIndex,
  contributes
) {
  if (polyIndex != 0) {
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
gpcas.geometry.PolySimple.prototype.intersection = function (p) {
  return Clip.intersection(this, p, "PolySimple")
}

/**
 * Return a Poly that is the union of this polygon with the given polygon.
 * The returned polygon is simple.
 *
 * @return The returned Poly is of type PolySimple
 */
gpcas.geometry.PolySimple.prototype.union = function (p) {
  return Clip.union(this, p, "PolySimple")
}

/**
 * Return a Poly that is the exclusive-or of this polygon with the given polygon.
 * The returned polygon is simple.
 *
 * @return The returned Poly is of type PolySimple
 */
gpcas.geometry.PolySimple.prototype.xor = function (p) {
  return Clip.xor(p, this, "PolySimple")
}

/**
 * Return a Poly that is the difference of this polygon with the given polygon.
 * The returned polygon could be complex.
 *
 * @return the returned Poly will be an instance of PolyDefault.
 */
gpcas.geometry.PolySimple.prototype.difference = function (p) {
  return Clip.difference(p, this, "PolySimple")
}

/**
 * Returns the area of the polygon.
 * <p>
 * The algorithm for the area of a complex polygon was take from
 * code by Joseph O'Rourke author of " Computational Geometry in C".
 */
gpcas.geometry.PolySimple.prototype.getArea = function () {
  if (this.getNumPoints() < 3) {
    return 0.0
  }
  var ax = this.getX(0)
  var ay = this.getY(0)

  var area = 0.0
  for (var i = 1; i < this.getNumPoints() - 1; i++) {
    var bx = this.getX(i)
    var by = this.getY(i)
    var cx = this.getX(i + 1)
    var cy = this.getY(i + 1)
    var tarea = (cx - bx) * (ay - by) - (ax - bx) * (cy - by)
    area += tarea
  }
  area = 0.5 * Math.abs(area)
  return area
}

/////////////////////// Rectangle  ///////////////////
gpcas.geometry.Rectangle = function (_x, _y, _w, _h) {
  this.x = _x
  this.y = _y
  this.w = _w
  this.h = _h
}
gpcas.geometry.Rectangle.prototype.getMaxY = function () {
  return this.y + this.h
}
gpcas.geometry.Rectangle.prototype.getMinY = function () {
  return this.y
}
gpcas.geometry.Rectangle.prototype.getMaxX = function () {
  return this.x + this.w
}
gpcas.geometry.Rectangle.prototype.getMinX = function () {
  return this.x
}
gpcas.geometry.Rectangle.prototype.toString = function () {
  return (
    "[" +
    x.toString() +
    " " +
    y.toString() +
    " " +
    w.toString() +
    " " +
    h.toString() +
    "]"
  )
}

/////////////////// ScanBeamTree //////////////////////
gpcas.geometry.ScanBeamTree = function (yvalue) {
  this.y = yvalue /* Scanbeam node y value             */
  this.less /* Pointer to nodes with lower y     */
  this.more /* Pointer to nodes with higher y    */
}

///////////////////////// ScanBeamTreeEntries /////////////////
gpcas.geometry.ScanBeamTreeEntries = function () {
  this.sbt_entries = 0
  this.sb_tree
}
gpcas.geometry.ScanBeamTreeEntries.prototype.build_sbt = function () {
  var sbt = []

  var entries = 0
  entries = this.inner_build_sbt(entries, sbt, this.sb_tree)

  //console.log("SBT = "+this.sbt_entries);

  if (entries != this.sbt_entries) {
    //console.log("Something went wrong buildign sbt from tree.");
  }
  return sbt
}
gpcas.geometry.ScanBeamTreeEntries.prototype.inner_build_sbt = function (
  entries,
  sbt,
  sbt_node
) {
  if (sbt_node.less != null) {
    entries = this.inner_build_sbt(entries, sbt, sbt_node.less)
  }
  sbt[entries] = sbt_node.y
  entries++
  if (sbt_node.more != null) {
    entries = this.inner_build_sbt(entries, sbt, sbt_node.more)
  }
  return entries
}

///////////////////////////  StNode
gpcas.geometry.StNode = function (edge, prev) {
  this.edge /* Pointer to AET edge               */
  this.xb /* Scanbeam bottom x coordinate      */
  this.xt /* Scanbeam top x coordinate         */
  this.dx /* Change in x for a unit y increase */
  this.prev /* Previous edge in sorted list      */

  this.edge = edge
  this.xb = edge.xb
  this.xt = edge.xt
  this.dx = edge.dx
  this.prev = prev
}

/////////////////////   TopPolygonNode /////////////////
gpcas.geometry.TopPolygonNode = function () {
  this.top_node
}
gpcas.geometry.TopPolygonNode.prototype.add_local_min = function (x, y) {
  var existing_min = this.top_node
  this.top_node = new PolygonNode(existing_min, x, y)
  return this.top_node
}
gpcas.geometry.TopPolygonNode.prototype.merge_left = function (p, q) {
  /* Label contour as a hole */
  q.proxy.hole = true
  var top_node = this.top_node

  if (p.proxy != q.proxy) {
    /* Assign p's vertex list to the left end of q's list */
    p.proxy.v[Clip.RIGHT].next = q.proxy.v[Clip.LEFT]
    q.proxy.v[Clip.LEFT] = p.proxy.v[Clip.LEFT]

    /* Redirect any p.proxy references to q.proxy */
    var target = p.proxy
    for (var node = top_node; node != null; node = node.next) {
      if (node.proxy == target) {
        node.active = 0
        node.proxy = q.proxy
      }
    }
  }
}
gpcas.geometry.TopPolygonNode.prototype.merge_right = function (p, q) {
  var top_node = this.top_node
  /* Label contour as external */
  q.proxy.hole = false

  if (p.proxy != q.proxy) {
    /* Assign p's vertex list to the right end of q's list */
    q.proxy.v[Clip.RIGHT].next = p.proxy.v[Clip.LEFT]
    q.proxy.v[Clip.RIGHT] = p.proxy.v[Clip.RIGHT]

    /* Redirect any p->proxy references to q->proxy */
    var target = p.proxy
    for (var node = top_node; node != null; node = node.next) {
      if (node.proxy == target) {
        node.active = 0
        node.proxy = q.proxy
      }
    }
  }
}
gpcas.geometry.TopPolygonNode.prototype.count_contours = function () {
  var nc = 0

  for (var polygon = this.top_node; polygon != null; polygon = polygon.next) {
    if (polygon.active != 0) {
      /* Count the vertices in the current contour */
      var nv = 0
      for (var v = polygon.proxy.v[Clip.LEFT]; v != null; v = v.next) {
        nv++
      }

      /* Record valid vertex counts in the active field */
      if (nv > 2) {
        polygon.active = nv
        nc++
      } else {
        /* Invalid contour: just free the heap */
        //                  VertexNode nextv = null ;
        //                  for (VertexNode v= polygon.proxy.v[Clip.LEFT]; (v != null); v = nextv)
        //                  {
        //                     nextv= v.next;
        //                     v = null ;
        //                  }
        polygon.active = 0
      }
    }
  }
  return nc
}
gpcas.geometry.TopPolygonNode.prototype.getResult = function (polyClass) {
  var top_node = this.top_node
  var result = Clip.createNewPoly(polyClass)
  //console.log(polyClass);

  var num_contours = this.count_contours()

  if (num_contours > 0) {
    var c = 0
    var npoly_node = null
    for (var poly_node = top_node; poly_node != null; poly_node = npoly_node) {
      npoly_node = poly_node.next
      if (poly_node.active != 0) {
        var poly = result

        if (num_contours > 1) {
          poly = Clip.createNewPoly(polyClass)
        }
        if (poly_node.proxy.hole) {
          poly.setIsHole(poly_node.proxy.hole)
        }

        // ------------------------------------------------------------------------
        // --- This algorithm puts the verticies into the poly in reverse order ---
        // ------------------------------------------------------------------------
        for (
          var vtx = poly_node.proxy.v[Clip.LEFT];
          vtx != null;
          vtx = vtx.next
        ) {
          poly.add(vtx.x, vtx.y)
        }
        if (num_contours > 1) {
          result.addPoly(poly)
        }
        c++
      }
    }

    // -----------------------------------------
    // --- Sort holes to the end of the list ---
    // -----------------------------------------
    var orig = result
    result = Clip.createNewPoly(polyClass)
    for (var i = 0; i < orig.getNumInnerPoly(); i++) {
      var inner = orig.getInnerPoly(i)
      if (!inner.isHole()) {
        result.addPoly(inner)
      }
    }
    for (var i = 0; i < orig.getNumInnerPoly(); i++) {
      var inner = orig.getInnerPoly(i)
      if (inner.isHole()) {
        result.addPoly(inner)
      }
    }
  }
  return result
}
gpcas.geometry.TopPolygonNode.prototype.print = function () {
  //console.log("---- out_poly ----");
  var top_node = this.top_node
  var c = 0
  let npoly_node = null
  for (let poly_node = top_node; poly_node != null; poly_node = npoly_node) {
    //console.log("contour="+c+"  active="+poly_node.active+"  hole="+poly_node.proxy.hole);
    npoly_node = poly_node.next
    if (poly_node.active != 0) {
      const v = 0
      for (
        let vtx = poly_node.proxy.v[Clip.LEFT];
        vtx != null;
        vtx = vtx.next
      ) {
        //console.log("v="+v+"  vtx.x="+vtx.x+"  vtx.y="+vtx.y);
      }
      c++
    }
  }
}

///////////    VertexNode  ///////////////
gpcas.geometry.VertexNode = function (x, y) {
  this.x // X coordinate component
  this.y // Y coordinate component
  this.next // Pointer to next vertex in list

  this.x = x
  this.y = y
  this.next = null
}

/////////////   VertexType   /////////////
gpcas.geometry.VertexType = function () {}
gpcas.geometry.VertexType.NUL = 0 /* Empty non-intersection            */
gpcas.geometry.VertexType.EMX = 1 /* External maximum                  */
gpcas.geometry.VertexType.ELI = 2 /* External left intermediate        */
gpcas.geometry.VertexType.TED = 3 /* Top edge                          */
gpcas.geometry.VertexType.ERI = 4 /* External right intermediate       */
gpcas.geometry.VertexType.RED = 5 /* Right edge                        */
gpcas.geometry.VertexType.IMM = 6 /* Internal maximum and minimum      */
gpcas.geometry.VertexType.IMN = 7 /* Internal minimum                  */
gpcas.geometry.VertexType.EMN = 8 /* External minimum                  */
gpcas.geometry.VertexType.EMM = 9 /* External maximum and minimum      */
gpcas.geometry.VertexType.LED = 10 /* Left edge                         */
gpcas.geometry.VertexType.ILI = 11 /* Internal left intermediate        */
gpcas.geometry.VertexType.BED = 12 /* Bottom edge                       */
gpcas.geometry.VertexType.IRI = 13 /* Internal right intermediate       */
gpcas.geometry.VertexType.IMX = 14 /* Internal maximum                  */
gpcas.geometry.VertexType.FUL = 15 /* Full non-intersection             */
gpcas.geometry.VertexType.getType = function (tr, tl, br, bl) {
  return tr + (tl << 1) + (br << 2) + (bl << 3)
}

////////////////// WeilerAtherton  /////////////
gpcas.geometry.WeilerAtherton = function () {}

gpcas.geometry.WeilerAtherton.prototype.merge = function (p1, p2) {
  p1 = p1.clone()
  p2 = p2.clone()
}

export { gpcas }
