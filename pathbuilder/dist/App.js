import Polygon from "./elements/polygon.js";
import createSVGElement from "./helpers/createSVGElement.js";
// Tool constants
const SELECT = 0;
const CREATE = 1;
const DELETE = 2;
export default class App {
    #polygon;
    #selectedTool = 0;
    constructor(root = document.body) {
        this.#polygon = new Polygon(this.#initSVG(root));
        this.#initUI();
    }
    #initSVG(root) {
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
        return svg;
    }
    #initUI() {
        const pathBtn = document.getElementById("path-btn");
        const clearPathBtn = document.getElementById("clear-path-btn");
        const showHideBtn = document.getElementById("show-hide-btn");
        const resetBtn = document.getElementById("reset-btn");
        pathBtn.addEventListener("pointerdown", () => {
            this.#polygon.planeSweep(true);
        });
        clearPathBtn.addEventListener("pointerdown", () => {
            this.#polygon.clearPath();
        });
        showHideBtn.addEventListener("pointerdown", () => {
            showHideBtn.innerText = this.#polygon.toggleVisibility();
        });
        resetBtn.addEventListener("pointerdown", () => {
            this.#polygon.reset();
            if (!this.#polygon.visible) {
                showHideBtn.innerText = this.#polygon.toggleVisibility();
            }
        });
    }
}
