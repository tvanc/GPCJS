import ArrayHelper from "./ArrayHelper.js"

export default class ArrayList {
  constructor(arr) {
    this._array = []
    if (arr != null) {
      this._array = arr
    }
  }
  add(value) {
    this._array.push(value)
  }
  get(index) {
    return this._array[index]
  }
  size() {
    return this._array.length
  }
  clear() {
    this._array = []
  }
  equals(list) {
    if (this._array.length !== list.size()) return false

    for (let i = 0; i < this._array.length; i++) {
      const obj1 = this._array[i]
      const obj2 = list.get(i)

      if (!ArrayHelper.valueEqual(obj1, obj2)) {
        return false
      }
    }
    return true
  }
  hashCode() {
    return 0
  }
  isEmpty() {
    return 0 === this._array.length
  }
  toArray() {
    return this._array
  }
}
