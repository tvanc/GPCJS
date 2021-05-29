import Clip from "./Clip.js"
import VertexNode from "./VertexNode.js"

export default class PolygonNode {
  /** Active flag/vertex count */
  active

  /** Hole/external contour flag */
  hole

  /** Left and right vertex list ptrs */
  v = []

  /** Pointer to next polygon contour */
  next

  /** Pointer to actual structure used */
  proxy

  constructor(next, x, y) {
    /* Make v[Clip.LEFT] and v[Clip.RIGHT] point to new vertex */
    const vn = new VertexNode(x, y)

    this.v[Clip.LEFT] = vn
    this.v[Clip.RIGHT] = vn

    this.next = next
    this.proxy = this /* Initialise proxy to point to p itself */
    this.active = 1 //TRUE
  }

  add_right(x, y) {
    const nv = new VertexNode(x, y)

    /* Add vertex nv to the right end of the polygon's vertex list */
    this.proxy.v[Clip.RIGHT].next = nv

    /* Update proxy->v[Clip.RIGHT] to point to nv */
    this.proxy.v[Clip.RIGHT] = nv
  }

  add_left(x, y) {
    const proxy = this.proxy
    const nv = new VertexNode(x, y)

    /* Add vertex nv to the left end of the polygon's vertex list */
    nv.next = proxy.v[Clip.LEFT]

    /* Update proxy->[Clip.LEFT] to point to nv */
    proxy.v[Clip.LEFT] = nv
  }
}
