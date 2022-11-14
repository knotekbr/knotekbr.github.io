import { RED } from "../constants.js";
/**
 * Class representing a node in the edge tree
 */
class EdgeNode {
    // Base node contents
    id;
    value;
    tiebreaker;
    // Required information for red black tree implementation
    color;
    parent;
    left;
    right;
    // Extra information for creating diagonals
    helper;
    helperType;
    originalHelper;
    // Extra information for monotone decomposition
    region;
    side;
    /**
     * Creates a new edge node
     *
     * @param {string} id - An id that uniquely identifies this node
     * @param {V} value - The value to store in this node
     * @param {number} tiebreaker - A value to use to resolve ties between dynamic keys
     * @param {EdgeNode} [parent=null] - The parent of the new node
     */
    constructor(id, value, tiebreaker, helper, helperType, region, parent = null) {
        // Set to argument values
        this.id = id;
        this.value = value;
        this.tiebreaker = tiebreaker;
        this.parent = parent;
        this.helper = helper;
        this.helperType = helperType;
        this.region = region;
        // Set to default values
        this.color = RED;
        this.left = null;
        this.right = null;
        this.originalHelper = true;
        this.side = 0 /* EdgeSide.BOTTOM */;
    }
}
function isRed(node) {
    if (!node) {
        return false;
    }
    return node.color;
}
function isBlack(node) {
    if (!node) {
        return true;
    }
    return !node.color;
}
function isTop(node) {
    return node.side === 1 /* EdgeSide.TOP */;
}
function isBottom(node) {
    return node.side === 0 /* EdgeSide.BOTTOM */;
}
export default EdgeNode;
export { isRed, isBlack, isTop, isBottom };
