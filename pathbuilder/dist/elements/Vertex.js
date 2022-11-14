import { clockwise, createSVGElement } from "../helpers/index.js";
/**
 * Class representing a polygon vertex
 */
export default class Vertex {
    // Default attributes for all vertex SVG elements
    static #vtxAttrs = {
        r: "4",
        "stroke-width": "10",
        stroke: "transparent",
        fill: "#4287f5",
    };
    // Basic vertex properties
    #x;
    #y;
    #id;
    #clockwise = false;
    // SVG elements associated with the vertex
    #vtxElement;
    #edgeElement;
    // Neighboring vertices
    #prevNeighbor;
    #nextNeighbor;
    // Callback functions for notifying the parent polygon of changes
    #selectFn;
    #updateFn;
    /**
     * Creates a new vertex
     *
     * @param {number} x - The vertex's x-coordinate
     * @param {number} y - The vertex's y-coordinate
     * @param {string} id - The vertex's id
     * @param {Neighbor} [prevNeighbor] - (Optional) The vertex's previous neighbor vertex
     * @param {Neighbor} [nextNeighbor] - (Optional) The vertex's next neighbor vertex
     * @param {PolygonCallback} [selectFn] - (Optional) A callback function to be called when the
     * vertex is selected
     * @param {PolygonCallback} [updateFn] - (Optional) A callback function to be called after the
     * vertex is moved
     */
    constructor(x, y, id, prevNeighbor, nextNeighbor, selectFn, updateFn) {
        this.#x = x;
        this.#y = y;
        this.#id = id;
        this.#selectFn = selectFn;
        this.#updateFn = updateFn;
        // Create the SVG element that represents this vertex
        this.#vtxElement = createSVGElement("circle", {
            ...Vertex.#vtxAttrs,
            id: id,
            cx: `${x}`,
            cy: `${y}`,
        });
        this.#vtxElement.classList.add("movable");
        // Pointerdown listener allows the vertex element to be pressed
        this.#vtxElement.addEventListener("pointerdown", (e) => {
            // Prevent the pointerdown event from triggering any other behaviors
            e.preventDefault();
            e.stopPropagation();
            // Pointermove listener allows the vertex element to be dragged
            window.addEventListener("pointermove", this.#handleDrag);
            // Pointerup listener removes the pointermove listener when the vertex element is released
            window.addEventListener("pointerup", () => {
                window.removeEventListener("pointermove", this.#handleDrag);
                // Make sure this doesn't break everything:
                requestAnimationFrame(() => {
                    // Update the oritentations of the vertex and its neighbors
                    this.updateNeighborhoodOrientation();
                    // Callback to update properties of parent polygon
                    if (this.#updateFn) {
                        this.#updateFn(this);
                    }
                });
            }, { once: true });
            // Callback to notify parent polygon of vertex selection
            if (this.#selectFn) {
                this.#selectFn(this);
            }
        });
        // Create the SVG element that represents the edge from this vertex to the next vertex
        this.#edgeElement = createSVGElement("line", {
            id: this.#id + id,
            x1: `${this.#x}`,
            y1: `${this.#y}`,
            x2: `${this.#x}`,
            y2: `${this.#y}`,
            stroke: "black",
        });
        // Silly double assignments to satisfy TypeScript's field initialization requirements while
        // still using logic in the setter blocks
        this.#prevNeighbor = this.prevNeighbor = prevNeighbor || this;
        this.#nextNeighbor = this.nextNeighbor = nextNeighbor || this;
        // Set the initial orientation of the vertex and update the orientations of its neighbors
        this.updateNeighborhoodOrientation();
    }
    /**
     * The vertex's x-coordinate
     */
    get x() {
        return this.#x;
    }
    set x(newX) {
        this.#x = newX;
        this.#vtxElement.setAttribute("cx", `${newX}`);
    }
    /**
     * The vertex's y-coordinate
     */
    get y() {
        return this.#y;
    }
    set y(newY) {
        this.#y = newY;
        this.#vtxElement.setAttribute("cy", `${newY}`);
    }
    /**
     * The SVG element representing the vertex
     */
    get vtxElement() {
        return this.#vtxElement;
    }
    /**
     * The SVG element representing the edge from the vertex to its next neighboring vertex
     */
    get edgeElement() {
        return this.#edgeElement;
    }
    /**
     * The vertex's id
     */
    get id() {
        return this.#id;
    }
    /**
     * True if the vertex is oriented clockwise, false otherwise
     */
    get clockwise() {
        return this.#clockwise;
    }
    /**
     * The vertex's previous neighboring vertex
     */
    get prevNeighbor() {
        return this.#prevNeighbor;
    }
    set prevNeighbor(neighbor) {
        this.#prevNeighbor = neighbor || this;
    }
    /**
     * The vertex's next neighboring vertex
     */
    get nextNeighbor() {
        return this.#nextNeighbor;
    }
    set nextNeighbor(neighbor) {
        neighbor = neighbor || this;
        this.#nextNeighbor = neighbor;
        this.#updateEdgeElement({
            id: this.#id + neighbor.#id,
            x2: `${neighbor.#x}`,
            y2: `${neighbor.#y}`,
        });
    }
    /**
     * Updates the clockwise property of this vertex and both of its neighboring vertices
     */
    updateNeighborhoodOrientation() {
        // Calling clockwise() with the one-argument overload does not work here. Possibly because of
        // DOM updates slowing down getter propagation?
        this.#clockwise = clockwise(this.#prevNeighbor, this, this.#nextNeighbor);
        this.#prevNeighbor.#clockwise = clockwise(this.#prevNeighbor.#prevNeighbor, this.#prevNeighbor, this);
        this.#nextNeighbor.#clockwise = clockwise(this, this.#nextNeighbor, this.#nextNeighbor.#nextNeighbor);
    }
    /**
     * Returns a string representation of the vertex
     *
     * @returns A string representation of the vertex
     */
    toString() {
        return `Vertex: {x: ${this.#x}, y: ${this.#y}, id: ${this.#id}}`;
    }
    /**
     * Updates the vertex's coordinates and associated SVG elements in response to pointermove events
     * @private
     *
     * @param {PointerEvent} e - The pointermove event triggering the function call
     */
    #handleDrag = (e) => {
        this.x += e.movementX;
        this.y += e.movementY;
        this.#updateEdgeElement({ x1: `${this.#x}`, y1: `${this.#y}` });
        if (this.#prevNeighbor !== this) {
            this.#prevNeighbor.#updateEdgeElement({ x2: `${this.#x}`, y2: `${this.#y}` });
        }
    };
    /**
     * Updates the attributes of the vertex's edge SVG element using entries in the given object
     * @private
     *
     * @param {Attributes} attrs - The object containing updated attributes for the SVG element
     */
    #updateEdgeElement(attrs) {
        for (const [attr, val] of Object.entries(attrs)) {
            this.#edgeElement.setAttribute(attr, val);
        }
    }
}
