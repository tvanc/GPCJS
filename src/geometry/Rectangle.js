export default class Rectangle {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }
  getMaxY() {
    return this.y + this.h
  }
  getMinY() {
    return this.y
  }
  getMaxX() {
    return this.x + this.w
  }
  getMinX() {
    return this.x
  }
  toString() {
    return `[${this.x.toString()} ${this.y.toString()} ${this.w.toString()} ${this.h.toString()}]`
  }
}
