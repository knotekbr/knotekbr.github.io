/**
 * Returns true if the given points are oriented in a clockwise fashion, or false if they're
 * oriented in a counterclockwise fashion.
 *
 * NOTE: On a standard coordinate plane, this method would return true for counterclockwise
 * orientations, and false for clockwise orientations. The return values are swapped because an
 * inverted y-axis is used on the web.
 *
 * @param {Point} vtxOne - The first vertex
 * @param {Point} vtxTwo - The second vertex
 * @param {Point} vtxThree - The third vertex
 * @returns True if the points are oriented clockwise, false otherwise
 */
export default function clockwise(vtxOne, vtxTwo, vtxThree) {
    return ((vtxThree.y - vtxOne.y) * (vtxTwo.x - vtxOne.x) >
        (vtxTwo.y - vtxOne.y) * (vtxThree.x - vtxOne.x));
}
