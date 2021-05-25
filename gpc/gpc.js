import ArrayHelper from "./util/ArrayHelper.js"
import Point from "./geometry/Point.js"
import ArrayList from "./util/ArrayList.js"
// import Clip from "./geometry/Clip.js"
import AetTree from "./geometry/AetTree.js"
import BundleState from "./geometry/BundleState.js"
import EdgeNode from "./geometry/EdgeNode.js"
import EdgeTable from "./geometry/EdgeTable.js"
import HState from "./geometry/HState.js"
import IntersectionPoint from "./geometry/IntersectionPoint.js"
import ItNode from "./geometry/ItNode.js"
import ItNodeTable from "./geometry/ItNodeTable.js"
import Line from "./geometry/Line.js"
import LineHelper from "./geometry/LineHelper.js"
import LineIntersection from "./geometry/LineIntersection.js"
import LmtNode from "./geometry/LmtNode.js"
import LmtTable from "./geometry/LmtTable.js"
import OperationType from "./geometry/OperationType.js"
import PolyDefault from "./geometry/PolyDefault.js"
import Polygon from "./geometry/Polygon.js"
import PolygonNode from "./geometry/PolygonNode.js"
// import PolySimple from "./geometry/PolySimple.js"
import Rectangle from "./geometry/Rectangle.js"
import ScanBeamTree from "./geometry/ScanBeamTree.js"
import ScanBeamTreeEntries from "./geometry/ScanBeamTreeEntries.js"
import StNode from "./geometry/StNode.js"
// import TopPolygonNode from "./geometry/TopPolygonNode.js"
import VertexNode from "./geometry/VertexNode.js"
import VertexType from "./geometry/VertexType.js"
import WeilerAtherton from "./geometry/WeilerAtherton.js"

import { equals } from "./util/index.js"

export const gpcas = {
  util: {
    ArrayHelper,
    ArrayList,
  },
  geometry: {
    // Clip,
    AetTree,
    BundleState,
    EdgeNode,
    EdgeTable,
    HState,
    IntersectionPoint,
    ItNode,
    ItNodeTable,
    Line,
    LineHelper,
    LineIntersection,
    LmtNode,
    LmtTable,
    OperationType,
    PolyDefault,
    Polygon,
    PolygonNode,
    // PolySimple,
    Rectangle,
    ScanBeamTree,
    ScanBeamTreeEntries,
    StNode,
    // TopPolygonNode,
    VertexNode,
    VertexType,
    WeilerAtherton,
  },
}

// region Clip
class Clip {
  static DEBUG = false
  static GPC_EPSILON = 2.2204460492503131e-16
  static GPC_VERSION = "2.31"
  static LEFT = 0
  static RIGHT = 1
  static ABOVE = 0
  static BELOW = 1
  static CLIP = 0
  static SUBJ = 1

  /**
   * Return the intersection of <code>p1</code> and <code>p2</code> where the
   * return type is of <code>polyClass</code>.  See the note in the class description
   * for more on <ocde>polyClass</code>.
   *
   * @param p1        One of the polygons to performt he intersection with
   * @param p2        One of the polygons to performt he intersection with
   * @param polyClass The type of <code>Poly</code> to return
   */
  static intersection(p1, p2, polyClass) {
    if (polyClass == null || polyClass == undefined) {
      polyClass = "PolyDefault"
    }
    return Clip.clip(OperationType.GPC_INT, p1, p2, polyClass)
  }

  /**
   * Return the union of <code>p1</code> and <code>p2</code> where the
   * return type is of <code>polyClass</code>.  See the note in the class description
   * for more on <ocde>polyClass</code>.
   *
   * @param p1        One of the polygons to performt he union with
   * @param p2        One of the polygons to performt he union with
   * @param polyClass The type of <code>Poly</code> to return
   */
  static union(p1, p2, polyClass) {
    if (polyClass == null || polyClass == undefined) {
      polyClass = "PolyDefault"
    }

    return Clip.clip(OperationType.GPC_UNION, p1, p2, polyClass)
  }

  /**
   * Return the xor of <code>p1</code> and <code>p2</code> where the
   * return type is of <code>polyClass</code>.  See the note in the class description
   * for more on <ocde>polyClass</code>.
   *
   * @param p1        One of the polygons to performt he xor with
   * @param p2        One of the polygons to performt he xor with
   * @param polyClass The type of <code>Poly</code> to return
   */
  static xor(p1, p2, polyClass) {
    if (polyClass == null || polyClass == undefined) {
      polyClass = "PolyDefault"
    }
    return Clip.clip(OperationType.GPC_XOR, p1, p2, polyClass)
  }

  /**
   * Return the difference of <code>p1</code> and <code>p2</code> where the
   * return type is of <code>polyClass</code>.  See the note in the class description
   * for more on <ocde>polyClass</code>.
   *
   * @param p1        Polygon from which second polygon will be substracted
   * @param p2        Second polygon
   * @param polyClass The type of <code>Poly</code> to return
   */
  static difference(p1, p2, polyClass) {
    if (polyClass == null || polyClass == undefined) {
      polyClass = "PolyDefault"
    }
    return Clip.clip(OperationType.GPC_DIFF, p2, p1, polyClass)
  }

  static intersection(p1, p2) {
    return Clip.clip(OperationType.GPC_INT, p1, p2, "PolyDefault.class")
  }

  // -----------------------
  // --- Private Methods ---
  // -----------------------

  /**
   * Create a new <code>Poly</code> type object using <code>polyClass</code>.
   */
  static createNewPoly(polyClass) {
    /* TODO :
     try
     {
     return (Poly)polyClass.newInstance();
     }
     catch( var e:Exception)
     {
     throw new RuntimeException(e);
     }*/
    if (polyClass == "PolySimple") {
      return new PolySimple()
    }
    if (polyClass == "PolyDefault") {
      return new PolyDefault()
    }
    if (polyClass == "PolyDefault.class") {
      return new PolyDefault()
    }

    return null
  }

