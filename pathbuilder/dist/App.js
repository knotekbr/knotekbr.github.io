import Polygon from "./elements/polygon.js";
import createSVGElement from "./helpers/createSVGElement.js";
export default class App {
    #polygon;
    constructor(root = document.body) {
        const rootWidth = root.clientWidth;
        const rootHeight = root.clientHeight;
        const svg = createSVGElement("svg", {
            id: "path-container",
            viewBox: `0 0 ${rootWidth} ${rootHeight}`,
            width: `${rootWidth}px`,
            height: `${rootHeight}px`,
        });
        const stylesLink = document.createElement("link");
        stylesLink.setAttribute("rel", "stylesheet");
        stylesLink.setAttribute("type", "text/css");
        stylesLink.setAttribute("href", "static/svg.css");
        svg.appendChild(stylesLink);
        root.appendChild(svg);
        this.#polygon = new Polygon(svg);
        const testBtn = document.getElementById("test-btn") || document.createElement("span");
        const containsRes = document.getElementById("contains-res") || document.createElement("span");
        const convexRes = document.getElementById("convex-res") || document.createElement("span");
        const intersectsRes = document.getElementById("intersects-res") || document.createElement("span");
        testBtn.addEventListener("pointerdown", () => {
            if (this.#polygon.containsPoint()) {
                containsRes.innerText = "Inside";
            }
            else {
                containsRes.innerText = "Outside";
            }
            if (this.#polygon.isConvex()) {
                convexRes.innerText = "True";
            }
            else {
                convexRes.innerText = "False";
            }
            if (this.#polygon.intersectsSelf()) {
                intersectsRes.innerText = "True";
            }
            else {
                intersectsRes.innerText = "False";
            }
        });
    }
}
