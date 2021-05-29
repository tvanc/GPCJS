import Point from "../geometry/Point.js"
import { equals } from "./equals.js"
import ArrayList from "./ArrayList.js"

export default class ArrayHelper {
  static create2DArray(x) {
    const a = []
    for (let i = 0; i < x; i++) {
      a[i] = []
    }
    return a
  }

  static valueEqual(obj1, obj2) {
    return obj1 === obj2 || equals(obj1, obj2)
  }

  /**
   * @param vertices
   * @returns {ArrayList|[]}
   */
  static sortPointsClockwise(vertices) {
    let isArrayList = vertices instanceof ArrayList

    if (isArrayList) {
      vertices = vertices.toArray()
    }

    //point
    let maxTop = new Point(Infinity, Infinity)
    let maxBottom = new Point(-Infinity, -Infinity)
    let maxLeft = new Point(Infinity, -Infinity)
    let maxRight = new Point(-Infinity, Infinity)

    let maxLeftIndex
    let newVertices = vertices

    for (let i = 0; i < vertices.length; i++) {
      let vertex = vertices[i]

      if (
        maxTop.y > vertex.y ||
        (maxTop.y === vertex.y && vertex.x < maxTop.x)
      ) {
        maxTop = vertex
      }
      if (
        maxBottom.y < vertex.y ||
        (maxBottom.y === vertex.y && vertex.x > maxBottom.x)
      ) {
        maxBottom = vertex
      }
      if (
        maxLeft.x > vertex.x ||
        (maxLeft.x === vertex.x && vertex.y > maxLeft.y)
      ) {
        maxLeft = vertex
        maxLeftIndex = i
      }
      if (
        maxRight.x < vertex.x ||
        (maxRight.x === vertex.x && vertex.y < maxRight.y)
      ) {
        maxRight = vertex
      }
    }

    if (maxLeftIndex > 0) {
      newVertices = []
      let j = 0
      for (let i = maxLeftIndex; i < vertices.length; i++) {
        newVertices[j++] = vertices[i]
      }
      for (let i = 0; i < maxLeftIndex; i++) {
        newVertices[j++] = vertices[i]
      }
      vertices = newVertices
    }

    let reverse = false
    for (let i = 0; i < vertices.length; i++) {
      let vertex = vertices[i]
      if (equals(vertex, maxBottom)) {
        reverse = true
        break
      } else if (equals(vertex, maxTop)) {
        break
      }
    }
    if (reverse) {
      newVertices = []
      newVertices[0] = vertices[0]
      let j = 1
      for (let i = vertices.length - 1; i > 0; i--) {
        newVertices[j++] = vertices[i]
      }
      vertices = newVertices
    }

    return isArrayList ? new ArrayList(vertices) : vertices
  }
}
