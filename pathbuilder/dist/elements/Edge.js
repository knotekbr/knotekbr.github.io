export default class Edge {
    from;
    to;
    fromReflex;
    toReflex;
    constructor(from, to, fromReflex, toReflex) {
        if (to.x < from.x) {
            [from, to] = [to, from];
        }
        this.from = { x: from.x, y: from.y };
        this.to = { x: to.x, y: to.y };
        this.fromReflex = fromReflex;
        this.toReflex = toReflex;
    }
}