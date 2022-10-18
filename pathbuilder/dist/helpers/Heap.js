export default class Heap {
    #elements = [];
    #keyExtractor;
    constructor(keyExtractor) {
        this.#keyExtractor = keyExtractor;
    }
}
