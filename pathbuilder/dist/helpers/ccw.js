export default function ccw(vtxOne, vtxTwo, vtxThree) {
    return ((vtxThree.y - vtxOne.y) * (vtxTwo.x - vtxOne.x) >
        (vtxTwo.y - vtxOne.y) * (vtxThree.x - vtxOne.x));
}
