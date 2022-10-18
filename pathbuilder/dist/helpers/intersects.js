import ccw from "./ccw.js";
export default function intersects(vtxOne, vtxTwo, vtxThree, vtxFour) {
    return (ccw(vtxOne, vtxThree, vtxFour) != ccw(vtxTwo, vtxThree, vtxFour) &&
        ccw(vtxOne, vtxTwo, vtxThree) != ccw(vtxOne, vtxTwo, vtxFour));
}
