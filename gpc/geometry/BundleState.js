export default class BundleState {
  static UNBUNDLED = new BundleState("UNBUNDLED")
  static BUNDLE_HEAD = new BundleState("BUNDLE_HEAD")
  static BUNDLE_TAIL = new BundleState("BUNDLE_TAIL")

  constructor(state) {
    this.m_State = state //String
  }

  toString() {
    return this.m_State
  }
}
