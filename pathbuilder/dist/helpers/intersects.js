import clockwise from "./clockwise.js";
export default function intersects(vtxOne, vtxTwo, vtxThree, vtxFour) {
    return (clockwise(vtxOne, vtxThree, vtxFour) != clockwise(vtxTwo, vtxThree, vtxFour) &&
        clockwise(vtxOne, vtxTwo, vtxThree) != clockwise(vtxOne, vtxTwo, vtxFour));
}
