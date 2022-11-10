import Edge from "../elements/Edge.js";
import Region from "../elements/Region.js";
const RED = true;
const BLACK = false;
const TOP = true;
const BOTTOM = false;
function isRed(node) {
    if (!node) {
        return false;
    }
    return node.color;
}
function isTop(node) {
    return node.side;
}
function isBottom(node) {
    return !node.side;
}
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
        this.side = BOTTOM;
    }
}
/**
 * Class representing a self-balancing binary search tree designed to hold polygon edges
 */
export default class EdgeRBT {
    /** The tree's root node */
    #root;
    /** Function used to extract dynamic keys from values contained in nodes */
    #keyExtractor;
    #clockwise;
    /** A map that associates string IDs with tree nodes */
    #map;
    #tempRegion;
    #diagonals;
    #regions;
    #regionAdj;
    /**
     * Creates a new edge tree
     *
     * @param {KeyExtractor} keyExtractor - A function that determines a node's key based on its
     * value and an intersection coordinate of a reference line
     */
    constructor(keyExtractor, clockwise) {
        this.#root = null;
        this.#keyExtractor = keyExtractor;
        this.#clockwise = clockwise;
        this.#map = new Map();
        this.#tempRegion = new Region(-1);
        this.#diagonals = [];
        this.#regions = [];
        this.#regionAdj = [];
    }
    get diagonals() {
        return this.#diagonals;
    }
    get regions() {
        return this.#regions;
    }
    get regionAdj() {
        return this.#regionAdj;
    }
    /*************************************************************************************************
     *
     * Event processing core method
     *
     ************************************************************************************************/
    /**
     * Processes the given SweepEdgeEvent and updates the edge tree as needed
     *
     * @param {SweepEdgeEvent} event - The event to process
     */
    processEvent(event) {
        // Event processing relies on helper vertices to perform monotone decomposition. For some edge
        // E, helper(E) is the rightmost vertex behind the sweep line such that the vertical segment
        // connecting E to helper(E) lies completely inside the polygon
        // Process 'normal' events (edge replacement)
        if (event.type === "normal") {
            // Short circuits for invalid cases
            if (!this.#map.has(event.oldEdgeID)) {
                throw new Error(`Event Error (Normal): ID ${event.oldEdgeID} does not exist`);
            }
            if (this.#map.has(event.newEdgeID)) {
                throw new Error(`Event Error (Normal): ID ${event.newEdgeID} already exists`);
            }
            const endingEdge = this.#map.get(event.oldEdgeID);
            const edgeBelow = this.#previous(endingEdge);
            const edgeAbove = this.#next(endingEdge);
            this.#handleEdgeEnd(endingEdge, edgeBelow, edgeAbove, event.vertex, "normal");
            this.#updateHelpers(endingEdge, edgeBelow, event.vertex, event.type);
            this.#replace(endingEdge, event.newEdgeID, event.newEdge, event.newTiebreaker, event.vertex, event.type);
            endingEdge.region.addEdges({ edge: event.newEdge, side: endingEdge.side });
        }
        // Process 'start' events (2x edge insertion)
        else if (event.type === "start") {
            // Short circuits for invalid cases
            if (this.#map.has(event.edgeID1)) {
                throw new Error(`Event Error (Start): ID ${event.edgeID1} already exists`);
            }
            if (this.#map.has(event.edgeID2)) {
                throw new Error(`Event Error (Start): ID ${event.edgeID2} already exists`);
            }
            const [lowEdge, highEdge] = this.#createNodes(event);
            const newRegion = new Region(this.#regions.length, lowEdge.value, highEdge.value);
            this.#regions.push(newRegion);
            this.#regionAdj.push([]);
            lowEdge.region = highEdge.region = newRegion;
            this.#insert(lowEdge);
            this.#insert(highEdge);
        }
        // Process 'split' events (2x edge insertion)
        else if (event.type === "split") {
            // Short circuits for invalid cases
            if (this.#map.has(event.edgeID1)) {
                throw new Error(`Event Error (Split): ID ${event.edgeID1} already exists`);
            }
            if (this.#map.has(event.edgeID2)) {
                throw new Error(`Event Error (Split): ID ${event.edgeID2} already exists`);
            }
            const [lowEdge, highEdge] = this.#createNodes(event);
            this.#insert(lowEdge);
            this.#insert(highEdge);
            const edgeBelow = this.#previous(lowEdge);
            const edgeAbove = this.#next(highEdge);
            this.#handleSplit(lowEdge, highEdge, edgeBelow, edgeAbove, event.vertex);
            this.#updateHelpers(lowEdge, edgeBelow, event.vertex, event.type, true);
        }
        // Process 'end' events (2x edge deletion)
        else if (event.type === "end") {
            if (!this.#map.has(event.edgeID1)) {
                throw new Error(`Event Error (End): ID ${event.edgeID1} does not exist`);
            }
            if (!this.#map.has(event.edgeID2)) {
                throw new Error(`Event Error (End): ID ${event.edgeID2} does not exist`);
            }
            const [lowEdge, highEdge] = this.#fetchNodes(event.edgeID1, event.edgeID2, "end");
            this.#handleEdgeEnd(lowEdge, null, highEdge, event.vertex, "end");
            this.#delete(lowEdge);
            this.#delete(highEdge);
        }
        // Process 'merge' events (2x edge deletion)
        else if (event.type === "merge") {
            if (!this.#map.has(event.edgeID1)) {
                throw new Error(`Event Error (End): ID ${event.edgeID1} does not exist`);
            }
            if (!this.#map.has(event.edgeID2)) {
                throw new Error(`Event Error (End): ID ${event.edgeID2} does not exist`);
            }
            const [lowEdge, highEdge] = this.#fetchNodes(event.edgeID1, event.edgeID2, "merge");
            const edgeBelow = this.#previous(lowEdge);
            const edgeAbove = this.#next(highEdge);
            this.#handleEdgeEnd(highEdge, edgeBelow, edgeAbove, event.vertex, "merge");
            this.#updateHelpers(lowEdge, edgeBelow, event.vertex, event.type);
            this.#delete(lowEdge);
            this.#delete(highEdge);
        }
    }
    /*************************************************************************************************
     *
     * Event processing utility methods
     *
     ************************************************************************************************/
    #handleEdgeEnd(endingEdge, edgeBelow, edgeAbove, newHelper, newHelperType) {
        if (endingEdge.helperType === "merge") {
            const diagonal = new Edge(endingEdge.helper, newHelper, endingEdge.helper.clockwise !== this.#clockwise, newHelper.clockwise !== this.#clockwise);
            this.#diagonals.push(diagonal);
            if (newHelperType === "end") {
                endingEdge.region.addEdges({ edge: diagonal, side: TOP, borders: edgeAbove.region.id });
                edgeAbove.region.addEdges({ edge: diagonal, side: BOTTOM, borders: endingEdge.region.id });
                this.#regionAdj[endingEdge.region.id].push(edgeAbove.region.id);
                this.#regionAdj[edgeAbove.region.id].push(endingEdge.region.id);
                return;
            }
            if (isBottom(endingEdge)) {
                endingEdge.region.addEdges({ edge: diagonal, side: TOP, borders: edgeAbove.region.id });
                edgeAbove.region.addEdges({ edge: diagonal, side: BOTTOM, borders: endingEdge.region.id });
                this.#regionAdj[endingEdge.region.id].push(edgeAbove.region.id);
                this.#regionAdj[edgeAbove.region.id].push(endingEdge.region.id);
                endingEdge.region = edgeAbove.region;
            }
            else {
                endingEdge.region.addEdges({ edge: diagonal, side: BOTTOM, borders: edgeBelow.region.id });
                edgeBelow.region.addEdges({ edge: diagonal, side: TOP, borders: endingEdge.region.id });
                this.#regionAdj[endingEdge.region.id].push(edgeBelow.region.id);
                this.#regionAdj[edgeBelow.region.id].push(endingEdge.region.id);
                endingEdge.region = edgeBelow.region;
            }
        }
    }
    #handleSplit(lowEdge, highEdge, edgeBelow, edgeAbove, newHelper) {
        const diagonal = new Edge(edgeBelow.helper, newHelper, edgeBelow.helper.clockwise !== this.#clockwise, newHelper.clockwise !== this.#clockwise);
        this.#diagonals.push(diagonal);
        if (edgeBelow.region == edgeAbove.region) {
            if (edgeBelow.originalHelper) {
                const newRegion = new Region(this.#regions.length, edgeBelow.value, diagonal, {
                    side: TOP,
                    id: edgeBelow.region.id,
                });
                this.#regionAdj.push([]);
                this.#regionAdj[newRegion.id].push(edgeBelow.region.id);
                this.#regionAdj[edgeBelow.region.id].push(newRegion.id);
                this.#regions.push(newRegion);
                edgeBelow.region.popEdge(edgeBelow.value);
                edgeBelow.region.addEdges({ edge: diagonal, side: edgeBelow.side, borders: newRegion.id });
                lowEdge.region = newRegion;
                highEdge.region = edgeAbove.region;
                edgeBelow.region = newRegion;
                newRegion.addEdges({ edge: lowEdge.value, side: lowEdge.side });
                edgeAbove.region.addEdges({ edge: highEdge.value, side: highEdge.side });
            }
            else {
                const newRegion = new Region(this.#regions.length, diagonal, edgeAbove.value, {
                    side: BOTTOM,
                    id: edgeBelow.region.id,
                });
                this.#regionAdj.push([]);
                this.#regionAdj[newRegion.id].push(edgeBelow.region.id);
                this.#regionAdj[edgeBelow.region.id].push(newRegion.id);
                this.#regions.push(newRegion);
                edgeAbove.region.popEdge(edgeAbove.value);
                edgeAbove.region.addEdges({ edge: diagonal, side: edgeAbove.side, borders: newRegion.id });
                lowEdge.region = edgeBelow.region;
                highEdge.region = newRegion;
                edgeAbove.region = newRegion;
                newRegion.addEdges({ edge: highEdge.value, side: highEdge.side });
                edgeBelow.region.addEdges({ edge: lowEdge.value, side: lowEdge.side });
            }
        }
        else {
            lowEdge.region = edgeBelow.region;
            highEdge.region = edgeAbove.region;
            edgeBelow.region.addEdges({ edge: diagonal, side: lowEdge.side, borders: edgeAbove.region.id }, { edge: lowEdge.value, side: lowEdge.side });
            edgeAbove.region.addEdges({ edge: diagonal, side: highEdge.side, borders: edgeBelow.region.id }, { edge: highEdge.value, side: highEdge.side });
            this.#regionAdj[edgeBelow.region.id].push(edgeAbove.region.id);
            this.#regionAdj[edgeAbove.region.id].push(edgeBelow.region.id);
        }
    }
    #updateHelpers(helperEdge, edgeBelow, newHelper, newHelperType, afterSplit = false) {
        if (edgeBelow && isBottom(edgeBelow)) {
            if (!afterSplit && edgeBelow.helperType === "merge") {
                const diagonal = new Edge(edgeBelow.helper, newHelper, edgeBelow.helper.clockwise !== this.#clockwise, newHelper.clockwise !== this.#clockwise);
                this.#diagonals.push(diagonal);
                helperEdge.region.addEdges({ edge: diagonal, side: BOTTOM, borders: edgeBelow.region.id });
                edgeBelow.region.addEdges({ edge: diagonal, side: TOP, borders: helperEdge.region.id });
                this.#regionAdj[helperEdge.region.id].push(edgeBelow.region.id);
                this.#regionAdj[edgeBelow.region.id].push(helperEdge.region.id);
                helperEdge.region = edgeBelow.region;
            }
            edgeBelow.helper = newHelper;
            edgeBelow.helperType = newHelperType;
            edgeBelow.originalHelper = false;
        }
    }
    /**
     * @private
     * @internal
     *
     * For use with 'start' and 'split' events.
     *
     * Creates and returns an array of two edge nodes representing the new edges in the given
     * StartSplitEvent. The first node in the array represents the lower edge, and the second node
     * represents the higher edge.
     *
     * Assumes that the new edge IDs are not already present in the tree.
     *
     * @param {StartSplitEvent} event - The edge event being processed
     * @param {Region} [region] - (Optional) The region for the new edges, if it's already known
     * @returns An array of two edge nodes with the lower node first and the higher node second
     */
    #createNodes(event, region = this.#tempRegion) {
        let lowNode = new EdgeNode(event.edgeID1, event.edge1, event.tiebreaker1, event.vertex, event.type, region);
        let highNode = new EdgeNode(event.edgeID2, event.edge2, event.tiebreaker2, event.vertex, event.type, region);
        // Swap nodes if necessary so that they're ordered from bottom to top
        if (lowNode.tiebreaker > highNode.tiebreaker) {
            [lowNode, highNode] = [highNode, lowNode];
        }
        // Assign node sides based on event type
        if (event.type === "start") {
            highNode.side = TOP;
        }
        else {
            lowNode.side = TOP;
        }
        return [lowNode, highNode];
    }
    /**
     * @private
     * @internal
     *
     * For use with 'end' and 'merge' events.
     *
     * Returns an array of two edge nodes in the tree that represent the edges with the given IDs. The
     * first node in the array represents the lower edge, and the second node represents the higher
     * edge.
     *
     * Assumes that the edge IDs are present in the tree.
     *
     * @param {string} firstID - The ID of the first edge
     * @param {string} secondID - The ID of the second edge
     * @param {VertexType} type - The type of the edge event that is requesting the nodes
     * @returns An array of two edge nodes with the lower node first and the higher node second
     */
    #fetchNodes(firstID, secondID, type) {
        let lowNode = this.#map.get(firstID);
        let highNode = this.#map.get(secondID);
        // Swap nodes if necessary so that they're ordered from bottom to top
        if ((type === "merge" && lowNode.side === BOTTOM) || (type === "end" && lowNode.side === TOP)) {
            [lowNode, highNode] = [highNode, lowNode];
        }
        return [lowNode, highNode];
    }
    /*************************************************************************************************
     *
     * Red black tree core methods
     *
     ************************************************************************************************/
    #insert(newNode) {
        // If the tree is empty, the new node must be the root, and it must be black
        if (this.#root === null) {
            newNode.color = BLACK;
            this.#root = newNode;
            this.#map.set(newNode.id, newNode);
            return;
        }
        // Get the dynamic key of the new node, and create a comparator for easy comparison with other
        // keys in the tree
        const key = this.#keyExtractor(newNode.value, newNode.helper.x);
        const comparator = (value) => key - this.#keyExtractor(value, newNode.helper.x);
        // Things to remember for non-recursive insertion traversal
        let currNode = this.#root;
        let prevNode = null;
        let keyComp = 0;
        // Loop until a null (leaf) node is reached
        while (currNode !== null) {
            // Negative if the new key is less than the current key, zero if equal, and positive if
            // greater than
            keyComp = comparator(currNode.value);
            if (keyComp === 0) {
                // If the new key is equal to the current key, fall back to tiebreaker values
                const tieComp = newNode.tiebreaker - currNode.tiebreaker;
                if (tieComp === 0) {
                    // Throw an error if the new edge is not unique
                    throw new Error("Identical edge already exists in the tree");
                }
                else {
                    // If the tiebreaker values are not equal, use the comparison to guide the next step of
                    // traversal
                    keyComp = tieComp;
                }
            }
            // Traverse one node down the tree based on the value of 'keyComp'
            prevNode = currNode;
            if (keyComp < 0) {
                currNode = currNode.left;
            }
            else {
                currNode = currNode.right;
            }
        }
        // The new node's parent is the previously-traversed node
        newNode.parent = prevNode;
        // Set the new parent's child based on the value of 'keyComp'
        if (keyComp < 0) {
            prevNode.left = newNode;
        }
        else {
            prevNode.right = newNode;
        }
        // Maintain red black tree invariants
        this.#balanceInsert(newNode);
        this.#map.set(newNode.id, newNode);
    }
    #delete(node) {
        let origColor = node.color;
        let toBalance;
        if (node.left === null) {
            toBalance = node.right;
            this.#transplant(node, node.right);
        }
        else if (node.right === null) {
            toBalance = node.left;
            this.#transplant(node, node.left);
        }
        else {
            const rightMin = this.#min(node.right);
            origColor = rightMin.color;
            toBalance = rightMin.right;
            if (node.id !== rightMin.parent?.id) {
                this.#transplant(rightMin, rightMin.right);
                rightMin.right = node.right;
                rightMin.right.parent = rightMin;
            }
            this.#transplant(node, rightMin);
            rightMin.left = node.left;
            rightMin.left.parent = rightMin;
            rightMin.color = node.color;
            if (origColor === BLACK) {
                this.#balanceDelete(toBalance, rightMin);
            }
        }
        this.#map.delete(node.id);
    }
    #replace(oldNode, newID, newValue, newTiebreaker, helper, helperType) {
        this.#map.delete(oldNode.id);
        oldNode.id = newID;
        oldNode.value = newValue;
        oldNode.tiebreaker = newTiebreaker;
        oldNode.helper = helper;
        oldNode.helperType = helperType;
        oldNode.originalHelper = true;
        this.#map.set(newID, oldNode);
    }
    #min(node) {
        if (!node) {
            return null;
        }
        let prevNode = node;
        let currNode = node;
        while (currNode) {
            prevNode = currNode;
            currNode = currNode.left;
        }
        return prevNode;
    }
    #max(node) {
        if (!node) {
            return null;
        }
        let prevNode = node;
        let currNode = node;
        while (currNode) {
            prevNode = currNode;
            currNode = currNode.right;
        }
        return prevNode;
    }
    #previous(node) {
        if (node.left) {
            return this.#max(node.left);
        }
        let parentNode = node.parent;
        let currNode = node;
        while (parentNode) {
            if (parentNode.right?.id === currNode.id) {
                return parentNode;
            }
            currNode = parentNode;
            parentNode = parentNode.parent;
        }
        return null;
    }
    #next(node) {
        if (node.right) {
            return this.#min(node.right);
        }
        let parentNode = node.parent;
        let currNode = node;
        while (parentNode) {
            if (parentNode.left?.id === currNode.id) {
                return parentNode;
            }
            currNode = parentNode;
            parentNode = parentNode.parent;
        }
        return null;
    }
    /*************************************************************************************************
     *
     * Red black tree utility methods
     *
     ************************************************************************************************/
    #rotateLeft(node) {
        if (!node.right) {
            throw new Error("Cannot rotate left when node's right child is null");
        }
        const rightChild = node.right;
        node.right = rightChild.left;
        if (rightChild.left !== null) {
            rightChild.left.parent = node;
        }
        rightChild.parent = node.parent;
        if (node.parent === null) {
            this.#root = rightChild;
        }
        else if (node.id === node.parent.left?.id) {
            node.parent.left = rightChild;
        }
        else {
            node.parent.right = rightChild;
        }
        rightChild.left = node;
        node.parent = rightChild;
        return rightChild;
    }
    #rotateRight(node) {
        if (!node.left) {
            throw new Error("Cannot rotate right when node's left child is null");
        }
        const leftChild = node.left;
        node.left = leftChild.right;
        if (leftChild.right !== null) {
            leftChild.right.parent = node;
        }
        leftChild.parent = node.parent;
        if (node.parent === null) {
            this.#root = leftChild;
        }
        else if (node.id === node.parent.left?.id) {
            node.parent.left = leftChild;
        }
        else {
            node.parent.right = leftChild;
        }
        leftChild.right = node;
        node.parent = leftChild;
        return leftChild;
    }
    #transplant(oldNode, newNode) {
        if (oldNode.parent === null) {
            this.#root = newNode;
        }
        else if (oldNode.id === oldNode.parent.left?.id) {
            oldNode.parent.left = newNode;
        }
        else {
            oldNode.parent.right = newNode;
        }
        if (newNode) {
            newNode.parent = oldNode.parent;
        }
    }
    #balanceInsert(node) {
        // Not even going to try to document this. Maybe later.
        while (node.parent && isRed(node.parent)) {
            if (node.parent.id === node.parent.parent?.left?.id) {
                const uncle = node.parent.parent.right;
                if (uncle && isRed(uncle)) {
                    node.parent.color = BLACK;
                    uncle.color = BLACK;
                    node.parent.parent.color = RED;
                    node = node.parent.parent;
                }
                else {
                    if (node.id === node.parent.right?.id) {
                        node = node.parent;
                        this.#rotateLeft(node);
                    }
                    node.parent = node.parent;
                    node.parent.color = BLACK;
                    if (node.parent.parent) {
                        node.parent.parent.color = RED;
                        this.#rotateRight(node.parent.parent);
                    }
                }
            }
            else {
                const uncle = node.parent.parent?.left;
                if (uncle && isRed(uncle)) {
                    node.parent.parent = node.parent.parent;
                    node.parent.color = BLACK;
                    uncle.color = RED;
                    node.parent.parent.color = RED;
                    node = node.parent.parent;
                }
                else {
                    if (node.id === node.parent.left?.id) {
                        node = node.parent;
                        this.#rotateRight(node);
                    }
                    node.parent = node.parent;
                    node.parent.color = BLACK;
                    if (node.parent.parent) {
                        node.parent.parent.color = RED;
                        this.#rotateLeft(node.parent.parent);
                    }
                }
            }
        }
        this.#root.color = BLACK;
    }
    #balanceDelete(node, parent) {
        while (parent && !isRed(node)) {
            if (parent.left && node?.id === parent.left.id) {
                let sibling = parent.right;
                if (isRed(sibling)) {
                    sibling.color = BLACK;
                    parent.color = RED;
                    this.#rotateLeft(parent);
                    sibling = parent.right;
                }
                if (!isRed(sibling?.left) && !isRed(sibling?.right)) {
                    if (sibling) {
                        sibling.color = RED;
                    }
                    node = parent;
                    parent = parent.parent;
                }
                else {
                    sibling = sibling;
                    if (!isRed(sibling.right)) {
                        sibling.left.color = BLACK;
                        sibling.color = RED;
                        this.#rotateRight(sibling);
                        sibling = parent.right;
                    }
                    if (sibling) {
                        sibling.color = parent.color;
                    }
                    parent.color = BLACK;
                    if (sibling?.right) {
                        sibling.right.color = BLACK;
                    }
                    this.#rotateLeft(parent);
                    node = this.#root;
                    parent = null;
                }
            }
            else {
                let sibling = parent.left;
                if (isRed(sibling)) {
                    sibling.color = BLACK;
                    parent.color = RED;
                    this.#rotateRight(parent);
                    sibling = parent.left;
                }
                if (!isRed(sibling?.left) && !isRed(sibling?.right)) {
                    if (sibling) {
                        sibling.color = RED;
                    }
                    node = parent;
                    parent = parent.parent;
                }
                else {
                    sibling = sibling;
                    if (!isRed(sibling.left)) {
                        sibling.right.color = BLACK;
                        sibling.color = RED;
                        this.#rotateLeft(sibling);
                        sibling = parent.left;
                    }
                    if (sibling) {
                        sibling.color = parent.color;
                    }
                    parent.color = BLACK;
                    if (sibling?.left) {
                        sibling.left.color = BLACK;
                    }
                    this.#rotateRight(parent);
                    node = this.#root;
                    parent = null;
                }
            }
            if (node) {
                node.color = BLACK;
            }
        }
    }
    getCoordinateArray(coord) {
        if (this.#root === null) {
            return [];
        }
        const results = [];
        this.#gatherCoordinates(this.#root, coord, results);
        return results;
    }
    #gatherCoordinates(node, coord, results) {
        if (node === null) {
            return;
        }
        this.#gatherCoordinates(node.left, coord, results);
        results.push(this.#keyExtractor(node.value, coord));
        this.#gatherCoordinates(node.right, coord, results);
    }
}
