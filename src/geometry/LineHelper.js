import Point from "./Point.js"

export default class LineHelper {
  static equalPoint(p1, p2) {
    return p1[0] === p2[0] && p1[1] === p2[1]
  }

  static equalVertex(s1, e1, s2, e2) {
    return (
      (this.equalPoint(s1, s2) && this.equalPoint(e1, e2)) ||
      (this.equalPoint(s1, e2) && this.equalPoint(e1, s2))
    )
  }

  static distancePoints(p1, p2) {
    return Math.sqrt(
      (p2[0] - p1[0]) * (p2[0] - p1[0]) + (p2[1] - p1[1]) * (p2[1] - p1[1])
    )
  }

  static clonePoint(p) {
    return [p[0], p[1]]
  }

  static cloneLine(line) {
    const res = []
    for (let i = 0; i < line.length; i++) {
      res[i] = [line[i][0], line[i][1]]
    }
    return res
  }

  static addLineToLine(line1, line2) {
    for (let i = 0; i < line2.length; i++) {
      line1.push(this.clonePoint(line2[i]))
    }
  }

  static roundPoint(p) {
    p[0] = Math.round(p[0])
    p[1] = Math.round(p[1])
  }

  //---------------------------------------------------------------
  //Checks for intersection of Segment if as_seg is true.
  //Checks for intersection of Line if as_seg is false.
  //Return intersection of Segment "AB" and Segment "EF" as a Point
  //Return null if there is no intersection
  //---------------------------------------------------------------
  static lineIntersectLine(A, B, E, F, as_seg) {
    if (as_seg == null) as_seg = true

    const a1 = B.y - A.y
    const b1 = A.x - B.x
    const c1 = B.x * A.y - A.x * B.y
    const a2 = F.y - E.y
    const b2 = E.x - F.x
    const c2 = F.x * E.y - E.x * F.y

    const denom = a1 * b2 - a2 * b1
    if (denom === 0) {
      return null
    }
    const ip = new Point()
    ip.x = (b1 * c2 - b2 * c1) / denom
    ip.y = (a2 * c1 - a1 * c2) / denom

    //---------------------------------------------------
    //Do checks to see if intersection to endpoints
    //distance is longer than actual Segments.
    //Return null if it is with any.
    //---------------------------------------------------
    if (as_seg) {
      if (
        Math.pow(ip.x - B.x + (ip.y - B.y), 2) >
        Math.pow(A.x - B.x + (A.y - B.y), 2)
      ) {
        return null
      }
      if (
        Math.pow(ip.x - A.x + (ip.y - A.y), 2) >
        Math.pow(A.x - B.x + (A.y - B.y), 2)
      ) {
        return null
      }

      if (
        Math.pow(ip.x - F.x + (ip.y - F.y), 2) >
        Math.pow(E.x - F.x + (E.y - F.y), 2)
      ) {
        return null
      }
      if (
        Math.pow(ip.x - E.x + (ip.y - E.y), 2) >
        Math.pow(E.x - F.x + (E.y - F.y), 2)
      ) {
        return null
      }
    }
    return new Point(Math.round(ip.x), Math.round(ip.y))
  }
}
