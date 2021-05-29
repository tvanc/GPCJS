export default class LmtTable {
  top_node

  print() {
    let n = 0
    let lmt = this.top_node
    while (lmt != null) {
      console.log("lmt(" + n + ")")
      for (let edge = lmt.first_bound; edge != null; edge = edge.next_bound) {
        console.log(
          "edge.vertex.x=" + edge.vertex.x + "  edge.vertex.y=" + edge.vertex.y
        )
      }
      n++
      lmt = lmt.next
    }
  }
}
