import ArrayList from "../util/ArrayList.js"
import EdgeNode from "./EdgeNode.js"
import Clip from "./Clip.js"

export default class EdgeTable {
  constructor() {
    this.m_List = new ArrayList()
  }
  addNode(x, y) {
    const node = new EdgeNode()
    node.vertex.x = x
    node.vertex.y = y
    this.m_List.add(node)
  }
  getNode(index) {
    return this.m_List.get(index)
  }
  FWD_MIN(i) {
    const m_List = this.m_List

    const prev = m_List.get(Clip.PREV_INDEX(i, m_List.size()))
    const next = m_List.get(Clip.NEXT_INDEX(i, m_List.size()))
    const ith = m_List.get(i)

    return prev.vertex.y >= ith.vertex.y && next.vertex.y > ith.vertex.y
  }
  NOT_FMAX(i) {
    const m_List = this.m_List

    const next = m_List.get(Clip.NEXT_INDEX(i, m_List.size()))
    const ith = m_List.get(i)
    return next.vertex.y > ith.vertex.y
  }
  REV_MIN(i) {
    const m_List = this.m_List

    const prev = m_List.get(Clip.PREV_INDEX(i, m_List.size()))
    const next = m_List.get(Clip.NEXT_INDEX(i, m_List.size()))
    const ith = m_List.get(i)
    return prev.vertex.y > ith.vertex.y && next.vertex.y >= ith.vertex.y
  }
  NOT_RMAX(i) {
    const m_List = this.m_List

    const prev = m_List.get(Clip.PREV_INDEX(i, m_List.size()))
    const ith = m_List.get(i)
    return prev.vertex.y > ith.vertex.y
  }
}
