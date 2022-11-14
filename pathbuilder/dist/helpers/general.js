import { UID_CHARS, UID_CHARS_LEN } from "../constants.js";
function averagePoint(...points) {
    let xTotal = 0;
    let yTotal = 0;
    for (const point of points) {
        xTotal += point.x;
        yTotal += point.y;
    }
    return { x: xTotal / points.length, y: yTotal / points.length };
}
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
function clockwise(vtxOne, vtxTwo, vtxThree) {
    return ((vtxThree.y - vtxOne.y) * (vtxTwo.x - vtxOne.x) >
        (vtxTwo.y - vtxOne.y) * (vtxThree.x - vtxOne.x));
}
/**
 * Creates and returns a new SVG element. Root SVG elements automatically receive the required
 * 'xmlns' attribute.
 *
 * @param {SVGTagName} tagName - The tag name of the element to be created
 * @param {Attributes} attrs - An object whose entries correspond to attribute names and values
 * @returns A new SVG element
 */
function createSVGElement(tagName, attrs = {}) {
    const elem = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    if (tagName === "svg") {
        elem.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    for (const [attr, val] of Object.entries(attrs)) {
        elem.setAttribute(attr, val);
    }
    return elem;
}
function distance(from, to) {
    return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
}
function intersects(vtxOne, vtxTwo, vtxThree, vtxFour) {
    return (clockwise(vtxOne, vtxThree, vtxFour) != clockwise(vtxTwo, vtxThree, vtxFour) &&
        clockwise(vtxOne, vtxTwo, vtxThree) != clockwise(vtxOne, vtxTwo, vtxFour));
}
function slope(from, to) {
    return (to.y - from.y) / (to.x - from.x);
}
function uid(length = 10) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += UID_CHARS.charAt(Math.floor(Math.random() * UID_CHARS_LEN));
    }
    return result;
}
export { averagePoint, clockwise, createSVGElement, distance, intersects, slope, uid };
