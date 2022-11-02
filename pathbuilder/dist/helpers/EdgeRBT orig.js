const RED = true;
const BLACK = false;
function isRed(node) {
    if (!node) {
        return false;
    }
    return node.color;
}
class EdgeNode {
    id;
    value;
    tiebreaker;
    color;
    left;
    right;
    constructor(id, value, tiebreaker) {
        this.id = id;
        this.value = value;
        this.tiebreaker = tiebreaker;
        this.color = RED;
        this.left = null;
        this.right = null;
    }
}
export default class EdgeRBT {
    #root;
    #keyExtractor;
    #map;
    constructor(keyExtractor) {
        this.#root = null;
        this.#keyExtractor = keyExtractor;
        this.#map = new Map();
    }
    insert(id, value, coord, tiebreaker) {
        if (this.#map.has(id)) {
            throw new Error("There is already a node with this id");
        }
        const key = this.#keyExtractor(value, coord);
        this.#root = this.#insert(this.#root, key, tiebreaker, coord, id, value);
        this.#root.color = BLACK;
    }
    #insert(node, key, tiebreaker, coord, id, value) {
        if (!node) {
            const newNode = new EdgeNode(id, value, tiebreaker);
            this.#map.set(id, newNode);
            return newNode;
        }
        let keyComp = key - this.#keyExtractor(node.value, coord);
        if (keyComp === 0) {
            const tieComp = tiebreaker - node.tiebreaker;
            if (tieComp === 0) {
                node.value = value;
            }
            else {
                keyComp = tieComp;
            }
        }
        if (keyComp < 0) {
            node.left = this.#insert(node.left, key, tiebreaker, coord, id, value);
        }
        else {
            node.right = this.#insert(node.right, key, tiebreaker, coord, id, value);
        }
        if (isRed(node.right) && !isRed(node.left)) {
            node = this.#rotateLeft(node);
        }
        if (isRed(node.left) && isRed(node.left?.left)) {
            node = this.#rotateRight(node);
        }
        if (isRed(node.left) && isRed(node.right)) {
            this.#flipColors(node);
        }
        return node;
    }
    replace(id, newId, newValue) {
        const targetNode = this.#map.get(id);
        if (!targetNode) {
            throw new Error("The given id was not found");
        }
        targetNode.id = newId;
        targetNode.value = newValue;
        this.#map.delete(id);
        this.#map.set(newId, targetNode);
    }
    delete(id, coord) {
        const targetNode = this.#map.get(id);
        if (!this.#root || !targetNode) {
            throw new Error("The given id was not found");
        }
        const key = this.#keyExtractor(targetNode.value, coord);
        if (!isRed(this.#root.left) && !isRed(this.#root.right)) {
            this.#root.color = RED;
        }
        this.#root = this.#delete(this.#root, key, coord);
        this.#map.delete(id);
        if (this.#root) {
            this.#root.color = BLACK;
        }
    }
    #delete(node, key, coord) {
        let keyComp = key - this.#keyExtractor(node.value, coord);
        if (keyComp < 0) {
            if (!isRed(node.left) && !isRed(node.left?.left)) {
                node = this.#moveRedLeft(node);
            }
            node.left = this.#delete(node.left, key, coord);
        }
        else {
            if (isRed(node.left)) {
                node = this.#rotateRight(node);
                keyComp = key - this.#keyExtractor(node.value, coord);
            }
            if (keyComp === 0 && node.right === null) {
                return null;
            }
            if (!isRed(node.right) && !isRed(node.right?.left)) {
                node = this.#moveRedRight(node);
                keyComp = key - this.#keyExtractor(node.value, coord);
            }
            if (keyComp === 0) {
                const rightMin = this.#min(node.right);
                node.id = rightMin.id;
                node.value = rightMin.value;
                node.right = this.#deleteMin(node.right);
            }
            else {
                node.right = this.#delete(node.right, key, coord);
            }
        }
        return this.#balance(node);
    }
    deleteMin() {
        if (!this.#root) {
            return;
        }
        if (!isRed(this.#root.left) && !isRed(this.#root.right)) {
            this.#root.color = RED;
        }
        this.#root = this.#deleteMin(this.#root);
        if (this.#root) {
            this.#root.color = BLACK;
        }
    }
    #deleteMin(node) {
        if (node.left === null) {
            return null;
        }
        if (!isRed(node.left) && !isRed(node.left?.left)) {
            node = this.#moveRedLeft(node);
        }
        node.left = this.#deleteMin(node.left);
        return this.#balance(node);
    }
    #balance(node) {
        if (isRed(node.right) && !isRed(node.left)) {
            node = this.#rotateLeft(node);
        }
        if (isRed(node.left) && isRed(node.left?.left)) {
            node = this.#rotateRight(node);
        }
        if (isRed(node.left) && isRed(node.right)) {
            this.#flipColors(node);
        }
        return node;
    }
    #min(node) {
        if (node.left === null) {
            return node;
        }
        return this.#min(node.left);
    }
    #max(node) {
        if (node.right === null) {
            return node;
        }
        return this.#max(node.right);
    }
    #moveRedLeft(node) {
        this.#flipColors(node);
        if (isRed(node.right?.left)) {
            node.right = this.#rotateRight(node.right);
            node = this.#rotateLeft(node);
            this.#flipColors(node);
        }
        return node;
    }
    #moveRedRight(node) {
        this.#flipColors(node);
        if (isRed(node.left?.left)) {
            node = this.#rotateRight(node);
            this.#flipColors(node);
        }
        return node;
    }
    #rotateLeft(node) {
        if (!node.right) {
            throw new Error("Cannot rotate left when node's right child is null");
        }
        const rightChild = node.right;
        node.right = rightChild.left;
        rightChild.left = node;
        rightChild.color = node.color;
        node.color = RED;
        return rightChild;
    }
    #rotateRight(node) {
        if (!node.left) {
            throw new Error("Cannot rotate right when node's left child is null");
        }
        const leftChild = node.left;
        node.left = leftChild.right;
        leftChild.right = node;
        leftChild.color = node.color;
        node.color = RED;
        return leftChild;
    }
    #flipColors(node) {
        if (!node.left || !node.right) {
            throw new Error("Cannot flip colors of a node that does not have two children");
        }
        node.color = !node.color;
        node.left.color = !node.left.color;
        node.right.color = !node.right.color;
    }
}
