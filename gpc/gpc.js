import ArrayHelper from "./util/ArrayHelper.js"
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
import Line from "./geometry/Line.js"
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
import TopPolygonNode from "./geometry/TopPolygonNode.js"
import VertexNode from "./geometry/VertexNode.js"
import VertexType from "./geometry/VertexType.js"
import WeilerAtherton from "./geometry/WeilerAtherton.js"

export const gpcas = {
  util: {
    ArrayHelper,
    ArrayList,
  },
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
    Line,
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
    TopPolygonNode,
    VertexNode,
    VertexType,
    WeilerAtherton,
  },
}

// region Clip
gpcas.geometry.Clip = Clip

/**
 * <code>clip()</code> is the main method of the clipper algorithm.
 * This is where the conversion from really begins.
 */
Clip.clip = function (op, subj, clip, polyClass) {
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
// endregion Clip

// region TopPolygonNode
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
// endregion TopPolygonNode
