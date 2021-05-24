export default class AetTree {
  constructor() {
    this.top_node = null //EdgeNode
  }

  print() {
    //console.log("aet");
    for (let edge = this.top_node; edge; edge = edge.next) {
      console.log(
        "edge.vertex.x=" + edge.vertex.x + "  edge.vertex.y=" + edge.vertex.y
      )
    }
  }
}
