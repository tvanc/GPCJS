import ArrayHelper from "../util/ArrayHelper.js"
import OperationType from "./OperationType.js"
import PolyDefault from "./PolyDefault.js"
import AetTree from "./AetTree.js"
import PolySimple from "./PolySimple.js"
import LmtTable from "./LmtTable.js"
import ScanBeamTreeEntries from "./ScanBeamTreeEntries.js"
import BundleState from "./BundleState.js"
import TopPolygonNode from "./TopPolygonNode.js"
import EdgeTable from "./EdgeTable.js"
import ItNode from "./ItNode.js"
import StNode from "./StNode.js"
import ScanBeamTree from "./ScanBeamTree.js"
import LmtNode from "./LmtNode.js"
import VertexType from "./VertexType.js"
import ItNodeTable from "./ItNodeTable.js"
import HState from "./HState.js"

export default class Clip {
  static DEBUG = false
  static GPC_EPSILON = 2.2204460492503131e-16
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
  static intersection(p1, p2, polyClass = "PolyDefault") {
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
  static union(p1, p2, polyClass = "PolyDefault") {
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
  static xor(p1, p2, polyClass = "PolyDefault") {
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
  static difference(p1, p2, polyClass = "PolyDefault") {
    return Clip.clip(OperationType.GPC_DIFF, p2, p1, polyClass)
  }
  // endregion Public Static

  // region Private Static
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
    if (polyClass === "PolySimple") {
      return new PolySimple()
    }
    if (polyClass === "PolyDefault") {
      return new PolyDefault()
    }
    if (polyClass === "PolyDefault.class") {
      return new PolyDefault()
    }

    return null
  }
  /**
   * <code>clip()</code> is the main method of the clipper algorithm.
   * This is where the conversion from really begins.
   */
  static clip(op, subj, clip, polyClass) {
    let result = Clip.createNewPoly(polyClass)

    /* Test for trivial NULL result cases */
    if (
      (subj.isEmpty() && clip.isEmpty()) ||
      (subj.isEmpty() &&
        (op === OperationType.GPC_INT || op === OperationType.GPC_DIFF)) ||
      (clip.isEmpty() && op === OperationType.GPC_INT)
    ) {
      return result
    }

    /* Identify potentialy contributing contours */
    if (
      (op === OperationType.GPC_INT || op === OperationType.GPC_DIFF) &&
      !subj.isEmpty() &&
      !clip.isEmpty()
    ) {
      Clip.minimax_test(subj, clip, op)
    }

    //console.log("SUBJ " + subj);
    //console.log("CLIP " + clip);

    /* Build LMT */
    const lmt_table = new LmtTable()
    const sbte = new ScanBeamTreeEntries()

    if (!subj.isEmpty()) {
      Clip.build_lmt(lmt_table, sbte, subj, Clip.SUBJ, op)
    }
    if (Clip.DEBUG) {
      //console.log("");
      //console.log(" ------------ After build_lmt for subj ---------");
      lmt_table.print()
    }
    if (!clip.isEmpty()) {
      Clip.build_lmt(lmt_table, sbte, clip, Clip.CLIP, op)
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
    const sbt = sbte.build_sbt()
    const parity = []

    parity[0] = Clip.LEFT
    parity[1] = Clip.LEFT

    /* Invert clip polygon for difference operation */
    if (op === OperationType.GPC_DIFF) {
      parity[Clip.CLIP] = Clip.RIGHT
    }

    if (Clip.DEBUG) {
      //console.log(sbt);
    }

    let local_min = lmt_table.top_node ?? null
    const out_poly = new TopPolygonNode() // used to create resulting Poly

    const aet = new AetTree()
    let scanbeam = 0

    /* Process each scanbeam */
    while (scanbeam < sbt.length) {
      /* Set yb and yt to the bottom and top of the scanbeam */
      const yb = sbt[scanbeam++]

      let yt = 0
      let dy = 0

      if (scanbeam < sbt.length) {
        yt = sbt[scanbeam]
        dy = yt - yb
      }

      /* === SCANBEAM BOUNDARY PROCESSING ================================ */

      /* If LMT node corresponding to yb exists */
      if (local_min) {
        if (local_min.y === yb) {
          /* Add edges starting at this local minimum to the AET */
          for (let edge = local_min.first_bound; edge; edge = edge.next_bound) {
            Clip.add_edge_to_aet(aet, edge)
          }

          local_min = local_min.next
        }
      }

      if (Clip.DEBUG) {
        aet.print()
      }
      /* Set dummy previous x value */
      let px = -Number.MAX_VALUE

      /* Create bundles within AET */
      let e0 = aet.top_node
      let e1 = aet.top_node

      /* Set up bundle fields of first edge */
      aet.top_node.bundle[Clip.ABOVE][aet.top_node.type] =
        aet.top_node.top.y !== yb ? 1 : 0
      aet.top_node.bundle[Clip.ABOVE][aet.top_node.type === 0 ? 1 : 0] = 0
      aet.top_node.bstate[Clip.ABOVE] = BundleState.UNBUNDLED

      for (
        let next_edge = aet.top_node.next;
        next_edge != null;
        next_edge = next_edge.next
      ) {
        const ne_type = next_edge.type
        const ne_type_opp = next_edge.type === 0 ? 1 : 0 //next edge type opposite

        /* Set up bundle fields of next edge */
        next_edge.bundle[Clip.ABOVE][ne_type] = next_edge.top.y !== yb ? 1 : 0
        next_edge.bundle[Clip.ABOVE][ne_type_opp] = 0
        next_edge.bstate[Clip.ABOVE] = BundleState.UNBUNDLED

        /* Bundle edges above the scanbeam boundary if they coincide */
        if (next_edge.bundle[Clip.ABOVE][ne_type] === 1) {
          if (
            Clip.EQ(e0.xb, next_edge.xb) &&
            Clip.EQ(e0.dx, next_edge.dx) &&
            e0.top.y !== yb
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

      const horiz = []
      horiz[Clip.CLIP] = HState.NH
      horiz[Clip.SUBJ] = HState.NH

      const exists = []
      exists[Clip.CLIP] = 0
      exists[Clip.SUBJ] = 0

      let cf = null

      /* Process each edge at this scanbeam boundary */
      for (let edge = aet.top_node; edge; edge = edge.next) {
        exists[Clip.CLIP] =
          edge.bundle[Clip.ABOVE][Clip.CLIP] +
          (edge.bundle[Clip.BELOW][Clip.CLIP] << 1)
        exists[Clip.SUBJ] =
          edge.bundle[Clip.ABOVE][Clip.SUBJ] +
          (edge.bundle[Clip.BELOW][Clip.SUBJ] << 1)

        if (exists[Clip.CLIP] !== 0 || exists[Clip.SUBJ] !== 0) {
          /* Set bundle side */
          edge.bside[Clip.CLIP] = parity[Clip.CLIP]
          edge.bside[Clip.SUBJ] = parity[Clip.SUBJ]

          let contributing = false
          let br = 0
          let bl = 0
          let tr = 0
          let tl = 0
          /* Determine contributing status and quadrant occupancies */
          if (op === OperationType.GPC_DIFF || op === OperationType.GPC_INT) {
            contributing =
              (exists[Clip.CLIP] !== 0 &&
                (parity[Clip.SUBJ] !== 0 || horiz[Clip.SUBJ] !== 0)) ||
              (exists[Clip.SUBJ] !== 0 &&
                (parity[Clip.CLIP] !== 0 || horiz[Clip.CLIP] !== 0)) ||
              (exists[Clip.CLIP] !== 0 &&
                exists[Clip.SUBJ] !== 0 &&
                parity[Clip.CLIP] === parity[Clip.SUBJ])
            br = parity[Clip.CLIP] !== 0 && parity[Clip.SUBJ] !== 0 ? 1 : 0
            bl =
              (parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 &&
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                ? 1
                : 0
            tr =
              (parity[Clip.CLIP] ^ (horiz[Clip.CLIP] !== HState.NH ? 1 : 0)) !==
                0 &&
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0)) !==
                0
                ? 1
                : 0
            tl =
              (parity[Clip.CLIP] ^
                (horiz[Clip.CLIP] !== HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.CLIP]) !==
                0 &&
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ]) !==
                0
                ? 1
                : 0
          } else if (op === OperationType.GPC_XOR) {
            contributing = exists[Clip.CLIP] !== 0 || exists[Clip.SUBJ] !== 0
            br = parity[Clip.CLIP] ^ parity[Clip.SUBJ]
            bl =
              parity[Clip.CLIP] ^
              edge.bundle[Clip.ABOVE][Clip.CLIP] ^
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ])
            tr =
              parity[Clip.CLIP] ^
              (horiz[Clip.CLIP] !== HState.NH ? 1 : 0) ^
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0))
            tl =
              parity[Clip.CLIP] ^
              (horiz[Clip.CLIP] !== HState.NH ? 1 : 0) ^
              edge.bundle[Clip.BELOW][Clip.CLIP] ^
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ])
          } else if (op === OperationType.GPC_UNION) {
            contributing =
              (exists[Clip.CLIP] !== 0 &&
                (!(parity[Clip.SUBJ] !== 0) || horiz[Clip.SUBJ] !== 0)) ||
              (exists[Clip.SUBJ] !== 0 &&
                (!(parity[Clip.CLIP] !== 0) || horiz[Clip.CLIP] !== 0)) ||
              (exists[Clip.CLIP] !== 0 &&
                exists[Clip.SUBJ] !== 0 &&
                parity[Clip.CLIP] === parity[Clip.SUBJ])
            br = parity[Clip.CLIP] !== 0 || parity[Clip.SUBJ] !== 0 ? 1 : 0
            bl =
              (parity[Clip.CLIP] ^ edge.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 ||
              (parity[Clip.SUBJ] ^ edge.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                ? 1
                : 0
            tr =
              (parity[Clip.CLIP] ^ (horiz[Clip.CLIP] !== HState.NH ? 1 : 0)) !==
                0 ||
              (parity[Clip.SUBJ] ^ (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0)) !==
                0
                ? 1
                : 0
            tl =
              (parity[Clip.CLIP] ^
                (horiz[Clip.CLIP] !== HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.CLIP]) !==
                0 ||
              (parity[Clip.SUBJ] ^
                (horiz[Clip.SUBJ] !== HState.NH ? 1 : 0) ^
                edge.bundle[Clip.BELOW][Clip.SUBJ]) !==
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
          if (exists[Clip.CLIP] !== 0) {
            horiz[Clip.CLIP] =
              HState.next_h_state[horiz[Clip.CLIP]][
                ((exists[Clip.CLIP] - 1) << 1) + parity[Clip.CLIP]
              ]
          }
          if (exists[Clip.SUBJ] !== 0) {
            horiz[Clip.SUBJ] =
              HState.next_h_state[horiz[Clip.SUBJ]][
                ((exists[Clip.SUBJ] - 1) << 1) + parity[Clip.SUBJ]
              ]
          }

          if (contributing) {
            const xb = edge.xb
            const vclass = VertexType.getType(tr, tl, br, bl)

            switch (vclass) {
              case VertexType.EMN:
              case VertexType.IMN:
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                px = xb
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.ERI:
                if (xb !== px) {
                  cf?.add_right(xb, yb)
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
                if (xb !== px) {
                  cf?.add_left(xb, yb)
                  px = xb
                }
                out_poly.merge_right(cf, edge.outp[Clip.BELOW])
                cf = null
                break
              case VertexType.ILI:
                if (xb !== px) {
                  cf?.add_left(xb, yb)
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
                if (xb !== px) {
                  cf?.add_right(xb, yb)
                  px = xb
                }
                out_poly.merge_left(cf, edge.outp[Clip.BELOW])
                cf = null
                edge.outp[Clip.BELOW] = null
                break
              case VertexType.IMM:
                if (xb !== px) {
                  cf?.add_right(xb, yb)
                  px = xb
                }
                out_poly.merge_left(cf, edge.outp[Clip.BELOW])
                edge.outp[Clip.BELOW] = null
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.EMM:
                if (xb !== px) {
                  cf?.add_left(xb, yb)
                  px = xb
                }
                out_poly.merge_right(cf, edge.outp[Clip.BELOW])
                edge.outp[Clip.BELOW] = null
                edge.outp[Clip.ABOVE] = out_poly.add_local_min(xb, yb)
                cf = edge.outp[Clip.ABOVE]
                break
              case VertexType.LED:
                if (edge.bot.y === yb) edge.outp[Clip.BELOW].add_left(xb, yb)
                edge.outp[Clip.ABOVE] = edge.outp[Clip.BELOW]
                px = xb
                break
              case VertexType.RED:
                if (edge.bot.y === yb) edge.outp[Clip.BELOW].add_right(xb, yb)
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
      for (let edge = aet.top_node; edge != null; edge = edge.next) {
        if (edge.top.y === yb) {
          const prev_edge = edge.prev
          const next_edge = edge.next

          if (prev_edge != null) prev_edge.next = next_edge
          else aet.top_node = next_edge

          if (next_edge != null) next_edge.prev = prev_edge

          /* Copy bundle head state to the adjacent tail edge if required */
          if (
            edge.bstate[Clip.BELOW] === BundleState.BUNDLE_HEAD &&
            prev_edge != null
          ) {
            if (prev_edge.bstate[Clip.BELOW] === BundleState.BUNDLE_TAIL) {
              prev_edge.outp[Clip.BELOW] = edge.outp[Clip.BELOW]
              prev_edge.bstate[Clip.BELOW] = BundleState.UNBUNDLED
              if (prev_edge.prev != null) {
                if (
                  prev_edge.prev.bstate[Clip.BELOW] === BundleState.BUNDLE_TAIL
                ) {
                  prev_edge.bstate[Clip.BELOW] = BundleState.BUNDLE_HEAD
                }
              }
            }
          }
        } else {
          if (edge.top.y === yt) edge.xt = edge.top.x
          else edge.xt = edge.bot.x + edge.dx * (yt - edge.bot.y)
        }
      }

      if (scanbeam < sbte.sbt_entries) {
        /* === SCANBEAM INTERIOR PROCESSING ============================== */

        /* Build intersection table for the current scanbeam */
        const it_table = new ItNodeTable()
        it_table.build_intersection_table(aet, dy)

        /* Process each node in the intersection table */

        for (
          let intersect = it_table.top_node;
          intersect != null;
          intersect = intersect.next
        ) {
          e0 = intersect.ie[0]
          e1 = intersect.ie[1]

          /* Only generate output for contributing intersections */

          if (
            (e0.bundle[Clip.ABOVE][Clip.CLIP] !== 0 ||
              e0.bundle[Clip.ABOVE][Clip.SUBJ] !== 0) &&
            (e1.bundle[Clip.ABOVE][Clip.CLIP] !== 0 ||
              e1.bundle[Clip.ABOVE][Clip.SUBJ] !== 0)
          ) {
            const p = e0.outp[Clip.ABOVE]
            const q = e1.outp[Clip.ABOVE]
            const ix = intersect.point.x
            const iy = intersect.point.y + yb

            const in_clip =
              (e0.bundle[Clip.ABOVE][Clip.CLIP] !== 0 &&
                !(e0.bside[Clip.CLIP] !== 0)) ||
              (e1.bundle[Clip.ABOVE][Clip.CLIP] !== 0 &&
                e1.bside[Clip.CLIP] !== 0) ||
              (!(e0.bundle[Clip.ABOVE][Clip.CLIP] !== 0) &&
                !(e1.bundle[Clip.ABOVE][Clip.CLIP] !== 0) &&
                e0.bside[Clip.CLIP] !== 0 &&
                e1.bside[Clip.CLIP] !== 0)
                ? 1
                : 0

            const in_subj =
              (e0.bundle[Clip.ABOVE][Clip.SUBJ] !== 0 &&
                !(e0.bside[Clip.SUBJ] !== 0)) ||
              (e1.bundle[Clip.ABOVE][Clip.SUBJ] !== 0 &&
                e1.bside[Clip.SUBJ] !== 0) ||
              (!(e0.bundle[Clip.ABOVE][Clip.SUBJ] !== 0) &&
                !(e1.bundle[Clip.ABOVE][Clip.SUBJ] !== 0) &&
                e0.bside[Clip.SUBJ] !== 0 &&
                e1.bside[Clip.SUBJ] !== 0)
                ? 1
                : 0

            let tr = 0
            let tl = 0
            let br = 0
            let bl = 0
            /* Determine quadrant occupancies */
            if (op === OperationType.GPC_DIFF || op === OperationType.GPC_INT) {
              tr = in_clip !== 0 && in_subj !== 0 ? 1 : 0
              tl =
                (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 &&
                (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                  ? 1
                  : 0
              br =
                (in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 &&
                (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                  ? 1
                  : 0
              bl =
                (in_clip ^
                  e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                  e0.bundle[Clip.ABOVE][Clip.CLIP]) !==
                  0 &&
                (in_subj ^
                  e1.bundle[Clip.ABOVE][Clip.SUBJ] ^
                  e0.bundle[Clip.ABOVE][Clip.SUBJ]) !==
                  0
                  ? 1
                  : 0
            } else if (op === OperationType.GPC_XOR) {
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
            } else if (op === OperationType.GPC_UNION) {
              tr = in_clip !== 0 || in_subj !== 0 ? 1 : 0
              tl =
                (in_clip ^ e1.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 ||
                (in_subj ^ e1.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                  ? 1
                  : 0
              br =
                (in_clip ^ e0.bundle[Clip.ABOVE][Clip.CLIP]) !== 0 ||
                (in_subj ^ e0.bundle[Clip.ABOVE][Clip.SUBJ]) !== 0
                  ? 1
                  : 0
              bl =
                (in_clip ^
                  e1.bundle[Clip.ABOVE][Clip.CLIP] ^
                  e0.bundle[Clip.ABOVE][Clip.CLIP]) !==
                  0 ||
                (in_subj ^
                  e1.bundle[Clip.ABOVE][Clip.SUBJ] ^
                  e0.bundle[Clip.ABOVE][Clip.SUBJ]) !==
                  0
                  ? 1
                  : 0
            } else {
              //console.log("ERROR : Unknown op type, "+op);
            }

            const vclass = VertexType.getType(tr, tl, br, bl)
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
          if (e0.bundle[Clip.ABOVE][Clip.CLIP] !== 0)
            e1.bside[Clip.CLIP] = e1.bside[Clip.CLIP] === 0 ? 1 : 0
          if (e1.bundle[Clip.ABOVE][Clip.CLIP] !== 0)
            e0.bside[Clip.CLIP] = e0.bside[Clip.CLIP] === 0 ? 1 : 0
          if (e0.bundle[Clip.ABOVE][Clip.SUBJ] !== 0)
            e1.bside[Clip.SUBJ] = e1.bside[Clip.SUBJ] === 0 ? 1 : 0
          if (e1.bundle[Clip.ABOVE][Clip.SUBJ] !== 0)
            e0.bside[Clip.SUBJ] = e0.bside[Clip.SUBJ] === 0 ? 1 : 0

          /* Swap e0 and e1 bundles in the AET */
          let prev_edge = e0.prev
          const next_edge = e1.next
          if (next_edge != null) {
            next_edge.prev = e0
          }

          if (e0.bstate[Clip.ABOVE] === BundleState.BUNDLE_HEAD) {
            let search = true
            while (search) {
              prev_edge = prev_edge.prev
              if (prev_edge != null) {
                if (prev_edge.bstate[Clip.ABOVE] !== BundleState.BUNDLE_TAIL) {
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
        for (let edge = aet.top_node; edge != null; edge = edge.next) {
          const next_edge = edge.next
          const succ_edge = edge.succ
          if (edge.top.y === yt && succ_edge != null) {
            /* Replace AET edge by its successor */
            succ_edge.outp[Clip.BELOW] = edge.outp[Clip.ABOVE]
            succ_edge.bstate[Clip.BELOW] = edge.bstate[Clip.ABOVE]
            succ_edge.bundle[Clip.BELOW][Clip.CLIP] =
              edge.bundle[Clip.ABOVE][Clip.CLIP]
            succ_edge.bundle[Clip.BELOW][Clip.SUBJ] =
              edge.bundle[Clip.ABOVE][Clip.SUBJ]
            const prev_edge = edge.prev
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
      p.getY(Clip.PREV_INDEX(i, p.getNumPoints())) !== p.getY(i) ||
      p.getY(Clip.NEXT_INDEX(i, p.getNumPoints())) !== p.getY(i)
    )
  }

  static create_contour_bboxes(p) {
    const box = []

    /* Construct contour bounding boxes */
    for (let c = 0; c < p.getNumInnerPoly(); c++) {
      const inner_poly = p.getInnerPoly(c)
      box[c] = inner_poly.getBounds()
    }
    return box
  }

  static minimax_test(subj, clip, op) {
    const s_bbox = Clip.create_contour_bboxes(subj)
    const c_bbox = Clip.create_contour_bboxes(clip)

    const subj_num_poly = subj.getNumInnerPoly()
    const clip_num_poly = clip.getNumInnerPoly()
    const o_table = ArrayHelper.create2DArray(subj_num_poly, clip_num_poly)

    /* Check all subject contour bounding boxes against clip boxes */
    for (let s = 0; s < subj_num_poly; s++) {
      for (let c = 0; c < clip_num_poly; c++) {
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
    for (let c = 0; c < clip_num_poly; c++) {
      let overlap = false
      for (let s = 0; !overlap && s < subj_num_poly; s++) {
        overlap = o_table[s][c]
      }
      if (!overlap) {
        clip.setContributing(c, false) // Flag non contributing status
      }
    }

    if (op === OperationType.GPC_INT) {
      /* For each subject contour, search for any clip contour overlaps */
      for (let s = 0; s < subj_num_poly; s++) {
        let overlap = false
        for (let c = 0; !overlap && c < clip_num_poly; c++) {
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
      let prev = null
      let node = lmt_table.top_node
      let done = false
      while (!done) {
        if (y < node.y) {
          /* Insert a new LMT node before the current node */
          const existing_node = node
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
      let done = false
      let prev_bound = null
      let current_bound = lmt_node.first_bound

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
        } else if (e.bot.x === current_bound.bot.x) {
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
      let current_edge = aet.top_node
      let prev = null
      let done = false

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
        } else if (edge.xb === current_edge.xb) {
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
    let tree_node = sbte.sb_tree
    let done = false
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
    let edge_table = new EdgeTable()

    for (let c = 0; c < p.getNumInnerPoly(); c++) {
      const ip = p.getInnerPoly(c)
      if (!ip.isContributing(0)) {
        /* Ignore the non-contributing contour */
        ip.setContributing(0, true)
      } else {
        /* Perform contour optimisation */
        let num_vertices = 0
        let e_index = 0
        edge_table = new EdgeTable()
        for (let i = 0; i < ip.getNumPoints(); i++) {
          if (Clip.OPTIMAL(ip, i)) {
            const x = ip.getX(i)
            const y = ip.getY(i)
            edge_table.addNode(x, y)

            /* Record vertex in the scanbeam table */
            Clip.add_to_sbtree(sbte, ip.getY(i))

            num_vertices++
          }
        }

        /* Do the contour forward pass */

        for (let min = 0; min < num_vertices; min++) {
          /* If a forward local minimum... */
          if (edge_table.FWD_MIN(min)) {
            /* Search for the next local maximum... */
            let num_edges = 1
            let max = Clip.NEXT_INDEX(min, num_vertices)
            while (edge_table.NOT_FMAX(max)) {
              num_edges++
              max = Clip.NEXT_INDEX(max, num_vertices)
            }

            /* Build the next edge list */
            let v = min
            const e = edge_table.getNode(e_index)
            e.bstate[Clip.BELOW] = BundleState.UNBUNDLED
            e.bundle[Clip.BELOW][Clip.CLIP] = 0
            e.bundle[Clip.BELOW][Clip.SUBJ] = 0

            for (let i = 0; i < num_edges; i++) {
              const ei = edge_table.getNode(e_index + i)
              let ev = edge_table.getNode(v)

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
                op === OperationType.GPC_DIFF ? Clip.RIGHT : Clip.LEFT
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
        for (let min = 0; min < num_vertices; min++) {
          /* If a reverse local minimum... */
          if (edge_table.REV_MIN(min)) {
            /* Search for the previous local maximum... */
            let num_edges = 1
            let max = Clip.PREV_INDEX(min, num_vertices)
            while (edge_table.NOT_RMAX(max)) {
              num_edges++
              max = Clip.PREV_INDEX(max, num_vertices)
            }

            /* Build the previous edge list */
            let v = min
            const e = edge_table.getNode(e_index)
            e.bstate[Clip.BELOW] = BundleState.UNBUNDLED
            e.bundle[Clip.BELOW][Clip.CLIP] = 0
            e.bundle[Clip.BELOW][Clip.SUBJ] = 0

            for (let i = 0; i < num_edges; i++) {
              const ei = edge_table.getNode(e_index + i)
              let ev = edge_table.getNode(v)

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
                op === OperationType.GPC_DIFF ? Clip.RIGHT : Clip.LEFT
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
      const den = st.xt - st.xb - (edge.xt - edge.xb)

      /* If new edge and ST edge don't cross */
      if (
        edge.xt >= st.xt ||
        edge.dx === st.dx ||
        Math.abs(den) <= Clip.GPC_EPSILON
      ) {
        /* No intersection - insert edge here (before the ST edge) */
        st = new StNode(edge, st)
      } else {
        /* Compute intersection between new edge and ST edge */
        const r = (edge.xb - st.xb) / den
        const x = st.xb + r * (st.xt - st.xb)
        const y = r * dy

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
        const existing_node = it_node
        it_node = new ItNode(edge0, edge1, x, y, existing_node)
      } else {
        /* Head further down the list */
        it_node.next = Clip.add_intersection(it_node.next, edge0, edge1, x, y)
      }
    }
    return it_node
  }
  // endregion
}
