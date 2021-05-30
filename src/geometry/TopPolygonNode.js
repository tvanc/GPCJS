import PolygonNode from "./PolygonNode.js"
import Clip from "./Clip.js"

export default class TopPolygonNode {
  top_node

  add_local_min(x, y) {
    const existing_min = this.top_node
    this.top_node = new PolygonNode(existing_min, x, y)
    return this.top_node
  }

  merge_left(p, q) {
    /* Label contour as a hole */
    q.proxy.hole = true

    if (p.proxy !== q.proxy) {
      /* Assign p's vertex list to the left end of q's list */
      p.proxy.v[Clip.RIGHT].next = q.proxy.v[Clip.LEFT]
      q.proxy.v[Clip.LEFT] = p.proxy.v[Clip.LEFT]

      /* Redirect any p.proxy references to q.proxy */
      const target = p.proxy
      for (let node = this.top_node; node != null; node = node.next) {
        if (node.proxy === target) {
          node.active = 0
          node.proxy = q.proxy
        }
      }
    }
  }

  merge_right(p, q) {
    /* Label contour as external */
    q.proxy.hole = false

    if (p.proxy !== q.proxy) {
      /* Assign p's vertex list to the right end of q's list */
      q.proxy.v[Clip.RIGHT].next = p.proxy.v[Clip.LEFT]
      q.proxy.v[Clip.RIGHT] = p.proxy.v[Clip.RIGHT]

      /* Redirect any p->proxy references to q->proxy */
      const target = p.proxy
      for (let node = this.top_node; node != null; node = node.next) {
        if (node.proxy === target) {
          node.active = 0
          node.proxy = q.proxy
        }
      }
    }
  }

  count_contours() {
    let nc = 0

    for (let polygon = this.top_node; polygon != null; polygon = polygon.next) {
      if (polygon.active !== 0) {
        /* Count the vertices in the current contour */
        let nv = 0
        for (let v = polygon.proxy.v[Clip.LEFT]; v != null; v = v.next) {
          nv++
        }

        /* Record valid vertex counts in the active field */
        if (nv > 2) {
          polygon.active = nv
          nc++
        } else {
          /* Invalid contour: just free the heap */
          // VertexNode nextv = null ;
          // for (VertexNode v= polygon.proxy.v[Clip.LEFT]; (v != null); v = nextv)
          // {
          //    nextv= v.next;
          //    v = null ;
          // }
          polygon.active = 0
        }
      }
    }
    return nc
  }

  getResult(polyClass) {
    const top_node = this.top_node
    let result = Clip.createNewPoly(polyClass)
    //console.log(polyClass);

    const num_contours = this.count_contours()

    if (num_contours > 0) {
      let c = 0
      let npoly_node = null
      for (
        let poly_node = top_node;
        poly_node != null;
        poly_node = npoly_node
      ) {
        npoly_node = poly_node.next
        if (poly_node.active !== 0) {
          let poly = result

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
            let vtx = poly_node.proxy.v[Clip.LEFT];
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
      const orig = result
      result = Clip.createNewPoly(polyClass)
      for (let i = 0; i < orig.getNumInnerPoly(); i++) {
        const inner = orig.getInnerPoly(i)
        if (!inner.isHole()) {
          result.addPoly(inner)
        }
      }
      for (let i = 0; i < orig.getNumInnerPoly(); i++) {
        const inner = orig.getInnerPoly(i)
        if (inner.isHole()) {
          result.addPoly(inner)
        }
      }
    }
    return result
  }

  print() {
    //console.log("---- out_poly ----");
    let c = 0
    let npoly_node = null
    for (
      let poly_node = this.top_node;
      poly_node != null;
      poly_node = npoly_node
    ) {
      // console.log(
      //   "contour=" +
      //     c +
      //     "  active=" +
      //     poly_node.active +
      //     "  hole=" +
      //     poly_node.proxy.hole
      // )
      npoly_node = poly_node.next
      if (!poly_node.active) {
        let v = 0
        for (
          let vtx = poly_node.proxy.v[Clip.LEFT];
          vtx != null;
          vtx = vtx.next
        ) {
          // console.log("v=" + v + "  vtx.x=" + vtx.x + "  vtx.y=" + vtx.y)
        }
        c++
      }
    }
  }
}
