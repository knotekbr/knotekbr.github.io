export default class Region {
    from = [];
    to = [];
    constructor(...from) {
        for (const region of from) {
            this.from.push(region);
            region.to.push(this);
        }
    }
    get head() {
        return this.from.length == 0;
    }
    get tail() {
        return this.to.length == 0;
    }
}
