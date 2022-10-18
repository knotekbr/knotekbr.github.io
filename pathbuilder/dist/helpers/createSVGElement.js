/**
 * Creates and returns a new SVG element. Root SVG elements automatically receive the required
 * 'xmlns' attribute.
 *
 * @param {SVGTagName} tagName - The tag name of the element to be created
 * @param {Attributes} attrs - An object whose entries correspond to attribute names and values
 * @returns A new SVG element
 */
export default function createSVGElement(tagName, attrs = {}) {
    const elem = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    if (tagName === "svg") {
        elem.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    for (const [attr, val] of Object.entries(attrs)) {
        elem.setAttribute(attr, val);
    }
    return elem;
}
