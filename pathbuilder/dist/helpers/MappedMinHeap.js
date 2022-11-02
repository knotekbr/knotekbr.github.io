export default class MappedMinHeap {
    #heap;
    #size;
    #mapKeyExtractor;
    #heapKeyExtractor;
    #valueMap;
    constructor(extractorOrHeap, heapKeyExtractor) {
        this.#heap = [];
        if (extractorOrHeap instanceof (MappedMinHeap)) {
            for (const node of extractorOrHeap.#heap) {
                this.#heap.push({ ...node });
            }
            this.#size = extractorOrHeap.#size;
            this.#mapKeyExtractor = extractorOrHeap.#mapKeyExtractor;
            this.#heapKeyExtractor = extractorOrHeap.#heapKeyExtractor;
            this.#valueMap = new Map(extractorOrHeap.#valueMap.entries());
        }
        else {
            this.#size = 0;
            this.#mapKeyExtractor = extractorOrHeap;
            this.#heapKeyExtractor = heapKeyExtractor;
            this.#valueMap = new Map();
        }
    }
    get size() {
        return this.#size;
    }
    insert(value, tiebreaker, key) {
        if (!this.#addToMap(value, this.#size)) {
            throw new Error("The map key associated with this value is already in use");
        }
        if (key === undefined) {
            if (this.#heapKeyExtractor === undefined) {
                throw new Error("A heap key is required");
            }
            else {
                key = this.#heapKeyExtractor(value);
            }
        }
        this.#heap.push({ key, tiebreaker, value });
        this.#size++;
        this.#swim(this.#size - 1);
    }
    getMin() {
        if (this.#size === 0) {
            throw new Error("The heap is empty");
        }
        return this.#heap[0].value;
    }
    removeMin() {
        const min = this.#heap[0].value;
        if (this.#size == 0) {
            throw new Error("The heap is empty");
        }
        else if (this.#size == 1) {
            this.#heap.pop();
            this.#valueMap.clear();
            this.#size--;
            return min;
        }
        else {
            this.#heap[0] = this.#heap[this.#size - 1];
            this.#updateMap(this.#heap[0].value, 0);
            this.#heap.pop();
            this.#removeFromMap(min);
            this.#size--;
            this.#sink(0);
            return min;
        }
    }
    updateIdentifiers(value, tiebreaker, key) {
        const mapKey = this.#mapKeyExtractor(value);
        if (!this.#valueMap.has(mapKey)) {
            throw new Error("The given value does not exist in the heap");
        }
        if (key === undefined) {
            if (this.#heapKeyExtractor === undefined) {
                throw new Error("A new heap key is required");
            }
            else {
                key = this.#heapKeyExtractor(value);
            }
        }
        const index = this.#valueMap.get(mapKey);
        this.#heap[index].key = key;
        if (tiebreaker !== null) {
            this.#heap[index].tiebreaker = tiebreaker;
        }
        this.#swim(index);
        this.#sink(index);
    }
    contains(value) {
        const mapKey = this.#mapKeyExtractor(value);
        return this.#valueMap.has(mapKey);
    }
    clear() {
        this.#heap = [];
        this.#size = 0;
        this.#valueMap.clear();
    }
    toArray() {
        return this.#heap.map((node) => node.value);
    }
    toString() {
        let result = `MappedMinHeap (${this.#size}): [`;
        for (const node of this.#heap) {
            result += `${node.value}, `;
        }
        result = result.slice(0, -2) + "]";
        return result;
    }
    #swim(index) {
        let parentIdx = Math.floor((index - 1) / 2);
        while (index > 0 &&
            (this.#heap[index].key < this.#heap[parentIdx].key ||
                (this.#heap[index].key == this.#heap[parentIdx].key &&
                    this.#heap[index].tiebreaker < this.#heap[parentIdx].tiebreaker))) {
            const tempNode = this.#heap[parentIdx];
            this.#heap[parentIdx] = this.#heap[index];
            this.#heap[index] = tempNode;
            this.#updateMap(tempNode.value, index);
            index = parentIdx;
            parentIdx = Math.floor((index - 1) / 2);
        }
        this.#updateMap(this.#heap[index].value, index);
    }
    #sink(index) {
        let leftIdx = index * 2 + 1;
        let rightIdx = index * 2 + 2;
        let minIdx = index;
        while (true) {
            if (this.#size > leftIdx &&
                (this.#heap[leftIdx].key < this.#heap[minIdx].key ||
                    (this.#heap[leftIdx].key == this.#heap[minIdx].key &&
                        this.#heap[leftIdx].tiebreaker < this.#heap[minIdx].tiebreaker))) {
                minIdx = leftIdx;
            }
            if (this.#size > rightIdx &&
                (this.#heap[rightIdx].key < this.#heap[minIdx].key ||
                    (this.#heap[rightIdx].key == this.#heap[minIdx].key &&
                        this.#heap[rightIdx].tiebreaker < this.#heap[minIdx].tiebreaker))) {
                minIdx = rightIdx;
            }
            if (minIdx != index) {
                const tempNode = this.#heap[minIdx];
                this.#heap[minIdx] = this.#heap[index];
                this.#heap[index] = tempNode;
                this.#updateMap(this.#heap[index].value, index);
                index = minIdx;
                leftIdx = index * 2 + 1;
                rightIdx = index * 2 + 2;
            }
            else {
                break;
            }
        }
        this.#updateMap(this.#heap[index].value, index);
    }
    #addToMap(value, heapIdx) {
        const mapKey = this.#mapKeyExtractor(value);
        if (this.#valueMap.has(mapKey)) {
            return false;
        }
        this.#valueMap.set(mapKey, heapIdx);
        return true;
    }
    #removeFromMap(value) {
        const mapKey = this.#mapKeyExtractor(value);
        return this.#valueMap.delete(mapKey);
    }
    #updateMap(value, heapIdx) {
        const mapKey = this.#mapKeyExtractor(value);
        this.#valueMap.set(mapKey, heapIdx);
    }
}
