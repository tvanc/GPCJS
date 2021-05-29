import Point from "./Point.js"
import ArrayHelper from "../util/ArrayHelper.js"
import { equals } from "../util/equals.js"

export default class Polygon {
  maxTop
  maxBottom
  maxLeft
  maxRight
  vertices = []

  fromArray(v) {
    this.vertices = []

    for (let i = 0; i < v.length; i++) {
      const [x, y] = v[i]
      this.vertices.push(new Point(x, y))
    }
  }

  /**
   *
   */
  /*Normalize vertices in polygon to be ordered clockwise from most left point*/
  normalize() {
    return ArrayHelper.sortPointsClockwise(this.vertices)
  }

  getVertexIndex(vertex) {
    for (let i = 0; i < this.vertices.length; i++) {
      if (equals(this.vertices[i], vertex)) {
        return i
      }
    }
    return -1
  }

  insertVertex(vertex1, vertex2, newVertex) {
    let vertex1Index = this.getVertexIndex(vertex1)
    let vertex2Index = this.getVertexIndex(vertex2)
    if (vertex1Index === -1 || vertex2Index === -1) {
      return false
    }

    if (vertex2Index < vertex1Index) {
      let i = vertex1Index
      vertex1Index = vertex2Index
      vertex2Index = i
    }
    if (vertex2Index === vertex1Index + 1) {
      const newVertices = []
      for (let i = 0; i <= vertex1Index; i++) {
        newVertices[i] = this.vertices[i]
      }
      newVertices[vertex2Index] = newVertex
      for (let i = vertex2Index; i < this.vertices.length; i++) {
        newVertices[i + 1] = this.vertices[i]
      }
      this.vertices = newVertices
    } else if (
      vertex2Index === this.vertices.length - 1 &&
      vertex1Index === 0
    ) {
      this.vertices.push(newVertex)
    }
    return true
  }

  clone() {
    const res = new Polygon()
    res.vertices = this.vertices.slice(this.vertices.length - 1)
    return res
  }

  toString() {
    const vertices = this.vertices
    let res = "["
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i]
      res += (i > 0 ? "," : "") + "[" + vertex.x + "," + vertex.y + "]"
    }
    res += "]"
    return res
  }
}
