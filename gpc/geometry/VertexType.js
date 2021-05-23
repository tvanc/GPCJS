export default class VertexType {
  static NUL = 0 /* Empty non-intersection            */
  static EMX = 1 /* External maximum                  */
  static ELI = 2 /* External left intermediate        */
  static TED = 3 /* Top edge                          */
  static ERI = 4 /* External right intermediate       */
  static RED = 5 /* Right edge                        */
  static IMM = 6 /* Internal maximum and minimum      */
  static IMN = 7 /* Internal minimum                  */
  static EMN = 8 /* External minimum                  */
  static EMM = 9 /* External maximum and minimum      */
  static LED = 10 /* Left edge                         */
  static ILI = 11 /* Internal left intermediate        */
  static BED = 12 /* Bottom edge                       */
  static IRI = 13 /* Internal right intermediate       */
  static IMX = 14 /* Internal maximum                  */
  static FUL = 15 /* Full non-intersection             */

  static getType(tr, tl, br, bl) {
    return tr + (tl << 1) + (br << 2) + (bl << 3)
  }
}
