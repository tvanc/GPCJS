import LineHelper from "./LineHelper.js"
import IntersectionPoint from "./IntersectionPoint.js"
import { equals } from "../util/equals.js"
import PolySimple from "./PolySimple.js"

export default class LineIntersection {
  static iteratePoints(points, s1, s2, e1, e2) {
    const pl = points.length
    const s1Ind = points.indexOf(s1)
    const s2Ind = points.indexOf(s2)
    const direction = s1Ind <= s2Ind
    const newPoints = []

    if (direction) {
      for (let i = 0; i < pl; i++) {
        let point = i + s1Ind < pl ? points[i + s1Ind] : points[i + s1Ind - pl]
        newPoints.push(point)
        if (equals(point, e1) || equals(point, e2)) {
          break
        }
      }
    } else {
      for (let i = pl; i >= 0; i--) {
        let point = i + s1Ind < pl ? points[i + s1Ind] : points[i + s1Ind - pl]
        newPoints.push(point)
        if (equals(point, e1) || equals(point, e2)) {
          break
        }
      }
    }

    return newPoints
  }

  static intersectPoly(poly, line) {
    const numPoints = poly.getNumPoints()

    //points
    let firstIntersection = null
    let lastIntersection = null
    let firstIntersectionLineIndex = -1
    let lastIntersectionLineIndex = -1
    let firstFound = false

    for (let i = 1; i < line.length; i++) {
      const p1 = line[i - 1]
      const p2 = line[i]
      let maxDist = 0
      let minDist = Number.MAX_VALUE
      let dist = -1
      for (let j = 0; j < numPoints; j++) {
        const p3 = poly.getPoint(j === 0 ? numPoints - 1 : j - 1)
        const p4 = poly.getPoint(j)
        let ip = LineHelper.lineIntersectLine(p1, p2, p3, p4)

        if (ip != null) {
          dist = LineHelper.distancePoints(ip, p2)

          if (dist > maxDist && !firstFound) {
            maxDist = dist
            firstIntersection = new IntersectionPoint(p3, p4, ip)
            firstIntersectionLineIndex = i
          }
          if (dist < minDist) {
            minDist = dist
            lastIntersection = new IntersectionPoint(p3, p4, ip)
            lastIntersectionLineIndex = i - 1
          }
        }
      }
      firstFound = firstIntersection != null
    }
    /*
        Alert.show(firstIntersection.toString());
        Alert.show(lastIntersection.toString());*/
    if (firstIntersection != null && lastIntersection != null) {
      const newLine /* of Point */ = []
      newLine[0] = firstIntersection.intersectionPoint
      let j = 1
      for (
        let i = firstIntersectionLineIndex;
        i <= lastIntersectionLineIndex;
        i++
      ) {
        newLine[j++] = line[i]
      }
      newLine[newLine.length - 1] = lastIntersection.intersectionPoint
      if (
        (equals(
          firstIntersection.polygonPoint1,
          lastIntersection.polygonPoint1
        ) &&
          equals(
            firstIntersection.polygonPoint2,
            lastIntersection.polygonPoint2
          )) ||
        (equals(
          firstIntersection.polygonPoint1,
          lastIntersection.polygonPoint2
        ) &&
          equals(
            firstIntersection.polygonPoint2,
            lastIntersection.polygonPoint1
          ))
      ) {
        let poly1 = new PolySimple()
        poly1.add(newLine)
        let finPoly1 = poly.intersection(poly1)
        let finPoly2 = poly.xor(poly1)
        if (this.checkPoly(finPoly1) && this.checkPoly(finPoly2)) {
          return [finPoly1, finPoly2]
        }
      } else {
        const points1 = this.iteratePoints(
          poly.getPoints(),
          firstIntersection.polygonPoint1,
          firstIntersection.polygonPoint2,
          lastIntersection.polygonPoint1,
          lastIntersection.polygonPoint2
        ).concat(newLine.reverse())

        const points2 = this.iteratePoints(
          poly.getPoints(),
          firstIntersection.polygonPoint2,
          firstIntersection.polygonPoint1,
          lastIntersection.polygonPoint1,
          lastIntersection.polygonPoint2
        ).concat(newLine)

        const poly1 = new PolySimple()
        poly1.add(points1)
        const poly2 = new PolySimple()
        poly2.add(points2)
        const finPoly1 = poly.intersection(poly1)
        const finPoly2 = poly.intersection(poly2)

        if (this.checkPoly(finPoly1) && this.checkPoly(finPoly2)) {
          return [finPoly1, finPoly2]
        }
      }
    }
    return null
  }

  static checkPoly(poly) {
    let noHoles = 0
    for (let i = 0; i < poly.getNumInnerPoly(); i++) {
      const innerPoly = poly.getInnerPoly(i)

      if (innerPoly.isHole()) {
        return false
      } else {
        noHoles++
      }

      if (noHoles > 1) return false
    }
    return true
  }
}
