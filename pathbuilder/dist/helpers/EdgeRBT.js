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
/**
 * Class representing a node in the edge tree
 */
class EdgeNode {
    /** The node's id, used for map lookups */
    id;
    /** The value contained in the node */
    value;
    /** Numeric value used to break ties between dynamic keys */
    tiebreaker;
    /** The node's color, either red or black */
    color;
    /** The node's parent node, or null if the node is the root */
    parent;
    /** The node's left child, or null if the node has no left child */
    left;
    /** The node's right child, or null if the node has no right child */
    right;
    /**
     * Creates a new edge node
     *
     * @param {string} id - An id that uniquely identifies this node
     * @param {V} value - The value to store in this node
     * @param {number} tiebreaker - A value to use to resolve ties between dynamic keys
     * @param {EdgeNode<V>} [parent=null] - The parent of the new node
     */
    constructor(id, value, tiebreaker, parent = null) {
        this.id = id;
        this.value = value;
        this.tiebreaker = tiebreaker;
        this.color = RED;
        this.parent = parent;
        this.left = null;
        this.right = null;
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
    /** A map that associates string IDs with tree nodes */
    #map;
    /**
     * Creates a new edge tree
     *
     * @param {KeyExtractor<V>} keyExtractor - A function that determines a node's key based on its
     * value and an intersection coordinate of a reference line
     */
    constructor(keyExtractor) {
        this.#root = null;
        this.#keyExtractor = keyExtractor;
        this.#map = new Map();
    }
    /**
     * Adds a new value to the tree
     *
     * @param {string} id - A string that uniquely identifies the new value
     * @param {V} value - The value to be added to the tree
     * @param {number} coord - Reference line intersection coordinate used to extract dynamic keys
     * from the new value and existing values in the tree
     * @param {number} tiebreaker - Value used to resolve dynamic key ties
     */
    insert(id, value, coord, tiebreaker) {
        // Create a new node with the given properties and add it to the map
        const newNode = new EdgeNode(id, value, tiebreaker);
        // Short circuit throws an error if the given id is not unique
        if (!this.#map.has(id)) {
            this.#map.set(id, newNode);
        }
        // If the tree is empty, the new node must be the root, and it must be black
        if (this.#root === null) {
            newNode.color = BLACK;
            this.#root = newNode;
            return;
        }
        // Get the dynamic key of the new node, and create a comparator for easy comparison with other
        // keys in the tree
        const key = this.#keyExtractor(value, coord);
        const comparator = (value) => key - this.#keyExtractor(value, coord);
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
                const tieComp = tiebreaker - currNode.tiebreaker;
                if (tieComp === 0) {
                    // If the tiebreaker values are also equal, just perform a replace operation
                    this.replace(currNode.id, id, value, tiebreaker);
                    return;
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
                    node.parent.parent = node.parent.parent;
                    node.parent.color = BLACK;
                    node.parent.parent.color = RED;
                    this.#rotateRight(node.parent.parent);
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
                    node.parent.parent = node.parent.parent;
                    node.parent.color = BLACK;
                    node.parent.parent.color = RED;
                    this.#rotateLeft(node.parent.parent);
                }
            }
        }
        this.#root.color = BLACK;
    }
    delete(id) {
        const targetNode = this.#map.get(id);
        if (!targetNode) {
            throw new Error(`The tree does not contain a node with id ${id}`);
        }
        this.#delete(targetNode);
        this.#map.delete(id);
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
                this.#balance_delete(toBalance, rightMin);
            }
        }
    }
    #balance_delete(node, parent) {
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
    replace(id, newId, newValue, newTiebreaker) {
        const targetNode = this.#map.get(id);
        if (!targetNode) {
            throw new Error("The given id was not found");
        }
        targetNode.id = newId;
        targetNode.value = newValue;
        targetNode.tiebreaker = newTiebreaker;
        this.#map.delete(id);
        this.#map.set(newId, targetNode);
        return targetNode;
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
