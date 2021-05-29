export default class HState {
  static NH = 0 /* No horizontal edge                */
  static BH = 1 /* Bottom horizontal edge            */
  static TH = 2 /* Top horizontal edge               */

  static get next_h_state() {
    const { NH, BH, TH } = HState

    return [
      /*        ABOVE     BELOW     CROSS */
      /*        L   R     L   R     L   R */
      /* NH */ [BH, TH, TH, BH, NH, NH],
      /* BH */ [NH, NH, NH, NH, TH, TH],
      /* TH */ [NH, NH, NH, NH, BH, BH],
    ]
  }
}
