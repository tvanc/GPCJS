export function equals(a, b) {
  for (const p in Object.keys(a)) {
    if (typeof b[p] === "undefined") {
      return false
    }
  }

  for (const p in Object.keys(a)) {
    if (a[p]) {
      switch (typeof a[p]) {
        case "object":
          if (!equals(a[p], b[p])) {
            return false
          }
          break
        case "function":
          if (
            typeof b[p] === "undefined" ||
            (p !== "equals" && a[p].toString() !== b[p].toString())
          )
            return false
          break
        default:
          if (a[p] !== b[p]) {
            return false
          }
      }
    } else {
      if (b[p]) return false
    }
  }

  for (const p in Object.keys(b)) {
    if (typeof a[p] === "undefined") {
      return false
    }
  }

  return true
}
