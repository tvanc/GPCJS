import ArrayHelper from "./util/ArrayHelper.js"
import ArrayList from "./util/ArrayList.js"
import Clip from "./geometry/Clip.js"
import AetTree from "./geometry/AetTree.js"
import BundleState from "./geometry/BundleState.js"
import EdgeNode from "./geometry/EdgeNode.js"
import EdgeTable from "./geometry/EdgeTable.js"
import HState from "./geometry/HState.js"
import IntersectionPoint from "./geometry/IntersectionPoint.js"
import ItNode from "./geometry/ItNode.js"
import ItNodeTable from "./geometry/ItNodeTable.js"
import Line from "./geometry/Line.js"
import LineHelper from "./geometry/LineHelper.js"
import LineIntersection from "./geometry/LineIntersection.js"
import LmtNode from "./geometry/LmtNode.js"
import LmtTable from "./geometry/LmtTable.js"
import OperationType from "./geometry/OperationType.js"
import PolyDefault from "./geometry/PolyDefault.js"
import Polygon from "./geometry/Polygon.js"
import PolygonNode from "./geometry/PolygonNode.js"
import PolySimple from "./geometry/PolySimple.js"
import Rectangle from "./geometry/Rectangle.js"
import ScanBeamTree from "./geometry/ScanBeamTree.js"
import ScanBeamTreeEntries from "./geometry/ScanBeamTreeEntries.js"
import StNode from "./geometry/StNode.js"
import TopPolygonNode from "./geometry/TopPolygonNode.js"
import VertexNode from "./geometry/VertexNode.js"
import VertexType from "./geometry/VertexType.js"

export const gpcas = {
  util: {
    ArrayHelper,
    ArrayList,
  },
  geometry: {
    Clip,
    AetTree,
    BundleState,
    EdgeNode,
    EdgeTable,
    HState,
    IntersectionPoint,
    ItNode,
    ItNodeTable,
    Line,
    LineHelper,
    LineIntersection,
    LmtNode,
    LmtTable,
    OperationType,
    PolyDefault,
    Polygon,
    PolygonNode,
    PolySimple,
    Rectangle,
    ScanBeamTree,
    ScanBeamTreeEntries,
    StNode,
    TopPolygonNode,
    VertexNode,
    VertexType,
  },
}
