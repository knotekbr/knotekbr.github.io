export default class Region2 {
    adj = [];
    reference;
    minCross;
    maxCross;
    constructor(reference) {
        this.minCross = this.maxCross = this.reference = reference;
    }
}
