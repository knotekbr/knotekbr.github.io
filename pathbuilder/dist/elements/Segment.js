export default class Segment {
    #start;
    #end;
    #length;
    #slope;
    constructor(start, end) {
        this.#start = start;
        this.#end = end;
        this.#length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        this.#slope = (end.y - start.y) / (end.x - start.x);
    }
}
