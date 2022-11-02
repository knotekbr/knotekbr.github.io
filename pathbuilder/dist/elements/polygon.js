import Vertex from "./Vertex.js";
import uid from "../helpers/uid.js";
import createSVGElement from "../helpers/createSVGElement.js";
import intersects from "../helpers/intersects.js";
import MappedMinHeap from "../helpers/MappedMinHeap.js";
import EdgeRBT from "../helpers/EdgeRBT.js";
import pathify from "../helpers/pathify.js";
import slope from "../helpers/slope.js";
/**
 * Class representing a polygon
 */
export default class Polygon {
    // Basic vertex information
    #vertices = new Map(); // Vertex ID -> Vertex object
    #vertexCount = 0;
    // Additional vertex information for managing user interactions
    #firstVtx = undefined;
    #prevVtx = undefined;
    #selectedVtx = undefined;
    #leftmostVtx = undefined;
    // SVG container elements
    #container;
    #vertexGroup;
    #edgeGroup;
    #virtualEdgeGroup;
    // Memoized polygon properties
    #convex = false;
    #clockwise = false;
    #intersects = false;
    #testPoint;
    #vtxPQ;
    #visible = true;
    /**
     * Creates a new polygon
     *
     * @param {SVGSVGElement} container - The root SVG element containing this polygon
     */
    constructor(container) {
        // Store the root SVG container and create SVG groups for vertex and edge elements
        this.#container = container;
        this.#vertexGroup = createSVGElement("g", { id: "path-vtx" });
        this.#edgeGroup = createSVGElement("g", { id: "path-edge" });
        this.#virtualEdgeGroup = createSVGElement("g", { id: "path-virtual-edge" });
        // Append the group elements to the root container
        this.#container.appendChild(this.#virtualEdgeGroup);
        this.#container.appendChild(this.#edgeGroup);
        this.#container.appendChild(this.#vertexGroup);
        // Pointerdown listener allows new vertices to be created by clicking container white space
        this.#container.addEventListener("pointerdown", (e) => {
            if (this.#visible) {
                this.selectVertex();
                this.addVertex(e.clientX, e.clientY);
            }
        });
        // Create an SVG element to represent the test point and append it to the root container
        this.#testPoint = new Vertex(container.clientWidth / 2, container.clientHeight / 2, "test-point");
        this.#container.appendChild(this.#testPoint.vtxElement);
        this.#vtxPQ = new MappedMinHeap((value) => value.id, (value) => value.x);
    }
    /**
     * True if the polygon has at least 3 vertices and does not intersect itself, false otherwise
     */
    get valid() {
        return !this.#intersects && this.#vertexCount >= 3;
    }
    get properties() {
        return {
            convex: this.#convex,
            clockwise: this.#clockwise,
            intersects: this.#intersects,
            contains: this.containsPoint(),
            heapStr: this.#vtxPQ.toString(),
        };
    }
    get visible() {
        return this.#visible;
    }
    /**
     * Generator function allows for...of iteration through the polygon's edges, represented as
     * arrays of vertices. Returned arrays always have length 'edgesPerYield + 1'.
     * @generator
     *
     * @param {number} [edgesPerYield = 1] - (Optional) The number of edges to be returned with each
     * iteration. Default is 1
     * @param {Vertex} [fromVtx] - (Optional) The vertex to start iterating from
     * @param {Vertex} [toVtx] - (Optional) The vertex to stop iterating at. With 'edgesPerYield' > 1,
     * vertices beyond this point will be returned. However, iteration will stop before yielding an
     * array of vertices that starts at this vertex
     * @yields An array of vertices with length 'edgesPerYield + 1'
     * @returns Undefined when iteration is complete, or when there are no edges to iterate through
     */
    *edges(edgesPerYield = 1, fromVtx, toVtx) {
        if (!this.#firstVtx) {
            return undefined;
        }
        // If not provided, 'fromVtx' and 'toVtx' default to the first vertex in the polygon
        fromVtx = fromVtx || this.#firstVtx;
        toVtx = toVtx || fromVtx;
        // The first vertex to include in a given yield
        let currVtx = fromVtx;
        do {
            let edgesToYield = [];
            let vtxToAdd = currVtx;
            // Starting with 'currVtx', add 'edgesPerYield + 1' vertices to the yield array
            for (let i = 0; i < edgesPerYield + 1; i++) {
                edgesToYield.push(vtxToAdd);
                vtxToAdd = vtxToAdd.nextNeighbor;
            }
            // Increment 'currVtx' and yield the vertex array for this iteration
            currVtx = currVtx.nextNeighbor;
            yield edgesToYield;
        } while (currVtx.id !== toVtx.id);
        return undefined;
    }
    /**
     * Creates a new vertex at the given coordinates and adds it to the polygon
     *
     * @param {number} x - The x-coordinate of the new vertex
     * @param {number} y - The y-coordinate of the new vertex
     */
    addVertex = (x, y) => {
        // Create an id string for the new vertex and ensure that it's not already in use (unlikely, but
        // possible)
        let id;
        do {
            id = uid();
        } while (this.#vertices.has(id));
        const vtx = new Vertex(x, y, id, this.#prevVtx, this.#firstVtx, this.selectVertex, this.updateProperties);
        if (this.#firstVtx) {
            // If a first vertex exists, the new vertex becomes its previous neighbor. This ensures that
            // we always close the polygon
            this.#firstVtx.prevNeighbor = vtx;
        }
        else {
            // If no first vertex exists, the new vertex becomes the first vertex
            this.#firstVtx = vtx;
        }
        if (this.#prevVtx) {
            // If a previous vertex exists, the new vertex becomes its next neighbor
            this.#prevVtx.nextNeighbor = vtx;
        }
        this.#prevVtx = vtx;
        // Add the new vertex to the vertex map, and append its SVG elements to the correct SVG groups
        this.#vertices.set(id, vtx);
        this.#vtxPQ.insert(vtx, vtx.y);
        this.#vertexGroup.appendChild(vtx.vtxElement);
        this.#edgeGroup.appendChild(vtx.edgeElement);
        this.#vertexCount++;
        this.updateProperties(vtx);
    };
    /**
     * Removes the vertex with the given id from the polygon
     * @unimplemented
     *
     * @param {string} id - The id of the polygon to be removed
     */
    removeVertex = (id) => { };
    /**
     * If a vertex is given, stores a reference to it and changes its appearance. If no vertex is
     * given, deselects the currently-selected vertex
     *
     * @param {Vertex} [vtx] - The vertex being selected
     */
    selectVertex = (vtx) => {
        // If there is already a selected vertex, remove the 'selected' class from its SVG element
        this.#selectedVtx?.vtxElement.classList.remove("selected");
        if (vtx) {
            // If a vertex was given, remember it and add the 'selected' class to its SVG element
            this.#selectedVtx = vtx;
            vtx.vtxElement.classList.add("selected");
        }
        else {
            // If no vertex was given, remove the reference to the selected vertex
            this.#selectedVtx = undefined;
        }
    };
    /**
     * Updates the polygon's memoized properties in response to vertex additions and modifications.
     * This reduces the computational load of heavier operations such as path generation
     *
     * @param {Vertex} vtx - The vertex that was modified
     */
    updateProperties = (vtx) => {
        this.#vtxPQ.updateIdentifiers(vtx, vtx.y);
        this.#updateOrientation(vtx);
        this.#updateConvex();
        this.#updateIntersects();
    };
    /**
     * Returns true if the point with the given coordinates is contained within the polygon, and false
     * otherwise. The coordinates of the test point are used by default
     *
     * @param {Object} [point] - (Optional) The point being tested. Default is the test point
     * @param {number} point.x - The point's x-coordinate
     * @param {number} point.y - The point's y-coordinate
     * @returns True if the given point is within the polygon, false otherwise
     */
    containsPoint(point = this.#testPoint) {
        // Short circuit; the point cannot lie within a polygon with fewer than 3 sides
        if (!this.#firstVtx || this.#vertexCount < 3) {
            return false;
        }
        let result = false;
        // For each edge of the polygon, we check if a horizontal ray originating from the test point
        // intersects the edge. Based on the even-odd rule, the result is flipped for each intersection
        for (const [vtxOne, vtxTwo] of this.edges()) {
            // If both endpoints of the current edge are above or below the test point, we can skip the
            // heavier intersection check
            if (!(vtxOne.y < point.y && vtxTwo.y < point.y) &&
                !(vtxOne.y > point.y && vtxTwo.y > point.y)) {
                // Find the x-coordinate of the point on the current edge that has the same y-coordinate as
                // the test point
                const testX = vtxOne.x + (vtxTwo.x - vtxOne.x) * ((point.y - vtxOne.y) / (vtxTwo.y - vtxOne.y));
                // If the test point's x-coordinate is greater than the calculated x-coordinate, then the
                // ray cast horizontally from the test point to the y-axis intersects the current edge
                if (point.x > testX) {
                    result = !result;
                }
            }
        }
        return result;
    }
    reset() {
        this.#vertices.clear();
        this.#vertexCount = 0;
        this.#firstVtx = this.#prevVtx = this.#selectedVtx = this.#leftmostVtx = undefined;
        this.#vertexGroup.innerHTML = "";
        this.#edgeGroup.innerHTML = "";
        this.#virtualEdgeGroup.innerHTML = "";
        this.#convex = this.#clockwise = this.#intersects = false;
        this.#vtxPQ.clear();
    }
    clearPath() {
        this.#virtualEdgeGroup.innerHTML = "";
    }
    toggleVisibility() {
        let newMessage;
        if (this.#visible) {
            this.#vertexGroup.style.display = "none";
            this.#edgeGroup.style.display = "none";
            newMessage = "Show Polygon";
        }
        else {
            this.#vertexGroup.style.display = "";
            this.#edgeGroup.style.display = "";
            newMessage = "Hide Polygon";
        }
        this.#visible = !this.#visible;
        return newMessage;
    }
    planeSweep(showPath = false) {
        // Copy of the priority queue holding vertices sorted by x-coordinate
        const pq = new MappedMinHeap(this.#vtxPQ);
        // Modified red black tree to hold edges as they're encountered
        const edgeTree = new EdgeRBT(({ from, to }, coord) => from.y + (to.y - from.y) * ((coord - from.x) / (to.x - from.x)));
        // Array of objects containing info for drawing SVG elements after the algorithm completes
        const lineCoords = [];
        const edgeEvents = [];
        // The x-coordinate of the previous plane sweep event is stored to help deal with vertical edges
        let prevX = Number.MIN_SAFE_INTEGER;
        // Position and step size of the secondary sweep line that generates evenly-spaced vertical
        // lines
        let pos = pq.getMin().x;
        let step = 10;
        // If planeSweep() has already been called, this removes the existing SVG elements
        this.#virtualEdgeGroup.innerHTML = "";
        // For each vertex in the priority queue
        while (pq.size > 0) {
            console.groupCollapsed(`Plane Sweep (${pq.size} vertices remain)`);
            let currVtx = pq.removeMin();
            // currVtx2 can change if vertical edges are encountered. This allows us to only consider the
            // edges at the top and bottom of a vertical stretch even though they don't share an endpoint
            let currVtx2 = currVtx;
            let prevVtx = currVtx.prevNeighbor;
            let nextVtx = currVtx.nextNeighbor;
            let prevEdgeID = `${prevVtx.id}${currVtx.id}`;
            let nextEdgeID = `${currVtx.id}${nextVtx.id}`;
            console.log("Checking if trailing sweep needs to be stepped...");
            while (pos < currVtx.x) {
                console.log("Trailing sweep step");
                // Store the x-coordinate and all y-coordinates of the vertical lines present at this sweep
                // line position. Y-coordinates are ordered bottom-to-top via infix tree traversal
                lineCoords.push({ primary: pos, cross: edgeTree.getCoordinateArray(pos) });
                pos += step;
            }
            if (pos > currVtx.x && currVtx.clockwise != this.#clockwise && currVtx.x != prevX) {
                lineCoords.push({ primary: currVtx.x, cross: edgeTree.getCoordinateArray(currVtx.x) });
            }
            console.log("Done stepping trailing sweep");
            console.log("Checking for verticality...");
            if (prevVtx.x == currVtx.x || nextVtx.x == currVtx.x) {
                // If the current vertex is aligned vertically relative to one of its neighbors
                if (currVtx.x == prevX) {
                    // If another vertex in this vertical stretch has already been handled, skip this vertex
                    console.log("Verticality already handled, continuing...");
                    console.groupEnd();
                    continue;
                }
                if (nextVtx.x == currVtx.x) {
                    console.log("Stepping nextVtx forward");
                    // If 'nextVtx' is in the vertical stretch, update it to be the next non-vertical vertex
                    // in the polygon chain
                    while (nextVtx.x == currVtx.x) {
                        nextVtx = nextVtx.nextNeighbor;
                    }
                    // 'currVtx2' becomes the last vertex in the vertical stretch
                    currVtx2 = nextVtx.prevNeighbor;
                    nextEdgeID = `${currVtx2.id}${nextVtx.id}`;
                }
                if (prevVtx.x == currVtx2.x) {
                    console.log("Stepping prevVtx backward");
                    // If 'prevVtx' is in the vertical stretch, update it to be the previous non-vertical
                    // vertex in the polygon chain
                    while (prevVtx.x == currVtx.x) {
                        prevVtx = prevVtx.prevNeighbor;
                    }
                    // 'currVtx' becomes the first vertex in the vertical stretch
                    currVtx = prevVtx.nextNeighbor;
                    prevEdgeID = `${prevVtx.id}${currVtx.id}`;
                }
            }
            // Handle plane sweep events
            if (prevVtx.x > currVtx.x && nextVtx.x > currVtx.x) {
                // If both neighboring edges lie ahead of the sweep line, they are both added to the edge
                // tree
                console.log("Inserting both edges");
                edgeTree.insert(prevEdgeID, { from: prevVtx, to: currVtx }, currVtx.x, slope(prevVtx, currVtx));
                edgeTree.insert(nextEdgeID, { from: currVtx2, to: nextVtx }, currVtx2.x, slope(currVtx2, nextVtx));
                edgeEvents.push({
                    type: currVtx.clockwise == this.#clockwise ? "start" : "split",
                    primary: currVtx.x,
                    cross: (currVtx.y + currVtx2.y) / 2,
                });
            }
            else if (prevVtx.x > currVtx.x) {
                // If only the previous edge lies ahead of the sweep line, the edge tree is updated to
                // replace the next edge with the previous edge
                console.log("Replacing next edge with prev edge");
                edgeTree.replace(nextEdgeID, prevEdgeID, { from: prevVtx, to: currVtx }, slope(prevVtx, currVtx));
            }
            else if (nextVtx.x > currVtx.x) {
                // If only the next edge lies ahead of the sweep line, the edge tree is updated to replace
                // the previous edge with the next edge
                console.log("Replacing prev edge with next edge");
                edgeTree.replace(prevEdgeID, nextEdgeID, { from: currVtx2, to: nextVtx }, slope(currVtx2, nextVtx));
            }
            else {
                // If both neighboring edges lie behind the sweep line, they are both removed from the edge
                // tree
                console.log("Deleting both edges");
                edgeTree.delete(prevEdgeID);
                edgeTree.delete(nextEdgeID);
                edgeEvents.push({
                    type: currVtx.clockwise == this.#clockwise ? "end" : "merge",
                    primary: currVtx.x,
                    cross: (currVtx.y + currVtx2.y) / 2,
                });
            }
            prevX = currVtx.x;
            console.groupEnd();
        }
        console.log("Plane sweep complete");
        if (showPath) {
            const testPath = pathify(edgeEvents, lineCoords);
            let polyStr = `${this.#testPoint.x},${this.#testPoint.y} `;
            for (const { x, y } of testPath) {
                polyStr += `${x},${y} `;
            }
            polyStr.slice(0, -1);
            /*
            this.#virtualEdgeGroup.appendChild(
              createSVGElement("circle", {
                cx: `${testPath[0].x}`,
                cy: `${testPath[0].y}`,
                r: "5",
                fill: "red",
              })
            );
            */
            this.#virtualEdgeGroup.appendChild(createSVGElement("polygon", {
                points: polyStr,
                fill: "none",
                stroke: "red",
                "stroke-width": "2",
            }));
        }
        else {
            const startColors = ["red", "orange", "yellow", "green", "blue", "purple", "pink"];
            // Create all the SVG elements to represent the vertical lines generated by the plane sweep
            for (const { primary, cross } of lineCoords) {
                for (let i = 0; i < cross.length; i += 2) {
                    const svgStart = createSVGElement("polygon", {
                        points: `${primary - 4},${cross[i] - 8} ${primary + 4},${cross[i] - 8} ${primary},${cross[i]}`,
                        r: "5",
                        fill: startColors[(i / 2) % startColors.length],
                    });
                    const svgLine = createSVGElement("line", {
                        x1: `${primary}`,
                        y1: `${cross[i]}`,
                        x2: `${primary}`,
                        y2: `${cross[i + 1]}`,
                        stroke: startColors[(i / 2) % startColors.length],
                    });
                    this.#virtualEdgeGroup.appendChild(svgStart);
                    this.#virtualEdgeGroup.appendChild(svgLine);
                }
            }
        }
    }
    /**
     * Update the polygon's convex property
     * @private
     */
    #updateConvex() {
        // Check the clockwise property of each vertex in the polygon
        for (const vtx of this.#vertices.values()) {
            if (vtx.clockwise !== this.#clockwise) {
                // If the current vertex's clockwise property does not match the polygon's clockwise
                // property, then the polygon is not convex
                this.#convex = false;
                return;
            }
        }
        this.#convex = true;
    }
    /**
     * Updates the polygon's self-intersection property
     * @private
     */
    #updateIntersects() {
        if (!this.#firstVtx || this.#vertexCount < 4) {
            this.#intersects = false;
            return;
        }
        /**
         * This is a gross brute force solution. There are much nicer solutions to this problem that
         * will scale well for complex polygons. See the Bentley-Ottmann algorithm
         */
        for (const [vtxOne, vtxTwo] of this.edges()) {
            for (const [vtxThree, vtxFour] of this.edges(1, vtxTwo.nextNeighbor, vtxOne.prevNeighbor)) {
                if (intersects(vtxOne, vtxTwo, vtxThree, vtxFour)) {
                    this.#intersects = true;
                    return;
                }
            }
        }
        this.#intersects = false;
    }
    /**
     * Updates the polygon's clockwise property in response to the creation or modification of the
     * given vertex
     * @private
     *
     * @param {Vertex} vtx - The vertex that was created or modified
     */
    #updateOrientation(vtx) {
        if (!this.#leftmostVtx || vtx.x < this.#leftmostVtx.x) {
            // There is no current leftmost vertex, or the given vertex is to the left of the current
            // leftmost vertex. Update the leftmost vertex
            this.#leftmostVtx = vtx;
        }
        else if (vtx.id === this.#leftmostVtx.id) {
            // The given vertex was the leftmost vertex. Check if this is still true
            this.#updateLeftmostVertex();
        }
        this.#clockwise = this.#leftmostVtx.clockwise;
    }
    /**
     * Updates the polygon's leftmost vertex
     * @private
     */
    #updateLeftmostVertex() {
        // Private function, should never be called in a state where 'this.#leftmostVtx' is undefined
        let leftmostVtx = this.#leftmostVtx;
        // Iterate through all of the polygon's vertices to find the one with the lowest x-coordinate
        for (const vtx of this.#vertices.values()) {
            if (vtx.x < leftmostVtx.x) {
                leftmostVtx = vtx;
            }
        }
        this.#leftmostVtx = leftmostVtx;
    }
}
