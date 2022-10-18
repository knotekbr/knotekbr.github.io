export default function crossProductZ(vtxOne, vtxTwo, vtxThree) {
    const x1 = vtxTwo.x - vtxOne.x;
    const y1 = vtxTwo.y - vtxOne.y;
    const x2 = vtxThree.x - vtxTwo.x;
    const y2 = vtxThree.y - vtxTwo.y;
    return x1 * y2 - y1 * x2;
}
