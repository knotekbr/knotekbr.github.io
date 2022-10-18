import Vertex from "./Vertex.js";
import uid from "../helpers/uid.js";
import createSVGElement from "../helpers/createSVGElement.js";
import crossProductZ from "../helpers/crossProductZ.js";
import intersects from "../helpers/intersects.js";
export default class Polygon {
    #vertices = new Map();
    #vertexCount = 0;
    #container;
    #vertexGroup;
    #edgeGroup;
    #firstVtx = undefined;
    #prevVtx = undefined;
    #selectedVtx = undefined;
    #testPoint;
    constructor(container) {
        const vertexGroup = createSVGElement("g", { id: "path-vtx" });
        const edgeGroup = createSVGElement("g", { id: "path-edge" });
        this.#container = container;
        this.#vertexGroup = vertexGroup;
        this.#edgeGroup = edgeGroup;
        this.#container.appendChild(this.#edgeGroup);
        this.#container.appendChild(this.#vertexGroup);
        this.#container.addEventListener("pointerdown", (e) => {
            this.selectVertex();
            this.addVertex(e.clientX, e.clientY);
        });
        this.#container.addEventListener("vertexselected", this.selectVertex);
        this.#testPoint = new Vertex(container.clientWidth / 2, container.clientHeight / 2, "test-point", undefined, undefined);
        this.#container.appendChild(this.#testPoint.vtxElement);
    }
    get valid() {
        return this.#vertexCount >= 3;
    }
    addVertex = (x, y) => {
        const id = uid();
        const vtx = new Vertex(x, y, id, this.#prevVtx, this.#firstVtx);
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
        this.#vertices.set(id, vtx);
        this.#vertexGroup.appendChild(vtx.vtxElement);
        this.#edgeGroup.appendChild(vtx.edgeElement);
        this.#vertexCount++;
    };
    removeVertex = (id) => { };
    selectVertex = (e) => {
        document.querySelector(".selected")?.classList.remove("selected");
        if (!e || !(e instanceof CustomEvent)) {
            this.#selectedVtx = undefined;
        }
        else {
            this.#selectedVtx = this.#vertices.get(e.detail);
            this.#selectedVtx?.vtxElement.classList.add("selected");
        }
    };
    containsPoint(point = this.#testPoint) {
        if (!this.#firstVtx || this.#vertexCount < 3) {
            return false;
        }
        let vtxOne = this.#firstVtx;
        let vtxTwo = this.#firstVtx.nextNeighbor;
        let result = false;
        do {
            if (!(vtxOne.y < point.y && vtxTwo.y < point.y) &&
                !(vtxOne.y > point.y && vtxTwo.y > point.y)) {
                const testX = vtxOne.x + (vtxTwo.x - vtxOne.x) * ((point.y - vtxOne.y) / (vtxTwo.y - vtxOne.y));
                if (point.x > testX) {
                    result = !result;
                }
            }
            vtxOne = vtxTwo;
            vtxTwo = vtxTwo.nextNeighbor;
        } while (vtxOne.id !== this.#firstVtx.id);
        return result;
    }
    isConvex() {
        if (!this.#firstVtx) {
            return false;
        }
        else if (this.#vertexCount < 4) {
            return true;
        }
        let vtxOne = this.#firstVtx;
        let vtxTwo = vtxOne.nextNeighbor;
        let vtxThree = vtxTwo.nextNeighbor;
        const cpzIsPositive = crossProductZ(vtxOne, vtxTwo, vtxThree) > 0;
        do {
            const testPositive = crossProductZ(vtxOne, vtxTwo, vtxThree) > 0;
            if (testPositive !== cpzIsPositive) {
                return false;
            }
            vtxOne = vtxTwo;
            vtxTwo = vtxThree;
            vtxThree = vtxThree.nextNeighbor;
        } while (vtxOne.id !== this.#firstVtx.id);
        return true;
    }
    intersectsSelf() {
        /**
         * This is a gross brute force solution. There are much nicer solutions to this problem that
         * will scale well for complex polygons. See the Bentley-Ottmann algorithm
         */
        if (!this.#firstVtx || this.#vertexCount < 4) {
            return false;
        }
        let vtxOne = this.#firstVtx;
        let vtxTwo = vtxOne.nextNeighbor;
        do {
            for (let vtxThree = vtxTwo.nextNeighbor, vtxFour = vtxThree.nextNeighbor; vtxThree.id !== this.#firstVtx.id && vtxFour.id !== vtxOne.id; vtxThree = vtxFour, vtxFour = vtxFour.nextNeighbor) {
                console.log(`(${vtxOne.x}, ${vtxOne.y}), (${vtxTwo.x}, ${vtxTwo.y}), (${vtxThree.x}, ${vtxThree.y}), (${vtxFour.x}, ${vtxFour.y})`);
                if (intersects(vtxOne, vtxTwo, vtxThree, vtxFour)) {
                    return true;
                }
            }
            vtxOne = vtxTwo;
            vtxTwo = vtxTwo.nextNeighbor;
        } while (vtxOne.id !== this.#firstVtx.id);
        return false;
    }
}
