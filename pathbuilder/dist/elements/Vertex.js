import createSVGElement from "../helpers/createSVGElement.js";
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
    // SVG elements associated with the vertex
    #vtxElement;
    #edgeElement;
    // Neighboring vertices
    #prevNeighbor;
    #nextNeighbor;
    /**
     * Creates a new vertex
     *
     * @param {number} x - The vertex's x-coordinate
     * @param {number} y - The vertex's y-coordinate
     * @param {string} id - The vertex's id
     * @param {Neighbor} prevNeighbor - The vertex's previous neighbor vertex
     * @param {Neighbor} nextNeighbor - The vertex's next neighbor vertex
     */
    constructor(x, y, id, prevNeighbor, nextNeighbor) {
        this.#x = x;
        this.#y = y;
        this.#id = id;
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
            }, { once: true });
            // Dispatch a custom event indicating that the vertex was selected
            const selectedEvent = new CustomEvent("vertexselected", { bubbles: true, detail: this.#id });
            this.#vtxElement.dispatchEvent(selectedEvent);
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
