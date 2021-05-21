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
import LmtNode from "./geometry/LmtNode.js"
import LmtTable from "./geometry/LmtTable.js"
import OperationType from "./geometry/OperationType.js"
import PolyDefault from "./geometry/PolyDefault.js"
import Polygon from "./geometry/Polygon.js"
import PolygonNode from "./geometry/PolygonNode.js"
import PolySimple from "./geometry/PolySimple.js"
import Rectangle from "./geometry/Rectangle.js"
import ScanBeamTree from "./geometry/ScanBeamTree.js"
import ScanBeamTreeEntries from "./geometry/ScanBeamTreeEntries.js"
import StNode from "./geometry/StNode.js"

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
    LmtNode,
    LmtTable,
    OperationType,
    PolyDefault,
    Polygon,
    PolygonNode,
    PolySimple,
    Rectangle,
    ScanBeamTree,
    ScanBeamTreeEntries,
    StNode,
  },
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