  /**
   * <code>clip()</code> is the main method of the clipper algorithm.
   * This is where the conversion from really begins.
   */
  static clip(op, subj, clip, polyClass) {
    var result = Clip.createNewPoly(polyClass)

    /* Test for trivial NULL result cases */
    if (
      (subj.isEmpty() && clip.isEmpty()) ||
      (subj.isEmpty() &&
        (op == OperationType.GPC_INT || op == OperationType.GPC_DIFF)) ||
      (clip.isEmpty() && op == OperationType.GPC_INT)
    ) {
      return result
    }

    /* Identify potentialy contributing contours */
    if (
      (op == OperationType.GPC_INT || op == OperationType.GPC_DIFF) &&
      !subj.isEmpty() &&
      !clip.isEmpty()
    ) {
      Clip.minimax_test(subj, clip, op)
    }

    //console.log("SUBJ " + subj);
    //console.log("CLIP " + clip);

    /* Build LMT */
    var lmt_table = new LmtTable()
    var sbte = new ScanBeamTreeEntries()
    var s_heap = null
    var c_heap = null

    if (!subj.isEmpty()) {
      s_heap = Clip.build_lmt(lmt_table, sbte, subj, Clip.SUBJ, op)
    }
    if (Clip.DEBUG) {
      //console.log("");
      //console.log(" ------------ After build_lmt for subj ---------");
      lmt_table.print()
    }
    if (!clip.isEmpty()) {
      c_heap = Clip.build_lmt(lmt_table, sbte, clip, Clip.CLIP, op)
    }
    if (Clip.DEBUG) {
      //console.log("");
      //console.log(" ------------ After build_lmt for clip ---------");
      lmt_table.print()
    }

    /* Return a NULL result if no contours contribute */
    if (lmt_table.top_node == null) {
      return result
    }

    /* Build scanbeam table from scanbeam tree */
    var sbt = sbte.build_sbt()

    var parity = []
    parity[0] = Clip.LEFT
    parity[1] = Clip.LEFT

    /* Invert clip polygon for difference operation */
    if (op == OperationType.GPC_DIFF) {
      parity[Clip.CLIP] = Clip.RIGHT
    }

    if (Clip.DEBUG) {
      //console.log(sbt);
    }

    var local_min = lmt_table.top_node

    var out_poly = new TopPolygonNode() // used to create resulting Poly

    var aet = new AetTree()
    var scanbeam = 0

    /* Process each scanbeam */
    while (scanbeam < sbt.length) {
      /* Set yb and yt to the bottom and top of the scanbeam */
      var yb = sbt[scanbeam++]
      var yt = 0.0
      var dy = 0.0
      if (scanbeam < sbt.length) {
        yt = sbt[scanbeam]
        dy = yt - yb
      }

      /* === SCANBEAM BOUNDARY PROCESSING ================================ */

      /* If LMT node corresponding to yb exists */
      if (local_min != null) {
        if (local_min.y == yb) {
          /* Add edges starting at this local minimum to the AET */
          for (
            var edge = local_min.first_bound;
            edge != null;
            edge = edge.next_bound
          ) {
            Clip.add_edge_to_aet(aet, edge)
          }

          local_min = local_min.next
        }
      }

      if (Clip.DEBUG) {
        aet.print()
      }
      /* Set dummy previous x value */
      var px = -Number.MAX_VALUE

      /* Create bundles within AET */
      var e0 = aet.top_node
      var e1 = aet.top_node

      /* Set up bundle fields of first edge */
      aet.top_node.bundle[Clip.ABOVE][aet.top_node.type] =
        aet.top_node.top.y != yb ? 1 : 0
      aet.top_node.bundle[Clip.ABOVE][aet.top_node.type == 0 ? 1 : 0] = 0
      aet.top_node.bstate[Clip.ABOVE] = BundleState.UNBUNDLED

      for (
        var next_edge = aet.top_node.next;
        next_edge != null;
        next_edge = next_edge.next
      ) {
        var ne_type = next_edge.type
        var ne_type_opp = next_edge.type == 0 ? 1 : 0 //next edge type opposite

        /* Set up bundle fields of next edge */
        next_edge.bundle[Clip.ABOVE][ne_type] = next_edge.top.y != yb ? 1 : 0
        next_edge.bundle[Clip.ABOVE][ne_type_opp] = 0
        next_edge.bstate[Clip.ABOVE] = BundleState.UNBUNDLED

        /* Bundle edges above the scanbeam boundary if they coincide */
        if (next_edge.bundle[Clip.ABOVE][ne_type] == 1) {
          if (
            Clip.EQ(e0.xb, next_edge.xb) &&
            Clip.EQ(e0.dx, next_edge.dx) &&
            e0.top.y != yb
          ) {
            next_edge.bundle[Clip.ABOVE][ne_type] ^=
              e0.bundle[Clip.ABOVE][ne_type]
            next_edge.bundle[Clip.ABOVE][ne_type_opp] =
              e0.bundle[Clip.ABOVE][ne_type_opp]
            next_edge.bstate[Clip.ABOVE] = BundleState.BUNDLE_HEAD
            e0.bundle[Clip.ABOVE][Clip.CLIP] = 0
            e0.bundle[Clip.ABOVE][Clip.SUBJ] = 0
            e0.bstate[Clip.ABOVE] = BundleState.BUNDLE_TAIL
          }
          e0 = next_edge
        }
      }

      var horiz = []
      horiz[Clip.CLIP] = HState.NH
      horiz[Clip.SUBJ] = HState.NH

      var exists = []
      exists[Clip.CLIP] = 0
      exists[Clip.SUBJ] = 0

      var cf = null

      /* Process each edge at this scanbeam boundary */
      for (var edge = aet.top_node; edge != null; edge = edge.next) {
        exists[Clip.CLIP] =
          edge.bundle[Clip.ABOVE][Clip.CLIP] +
          (edge.bundle[Clip.BELOW][Clip.CLIP] << 1)
        exists[Clip.SUBJ] =
          edge.bundle[Clip.ABOVE][Clip.SUBJ] +
          (edge.bundle[Clip.BELOW][Clip.SUBJ] << 1)

        if (exists[Clip.CLIP] != 0 || exists[Clip.SUBJ] != 0) {
          /* Set bundle side */
          edge.bside[Clip.CLIP] = parity[Clip.CLIP]
          edge.bside[Clip.SUBJ] = parity[Clip.SUBJ]

          var contributing = false
          var br = 0
          var bl = 0
          var tr = 0
          var tl = 0
          /* Determine contributing status and quadrant occupancies */
          if (op == OperationType.GPC_DIFF || op == OperationType.GPC_INT) {
            contributing =
              (exists[Clip.CLIP] != 0 &&
                (parity[Clip.SUBJ] != 0 || horiz[Clip.SUBJ] != 0)) ||
              (exists[Clip.SUBJ] != 0 &&
                (parity[Clip.CLIP] != 0 || horiz[Clip.CLIP] != 0)) ||
              (exists[Clip.CLIP] != 0 &&
                exists[Clip.SUBJ] != 0 &&
                parity[Clip.CLIP] == parity[Clip.SUBJ])
            br = parity[Clip.CLIP] != 0 && parity[Clip.SUBJ] != 0 ? 1 : 0
            bl =
              (parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP]) != 0 &&
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                ? 1
                : 0
            tr =
              (parity[Clip.CLIP] ^ (horiz[Clip.CLIP] != HState.NH ? 1 : 0)) !=
                0 &&
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] != HState.NH ? 1 : 0)) != 0
                ? 1
                : 0
            tl =
              (parity[Clip.CLIP] ^
                (horiz[Clip.CLIP] != HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.CLIP]) !=
                0 &&
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] != HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ]) !=
                0
                ? 1
                : 0
          } else if (op == OperationType.GPC_XOR) {
            contributing = exists[Clip.CLIP] != 0 || exists[Clip.SUBJ] != 0
            br = parity[Clip.CLIP] ^ parity[Clip.SUBJ]
            bl =
              parity[Clip.CLIP] ^
              edge.bundle[Clip.ABOVE][Clip.CLIP] ^
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ])
            tr =
              parity[Clip.CLIP] ^
              (horiz[Clip.CLIP] != HState.NH ? 1 : 0) ^
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] != HState.NH ? 1 : 0))
            tl =
              parity[Clip.CLIP] ^
              (horiz[Clip.CLIP] != HState.NH ? 1 : 0) ^
              edge.bundle[Clip.BELOW][Clip.CLIP] ^
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] != HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ])
          } else if (op == OperationType.GPC_UNION) {
            contributing =
              (exists[Clip.CLIP] != 0 &&
                (!(parity[Clip.SUBJ] != 0) || horiz[Clip.SUBJ] != 0)) ||
              (exists[Clip.SUBJ] != 0 &&
                (!(parity[Clip.CLIP] != 0) || horiz[Clip.CLIP] != 0)) ||
              (exists[Clip.CLIP] != 0 &&
                exists[Clip.SUBJ] != 0 &&
                parity[Clip.CLIP] == parity[Clip.SUBJ])
            br = parity[Clip.CLIP] != 0 || parity[Clip.SUBJ] != 0 ? 1 : 0
            bl =
              (parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP]) != 0 ||
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                ? 1
                : 0
            tr =
              (parity[Clip.CLIP] ^ (horiz[Clip.CLIP] != HState.NH ? 1 : 0)) !=
                0 ||
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] != HState.NH ? 1 : 0)) != 0
                ? 1
                : 0
            tl =
              (parity[Clip.CLIP] ^
                (horiz[Clip.CLIP] != HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.CLIP]) !=
                0 ||
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] != HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ]) !=
                0
                ? 1
                : 0
          } else {
            //console.log("ERROR : Unknown op");
          }

          /* Update parity */
          parity[Clip.CLIP] ^= edge.bundle[Clip.ABOVE][Clip.CLIP]
          parity[Clip.SUBJ] ^= edge.bundle[Clip.ABOVE][Clip.SUBJ]

          /* Update horizontal state */
          if (exists[Clip.CLIP] != 0) {
            horiz[Clip.CLIP] =
              HState.next_h_state[horiz[Clip.CLIP]][
                ((exists[Clip.CLIP] - 1) << 1) + parity[Clip.CLIP]
              ]
          }
          if (exists[Clip.SUBJ] != 0) {
            horiz[Clip.SUBJ] =
              HState.next_h_state[horiz[Clip.SUBJ]][
                ((exists[Clip.SUBJ] - 1) << 1) + parity[Clip.SUBJ]
              ]
          }

          if (contributing) {
            var xb = edge.xb

            var vclass = VertexType.getType(tr, tl, br, bl)
            switch (vclass) {
              case VertexType.EMN:
              case VertexType.IMN:
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                px = xb
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.ERI:
                if (xb != px) {
                  cf.add_right(xb, yb)
                  px = xb
                }
                edge.outp[Clip.ABOVE] = cf
                cf = null
                break
              case VertexType.ELI:
                edge.outp[Clip.BELOW].add_left(xb, yb)
                px = xb
                cf = edge.outp[Clip.BELOW]
                break
              case VertexType.EMX:
                if (xb != px) {
                  cf.add_left(xb, yb)
                  px = xb
                }
                out_poly.merge_right(cf, edge.outp[Clip.BELOW])
                cf = null
                break
              case VertexType.ILI:
                if (xb != px) {
                  cf.add_left(xb, yb)
                  px = xb
                }
                edge.outp[Clip.ABOVE] = cf
                cf = null
                break
              case VertexType.IRI:
                edge.outp[Clip.BELOW].add_right(xb, yb)
                px = xb
                cf = edge.outp[Clip.BELOW]
                edge.outp[Clip.BELOW] = null
                break
              case VertexType.IMX:
                if (xb != px) {
                  cf.add_right(xb, yb)
                  px = xb
                }
                out_poly.merge_left(cf, edge.outp[Clip.BELOW])
                cf = null
                edge.outp[Clip.BELOW] = null
                break
              case VertexType.IMM:
                if (xb != px) {
                  cf.add_right(xb, yb)
                  px = xb
                }
                out_poly.merge_left(cf, edge.outp[Clip.BELOW])
                edge.outp[Clip.BELOW] = null
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.EMM:
                if (xb != px) {
                  cf.add_left(xb, yb)
                  px = xb
                }
                out_poly.merge_right(cf, edge.outp[Clip.BELOW])
                edge.outp[Clip.BELOW] = null
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.LED:
                if (edge.bot.y == yb) edge.outp[Clip.BELOW].add_left(xb, yb)
                edge.outp[Clip.ABOVE] = edge.outp[Clip.BELOW]
                px = xb
                break
              case VertexType.RED:
                if (edge.bot.y == yb) edge.outp[Clip.BELOW].add_right(xb, yb)
                edge.outp[Clip.ABOVE] = edge.outp[Clip.BELOW]
                px = xb
                break
              default:
                break
            } /* End of switch */
          } /* End of contributing conditional */
        } /* End of edge exists conditional */
        if (Clip.DEBUG) {
          out_poly.print()
        }
        out_poly.print()
      } /* End of AET loop */

      /* Delete terminating edges from the AET, otherwise compute xt */
      for (var edge = aet.top_node; edge != null; edge = edge.next) {
        if (edge.top.y == yb) {
          var prev_edge = edge.prev
          var next_edge = edge.next

          if (prev_edge != null) prev_edge.next = next_edge
          else aet.top_node = next_edge

          if (next_edge != null) next_edge.prev = prev_edge

          /* Copy bundle head state to the adjacent tail edge if required */
          if (
            edge.bstate[Clip.BELOW] == BundleState.BUNDLE_HEAD &&
            prev_edge != null
          ) {
            if (prev_edge.bstate[Clip.BELOW] == BundleState.BUNDLE_TAIL) {
              prev_edge.outp[Clip.BELOW] = edge.outp[Clip.BELOW]
              prev_edge.bstate[Clip.BELOW] = BundleState.UNBUNDLED
              if (prev_edge.prev != null) {
                if (
                  prev_edge.prev.bstate[Clip.BELOW] == BundleState.BUNDLE_TAIL
                ) {
                  prev_edge.bstate[Clip.BELOW] = BundleState.BUNDLE_HEAD
                }
              }
            }
          }
        } else {
          if (edge.top.y == yt) edge.xt = edge.top.x
          else edge.xt = edge.bot.x + edge.dx * (yt - edge.bot.y)
        }
      }

      if (scanbeam < sbte.sbt_entries) {
        /* === SCANBEAM INTERIOR PROCESSING ============================== */

        /* Build intersection table for the current scanbeam */
        var it_table = new ItNodeTable()
        it_table.build_intersection_table(aet, dy)

        /* Process each node in the intersection table */

        for (
          var intersect = it_table.top_node;
          intersect != null;
          intersect = intersect.next
        ) {
          e0 = intersect.ie[0]
          e1 = intersect.ie[1]

          /* Only generate output for contributing intersections */

          if (
            (e0.bundle[Clip.ABOVE][Clip.CLIP] != 0 ||
              e0.bundle[Clip.ABOVE][Clip.SUBJ] != 0) &&
            (e1.bundle[Clip.ABOVE][Clip.CLIP] != 0 ||
              e1.bundle[Clip.ABOVE][Clip.SUBJ] != 0)
          ) {
            var p = e0.outp[Clip.ABOVE]
            var q = e1.outp[Clip.ABOVE]
            var ix = intersect.point.x
            var iy = intersect.point.y + yb

            var in_clip =
              (e0.bundle[Clip.ABOVE][Clip.CLIP] != 0 &&
                !(e0.bside[Clip.CLIP] != 0)) ||
              (e1.bundle[Clip.ABOVE][Clip.CLIP] != 0 &&
                e1.bside[Clip.CLIP] != 0) ||
              (!(e0.bundle[Clip.ABOVE][Clip.CLIP] != 0) &&
                !(e1.bundle[Clip.ABOVE][Clip.CLIP] != 0) &&
                e0.bside[Clip.CLIP] != 0 &&
                e1.bside[Clip.CLIP] != 0)
                ? 1
                : 0

            var in_subj =
              (e0.bundle[Clip.ABOVE][Clip.SUBJ] != 0 &&
                !(e0.bside[Clip.SUBJ] != 0)) ||
              (e1.bundle[Clip.ABOVE][Clip.SUBJ] != 0 &&
                e1.bside[Clip.SUBJ] != 0) ||
              (!(e0.bundle[Clip.ABOVE][Clip.SUBJ] != 0) &&
                !(e1.bundle[Clip.ABOVE][Clip.SUBJ] != 0) &&
                e0.bside[Clip.SUBJ] != 0 &&
                e1.bside[Clip.SUBJ] != 0)
                ? 1
                : 0

            var tr = 0
            var tl = 0
            var br = 0
            var bl = 0
            /* Determine quadrant occupancies */
            if (op == OperationType.GPC_DIFF || op == OperationType.GPC_INT) {
              tr = in_clip != 0 && in_subj != 0 ? 1 : 0
              tl =
                (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP]) != 0 &&
                (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                  ? 1
                  : 0
              br =
                (in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP]) != 0 &&
                (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                  ? 1
                  : 0
              bl =
                (in_clip ^
                  e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                  e0.bundle[Clip.ABOVE][Clip.CLIP]) !=
                  0 &&
                (in_subj ^
                  e1.bundle[Clip.ABOVE][Clip.SUBJ] ^
                  e0.bundle[Clip.ABOVE][Clip.SUBJ]) !=
                  0
                  ? 1
                  : 0
            } else if (op == OperationType.GPC_XOR) {
              tr = in_clip ^ in_subj
              tl =
                in_clip ^
                e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ])
              br =
                in_clip ^
                e0.bundle[Clip.ABOVE][Clip.CLIP] ^
                (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ])
              bl =
                in_clip ^
                e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                e0.bundle[Clip.ABOVE][Clip.CLIP] ^
                (in_subj ^
                  e1.bundle[Clip.ABOVE][Clip.SUBJ] ^
                  e0.bundle[Clip.ABOVE][Clip.SUBJ])
            } else if (op == OperationType.GPC_UNION) {
              tr = in_clip != 0 || in_subj != 0 ? 1 : 0
              tl =
                (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP]) != 0 ||
                (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                  ? 1
                  : 0
              br =
                (in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP]) != 0 ||
                (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]) != 0
                  ? 1
                  : 0
              bl =
                (in_clip ^
                  e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                  e0.bundle[Clip.ABOVE][Clip.CLIP]) !=
                  0 ||
                (in_subj ^
                  e1.bundle[Clip.ABOVE][Clip.SUBJ] ^
                  e0.bundle[Clip.ABOVE][Clip.SUBJ]) !=
                  0
                  ? 1
                  : 0
            } else {
              //console.log("ERROR : Unknown op type, "+op);
            }

            var vclass = VertexType.getType(tr, tl, br, bl)
            switch (vclass) {
              case VertexType.EMN:
                e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy)
                e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE]
                break
              case VertexType.ERI:
                if (p != null) {
                  p.add_right(ix, iy)
                  e1.outp[Clip.ABOVE] = p
                  e0.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.ELI:
                if (q != null) {
                  q.add_left(ix, iy)
                  e0.outp[Clip.ABOVE] = q
                  e1.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.EMX:
                if (p != null && q != null) {
                  p.add_left(ix, iy)
                  out_poly.merge_right(p, q)
                  e0.outp[Clip.ABOVE] = null
                  e1.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.IMN:
                e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy)
                e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE]
                break
              case VertexType.ILI:
                if (p != null) {
                  p.add_left(ix, iy)
                  e1.outp[Clip.ABOVE] = p
                  e0.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.IRI:
                if (q != null) {
                  q.add_right(ix, iy)
                  e0.outp[Clip.ABOVE] = q
                  e1.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.IMX:
                if (p != null && q != null) {
                  p.add_right(ix, iy)
                  out_poly.merge_left(p, q)
                  e0.outp[Clip.ABOVE] = null
                  e1.outp[Clip.ABOVE] = null
                }
                break
              case VertexType.IMM:
                if (p != null && q != null) {
                  p.add_right(ix, iy)
                  out_poly.merge_left(p, q)
                  e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy)
                  e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE]
                }
                break
              case VertexType.EMM:
                if (p != null && q != null) {
                  p.add_left(ix, iy)
                  out_poly.merge_right(p, q)
                  e0.outp[Clip.ABOVE] = out_poly.add_local_min(ix, iy)
                  e1.outp[Clip.ABOVE] = e0.outp[Clip.ABOVE]
                }
                break
              default:
                break
            } /* End of switch */
          } /* End of contributing intersection conditional */

          /* Swap bundle sides in response to edge crossing */
          if (e0.bundle[Clip.ABOVE][Clip.CLIP] != 0)
            e1.bside[Clip.CLIP] = e1.bside[Clip.CLIP] == 0 ? 1 : 0
          if (e1.bundle[Clip.ABOVE][Clip.CLIP] != 0)
            e0.bside[Clip.CLIP] = e0.bside[Clip.CLIP] == 0 ? 1 : 0
          if (e0.bundle[Clip.ABOVE][Clip.SUBJ] != 0)
            e1.bside[Clip.SUBJ] = e1.bside[Clip.SUBJ] == 0 ? 1 : 0
          if (e1.bundle[Clip.ABOVE][Clip.SUBJ] != 0)
            e0.bside[Clip.SUBJ] = e0.bside[Clip.SUBJ] == 0 ? 1 : 0

          /* Swap e0 and e1 bundles in the AET */
          var prev_edge = e0.prev
          var next_edge = e1.next
          if (next_edge != null) {
            next_edge.prev = e0
          }

          if (e0.bstate[Clip.ABOVE] == BundleState.BUNDLE_HEAD) {
            var search = true
            while (search) {
              prev_edge = prev_edge.prev
              if (prev_edge != null) {
                if (prev_edge.bstate[Clip.ABOVE] != BundleState.BUNDLE_TAIL) {
                  search = false
                }
              } else {
                search = false
              }
            }
          }
          if (prev_edge == null) {
            aet.top_node.prev = e1
            e1.next = aet.top_node
            aet.top_node = e0.next
          } else {
            prev_edge.next.prev = e1
            e1.next = prev_edge.next
            prev_edge.next = e0.next
          }
          e0.next.prev = prev_edge
          e1.next.prev = e1
          e0.next = next_edge
          if (Clip.DEBUG) {
            out_poly.print()
          }
        } /* End of IT loop*/

        /* Prepare for next scanbeam */
        for (var edge = aet.top_node; edge != null; edge = edge.next) {
          var next_edge = edge.next
          var succ_edge = edge.succ
          if (edge.top.y == yt && succ_edge != null) {
            /* Replace AET edge by its successor */
            succ_edge.outp[Clip.BELOW] = edge.outp[Clip.ABOVE]
            succ_edge.bstate[Clip.BELOW] = edge.bstate[Clip.ABOVE]
            succ_edge.bundle[Clip.BELOW][Clip.CLIP] =
              edge.bundle[Clip.ABOVE][Clip.CLIP]
            succ_edge.bundle[Clip.BELOW][Clip.SUBJ] =
              edge.bundle[Clip.ABOVE][Clip.SUBJ]
            var prev_edge = edge.prev
            if (prev_edge != null) prev_edge.next = succ_edge
            else aet.top_node = succ_edge
            if (next_edge != null) next_edge.prev = succ_edge
            succ_edge.prev = prev_edge
            succ_edge.next = next_edge
          } else {
            /* Update this edge */
            edge.outp[Clip.BELOW] = edge.outp[Clip.ABOVE]
            edge.bstate[Clip.BELOW] = edge.bstate[Clip.ABOVE]
            edge.bundle[Clip.BELOW][Clip.CLIP] =
              edge.bundle[Clip.ABOVE][Clip.CLIP]
            edge.bundle[Clip.BELOW][Clip.SUBJ] =
              edge.bundle[Clip.ABOVE][Clip.SUBJ]
            edge.xb = edge.xt
          }
          edge.outp[Clip.ABOVE] = null
        }
      }
    } /* === END OF SCANBEAM PROCESSING ================================== */

    /* Generate result polygon from out_poly */
    result = out_poly.getResult(polyClass)
    //console.log("result = "+result);

    return result
  }

  static EQ(a, b) {
    return Math.abs(a - b) <= Clip.GPC_EPSILON
  }

  static PREV_INDEX(i, n) {
    return (i - 1 + n) % n
  }

  static NEXT_INDEX(i, n) {
    return (i + 1) % n
  }

  static OPTIMAL(p, i) {
    return (
      p.getY(Clip.PREV_INDEX(i, p.getNumPoints())) != p.getY(i) ||
      p.getY(Clip.NEXT_INDEX(i, p.getNumPoints())) != p.getY(i)
    )
  }

  static create_contour_bboxes(p) {
    var box = []

    /* Construct contour bounding boxes */
    for (var c = 0; c < p.getNumInnerPoly(); c++) {
      var inner_poly = p.getInnerPoly(c)
      box[c] = inner_poly.getBounds()
    }
    return box
  }

  static minimax_test(subj, clip, op) {
    var s_bbox = Clip.create_contour_bboxes(subj)
    var c_bbox = Clip.create_contour_bboxes(clip)

    var subj_num_poly = subj.getNumInnerPoly()
    var clip_num_poly = clip.getNumInnerPoly()
    var o_table = ArrayHelper.create2DArray(subj_num_poly, clip_num_poly)

    /* Check all subject contour bounding boxes against clip boxes */
    for (var s = 0; s < subj_num_poly; s++) {
      for (var c = 0; c < clip_num_poly; c++) {
        o_table[s][c] =
          !(
            s_bbox[s].getMaxX() < c_bbox[c].getMinX() ||
            s_bbox[s].getMinX() > c_bbox[c].getMaxX()
          ) &&
          !(
            s_bbox[s].getMaxY() < c_bbox[c].getMinY() ||
            s_bbox[s].getMinY() > c_bbox[c].getMaxY()
          )
      }
    }

    /* For each clip contour, search for any subject contour overlaps */
    for (var c = 0; c < clip_num_poly; c++) {
      var overlap = false
      for (var s = 0; !overlap && s < subj_num_poly; s++) {
        overlap = o_table[s][c]
      }
      if (!overlap) {
        clip.setContributing(c, false) // Flag non contributing status
      }
    }

    if (op == OperationType.GPC_INT) {
      /* For each subject contour, search for any clip contour overlaps */
      for (var s = 0; s < subj_num_poly; s++) {
        var overlap = false
        for (var c = 0; !overlap && c < clip_num_poly; c++) {
          overlap = o_table[s][c]
        }
        if (!overlap) {
          subj.setContributing(s, false) // Flag non contributing status
        }
      }
    }
  }

  static bound_list(lmt_table, y) {
    if (lmt_table.top_node == null) {
      lmt_table.top_node = new LmtNode(y)
      return lmt_table.top_node
    } else {
      var prev = null
      var node = lmt_table.top_node
      var done = false
      while (!done) {
        if (y < node.y) {
          /* Insert a new LMT node before the current node */
          var existing_node = node
          node = new LmtNode(y)
          node.next = existing_node
          if (prev == null) {
            lmt_table.top_node = node
          } else {
            prev.next = node
          }
          //               if( existing_node == lmt_table.top_node )
          //               {
          //                  lmt_table.top_node = node ;
          //               }
          done = true
        } else if (y > node.y) {
          /* Head further up the LMT */
          if (node.next == null) {
            node.next = new LmtNode(y)
            node = node.next
            done = true
          } else {
            prev = node
            node = node.next
          }
        } else {
          /* Use this existing LMT node */
          done = true
        }
      }
      return node
    }
  }

  static insert_bound(lmt_node, e) {
    if (lmt_node.first_bound == null) {
      /* Link node e to the tail of the list */
      lmt_node.first_bound = e
    } else {
      var done = false
      var prev_bound = null
      var current_bound = lmt_node.first_bound
      while (!done) {
        /* Do primary sort on the x field */
        if (e.bot.x < current_bound.bot.x) {
          /* Insert a new node mid-list */
          if (prev_bound == null) {
            lmt_node.first_bound = e
          } else {
            prev_bound.next_bound = e
          }
          e.next_bound = current_bound

          //               EdgeNode existing_bound = current_bound ;
          //               current_bound = e ;
          //               current_bound.next_bound = existing_bound ;
          //               if( lmt_node.first_bound == existing_bound )
          //               {
          //                  lmt_node.first_bound = current_bound ;
          //               }
          done = true
        } else if (e.bot.x == current_bound.bot.x) {
          /* Do secondary sort on the dx field */
          if (e.dx < current_bound.dx) {
            /* Insert a new node mid-list */
            if (prev_bound == null) {
              lmt_node.first_bound = e
            } else {
              prev_bound.next_bound = e
            }
            e.next_bound = current_bound
            //                  EdgeNode existing_bound = current_bound ;
            //                  current_bound = e ;
            //                  current_bound.next_bound = existing_bound ;
            //                  if( lmt_node.first_bound == existing_bound )
            //                  {
            //                     lmt_node.first_bound = current_bound ;
            //                  }
            done = true
          } else {
            /* Head further down the list */
            if (current_bound.next_bound == null) {
              current_bound.next_bound = e
              done = true
            } else {
              prev_bound = current_bound
              current_bound = current_bound.next_bound
            }
          }
        } else {
          /* Head further down the list */
          if (current_bound.next_bound == null) {
            current_bound.next_bound = e
            done = true
          } else {
            prev_bound = current_bound
            current_bound = current_bound.next_bound
          }
        }
      }
    }
  }

  static add_edge_to_aet(aet, edge) {
    if (aet.top_node == null) {
      /* Append edge onto the tail end of the AET */
      aet.top_node = edge
      edge.prev = null
      edge.next = null
    } else {
      var current_edge = aet.top_node
      var prev = null
      var done = false
      while (!done) {
        /* Do primary sort on the xb field */
        if (edge.xb < current_edge.xb) {
          /* Insert edge here (before the AET edge) */
          edge.prev = prev
          edge.next = current_edge
          current_edge.prev = edge
          if (prev == null) {
            aet.top_node = edge
          } else {
            prev.next = edge
          }
          //               if( current_edge == aet.top_node )
          //               {
          //                  aet.top_node = edge ;
          //               }
          //               current_edge = edge ;
          done = true
        } else if (edge.xb == current_edge.xb) {
          /* Do secondary sort on the dx field */
          if (edge.dx < current_edge.dx) {
            /* Insert edge here (before the AET edge) */
            edge.prev = prev
            edge.next = current_edge
            current_edge.prev = edge
            if (prev == null) {
              aet.top_node = edge
            } else {
              prev.next = edge
            }
            //                  if( current_edge == aet.top_node )
            //                  {
            //                     aet.top_node = edge ;
            //                  }
            //                  current_edge = edge ;
            done = true
          } else {
            /* Head further into the AET */
            prev = current_edge
            if (current_edge.next == null) {
              current_edge.next = edge
              edge.prev = current_edge
              edge.next = null
              done = true
            } else {
              current_edge = current_edge.next
            }
          }
        } else {
          /* Head further into the AET */
          prev = current_edge
          if (current_edge.next == null) {
            current_edge.next = edge
            edge.prev = current_edge
            edge.next = null
            done = true
          } else {
            current_edge = current_edge.next
          }
        }
      }
    }
  }

  static add_to_sbtree(sbte, y) {
    if (sbte.sb_tree == null) {
      /* Add a new tree node here */
      sbte.sb_tree = new ScanBeamTree(y)
      sbte.sbt_entries++
      return
    }
    var tree_node = sbte.sb_tree
    var done = false
    while (!done) {
      if (tree_node.y > y) {
        if (tree_node.less == null) {
          tree_node.less = new ScanBeamTree(y)
          sbte.sbt_entries++
          done = true
        } else {
          tree_node = tree_node.less
        }
      } else if (tree_node.y < y) {
        if (tree_node.more == null) {
          tree_node.more = new ScanBeamTree(y)
          sbte.sbt_entries++
          done = true
        } else {
          tree_node = tree_node.more
        }
      } else {
        done = true
      }
    }
  }

  static build_lmt(
    lmt_table,
    sbte,
    p,
    type, //poly type SUBJ/Clip.CLIP
    op
  ) {
    /* Create the entire input polygon edge table in one go */
    var edge_table = new EdgeTable()

    for (var c = 0; c < p.getNumInnerPoly(); c++) {
      var ip = p.getInnerPoly(c)
      if (!ip.isContributing(0)) {
        /* Ignore the non-contributing contour */
        ip.setContributing(0, true)
      } else {
        /* Perform contour optimisation */
        var num_vertices = 0
        var e_index = 0
        edge_table = new EdgeTable()
        for (var i = 0; i < ip.getNumPoints(); i++) {
          if (Clip.OPTIMAL(ip, i)) {
            var x = ip.getX(i)
            var y = ip.getY(i)
            edge_table.addNode(x, y)

            /* Record vertex in the scanbeam table */
            Clip.add_to_sbtree(sbte, ip.getY(i))

            num_vertices++
          }
        }

        /* Do the contour forward pass */

        for (var min = 0; min < num_vertices; min++) {
          /* If a forward local minimum... */
          if (edge_table.FWD_MIN(min)) {
            /* Search for the next local maximum... */
            var num_edges = 1
            var max = Clip.NEXT_INDEX(min, num_vertices)
            while (edge_table.NOT_FMAX(max)) {
              num_edges++
              max = Clip.NEXT_INDEX(max, num_vertices)
            }

            /* Build the next edge list */
            var v = min
            var e = edge_table.getNode(e_index)
            e.bstate[Clip.BELOW] = BundleState.UNBUNDLED
            e.bundle[Clip.BELOW][Clip.CLIP] = 0
            e.bundle[Clip.BELOW][Clip.SUBJ] = 0

            for (var i = 0; i < num_edges; i++) {
              var ei = edge_table.getNode(e_index + i)
              var ev = edge_table.getNode(v)

              ei.xb = ev.vertex.x
              ei.bot.x = ev.vertex.x
              ei.bot.y = ev.vertex.y

              v = Clip.NEXT_INDEX(v, num_vertices)
              ev = edge_table.getNode(v)

              ei.top.x = ev.vertex.x
              ei.top.y = ev.vertex.y
              ei.dx = (ev.vertex.x - ei.bot.x) / (ei.top.y - ei.bot.y)
              ei.type = type
              ei.outp[Clip.ABOVE] = null
              ei.outp[Clip.BELOW] = null
              ei.next = null
              ei.prev = null
              ei.succ =
                num_edges > 1 && i < num_edges - 1
                  ? edge_table.getNode(e_index + i + 1)
                  : null
              ei.pred =
                num_edges > 1 && i > 0
                  ? edge_table.getNode(e_index + i - 1)
                  : null
              ei.next_bound = null
              ei.bside[Clip.CLIP] =
                op == OperationType.GPC_DIFF ? Clip.RIGHT : Clip.LEFT
              ei.bside[Clip.SUBJ] = Clip.LEFT
            }
            Clip.insert_bound(
              Clip.bound_list(lmt_table, edge_table.getNode(min).vertex.y),
              e
            )
            if (Clip.DEBUG) {
              //console.log("fwd");
              lmt_table.print()
            }
            e_index += num_edges
          }
        }

        /* Do the contour reverse pass */
        for (var min = 0; min < num_vertices; min++) {
          /* If a reverse local minimum... */
          if (edge_table.REV_MIN(min)) {
            /* Search for the previous local maximum... */
            var num_edges = 1
            var max = Clip.PREV_INDEX(min, num_vertices)
            while (edge_table.NOT_RMAX(max)) {
              num_edges++
              max = Clip.PREV_INDEX(max, num_vertices)
            }

            /* Build the previous edge list */
            var v = min
            var e = edge_table.getNode(e_index)
            e.bstate[Clip.BELOW] = BundleState.UNBUNDLED
            e.bundle[Clip.BELOW][Clip.CLIP] = 0
            e.bundle[Clip.BELOW][Clip.SUBJ] = 0

            for (var i = 0; i < num_edges; i++) {
              var ei = edge_table.getNode(e_index + i)
              var ev = edge_table.getNode(v)

              ei.xb = ev.vertex.x
              ei.bot.x = ev.vertex.x
              ei.bot.y = ev.vertex.y

              v = Clip.PREV_INDEX(v, num_vertices)
              ev = edge_table.getNode(v)

              ei.top.x = ev.vertex.x
              ei.top.y = ev.vertex.y
              ei.dx = (ev.vertex.x - ei.bot.x) / (ei.top.y - ei.bot.y)
              ei.type = type
              ei.outp[Clip.ABOVE] = null
              ei.outp[Clip.BELOW] = null
              ei.next = null
              ei.prev = null
              ei.succ =
                num_edges > 1 && i < num_edges - 1
                  ? edge_table.getNode(e_index + i + 1)
                  : null
              ei.pred =
                num_edges > 1 && i > 0
                  ? edge_table.getNode(e_index + i - 1)
                  : null
              ei.next_bound = null
              ei.bside[Clip.CLIP] =
                op == OperationType.GPC_DIFF ? Clip.RIGHT : Clip.LEFT
              ei.bside[Clip.SUBJ] = Clip.LEFT
            }
            Clip.insert_bound(
              Clip.bound_list(lmt_table, edge_table.getNode(min).vertex.y),
              e
            )
            if (Clip.DEBUG) {
              //console.log("rev");
              lmt_table.print()
            }
            e_index += num_edges
          }
        }
      }
    }
    return edge_table
  }

  static add_st_edge(st, it, edge, dy) {
    if (st == null) {
      /* Append edge onto the tail end of the ST */
      st = new StNode(edge, null)
    } else {
      var den = st.xt - st.xb - (edge.xt - edge.xb)

      /* If new edge and ST edge don't cross */
      if (
        edge.xt >= st.xt ||
        edge.dx == st.dx ||
        Math.abs(den) <= Clip.GPC_EPSILON
      ) {
        /* No intersection - insert edge here (before the ST edge) */
        var existing_node = st
        st = new StNode(edge, existing_node)
      } else {
        /* Compute intersection between new edge and ST edge */
        var r = (edge.xb - st.xb) / den
        var x = st.xb + r * (st.xt - st.xb)
        var y = r * dy

        /* Insert the edge pointers and the intersection point in the IT */
        it.top_node = Clip.add_intersection(it.top_node, st.edge, edge, x, y)

        /* Head further into the ST */
        st.prev = Clip.add_st_edge(st.prev, it, edge, dy)
      }
    }
    return st
  }

  static add_intersection(it_node, edge0, edge1, x, y) {
    if (it_node == null) {
      /* Append a new node to the tail of the list */
      it_node = new ItNode(edge0, edge1, x, y, null)
    } else {
      if (it_node.point.y > y) {
        /* Insert a new node mid-list */
        var existing_node = it_node
        it_node = new ItNode(edge0, edge1, x, y, existing_node)
      } else {
        /* Head further down the list */
        it_node.next = Clip.add_intersection(it_node.next, edge0, edge1, x, y)
      }
    }
    return it_node
  }
}

gpcas.geometry.Clip = Clip
// endregion Clip

// region PolyDefault
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
// endregion PolyDefault

// region PolySimple
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
// endregion PolySimple

// region TopPolygonNode
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
  var npoly_node = null
  for (var poly_node = top_node; poly_node != null; poly_node = npoly_node) {
    //console.log("contour="+c+"  active="+poly_node.active+"  hole="+poly_node.proxy.hole);
    npoly_node = poly_node.next
    if (poly_node.active != 0) {
      var v = 0
      for (
        var vtx = poly_node.proxy.v[Clip.LEFT];
        vtx != null;
        vtx = vtx.next
      ) {
        //console.log("v="+v+"  vtx.x="+vtx.x+"  vtx.y="+vtx.y);
      }
      c++
    }
  }
}
// endregion TopPolygonNode

const {
  PolySimple,
  // Clip,
  TopPolygonNode,
} = gpcas.geometry
