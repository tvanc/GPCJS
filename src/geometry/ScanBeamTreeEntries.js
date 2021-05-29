export default class ScanBeamTreeEntries {
  sbt_entries = 0
  sb_tree

  build_sbt() {
    const sbt = []
    let entries = 0

    entries = this.inner_build_sbt(entries, sbt, this.sb_tree)

    //console.log("SBT = "+this.sbt_entries);

    if (entries !== this.sbt_entries) {
      //console.log("Something went wrong buildign sbt from tree.");
    }

    return sbt
  }

  inner_build_sbt(entries, sbt, sbt_node) {
    if (sbt_node.less) {
      entries = this.inner_build_sbt(entries, sbt, sbt_node.less)
    }

    sbt[entries] = sbt_node.y
    entries++

    if (sbt_node.more) {
      entries = this.inner_build_sbt(entries, sbt, sbt_node.more)
    }

    return entries
  }
}
