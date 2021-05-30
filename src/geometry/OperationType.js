export default class OperationType {
  static GPC_DIFF = new OperationType("Difference")
  static GPC_INT = new OperationType("Intersection")
  static GPC_XOR = new OperationType("Exclusive or")
  static GPC_UNION = new OperationType("Union")

  constructor(type) {
    this.m_Type = type
  }
}
