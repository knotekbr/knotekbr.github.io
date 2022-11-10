import distance from "../helpers/distance.js";
const BOTTOM = 0;
const TOP = 1;
const BOTH = 2;
const START = 3;
export default class Region {
    #id;
    #size;
    #topEdges;
    #bottomEdges;
    #path;
    #pathDistance;
    #waypoints;
    #waypointQueue;
    #namedWaypoints;
    #waypointAjd;
    #prevBot;
    #prevTop;
    constructor(id, bottomEdge, topEdge, borders) {
        this.#id = id;
        this.#size = 0;
        this.#path = [];
        this.#pathDistance = 0;
        this.#waypoints = [];
        this.#namedWaypoints = new Map();
        this.#waypointAjd = [];
        this.#waypointQueue = [];
        if (bottomEdge && topEdge) {
            this.#bottomEdges = [bottomEdge];
            this.#topEdges = [topEdge];
            this.#size = 2;
            this.#waypoints.push(bottomEdge.from);
            this.#waypointAjd.push([]);
            this.#namedWaypoints.set("start", 0);
            this.#prevBot = { waypoint: true, idx: 0 };
            this.#prevTop = { waypoint: true, idx: 0 };
            if (borders) {
                this.#namedWaypoints.set(`r_${borders.id}_0`, 0);
                if (borders.side) {
                    this.#waypointQueue.push({
                        side: borders.side,
                        waypoint: topEdge.to,
                        name: `r_${borders.id}_1`,
                    });
                }
                else {
                    this.#waypointQueue.push({
                        side: borders.side,
                        waypoint: bottomEdge.to,
                        name: `r_${borders.id}_1`,
                    });
                }
            }
        }
        else {
            this.#bottomEdges = [];
            this.#topEdges = [];
            this.#prevBot = { waypoint: false, idx: 0 };
            this.#prevTop = { waypoint: false, idx: 0 };
        }
    }
    get id() {
        return this.#id;
    }
    get perimeter() {
        const points = [this.#bottomEdges[0].from];
        for (const edge of this.#bottomEdges) {
            points.push(edge.to);
        }
        for (const edge of this.#topEdges.slice(0, -1).reverse()) {
            points.push(edge.to);
        }
        return points;
    }
    get waypoints() {
        return [...this.#waypoints];
    }
    get waypointAdj() {
        const result = [];
        for (const list of this.#waypointAjd) {
            result.push([...list]);
        }
        return result;
    }
    get path() {
        return this.#path;
    }
    get pathDistance() {
        return this.#pathDistance;
    }
    addEdges(...edges) {
        for (const { edge, side, borders } of edges) {
            let fromName = undefined;
            let toName = undefined;
            if (borders !== undefined) {
                fromName = `r_${borders}_0`;
                toName = `r_${borders}_1`;
            }
            if (side) {
                this.#topEdges.push(edge);
            }
            else {
                this.#bottomEdges.push(edge);
            }
            if (edge.fromReflex || borders !== undefined) {
                this.#addWaypoint(edge.from, side, fromName);
            }
            if (edge.toReflex || borders !== undefined) {
                if (this.#waypointQueue.length == 0 ||
                    this.#waypointQueue.at(-1).waypoint.x <= edge.to.x) {
                    this.#waypointQueue.push({ waypoint: edge.to, name: toName, side });
                }
                else {
                    let i = 0;
                    while (this.#waypointQueue[i].waypoint.x <= edge.to.x) {
                        i++;
                    }
                    this.#waypointQueue.splice(i, 0, { waypoint: edge.to, name: toName, side });
                }
            }
            this.#size++;
        }
    }
    popEdge(edge) {
        let checkEdge = this.#bottomEdges.at(-1);
        if (checkEdge && checkEdge.to.x == edge.to.x && checkEdge.to.y == edge.to.y) {
            this.#size--;
            return this.#bottomEdges.pop();
        }
        checkEdge = this.#topEdges.at(-1);
        if (checkEdge && checkEdge.to.x == edge.to.x && checkEdge.to.y == edge.to.y) {
            this.#size--;
            return this.#topEdges.pop();
        }
        return undefined;
    }
    getWaypointIdx(name) {
        const idx = this.#namedWaypoints.get(name);
        if (idx === undefined) {
            throw new Error(`${name} is not a waypoint in region ${this.#id}`);
        }
        return idx;
    }
    #addWaypoint(waypoint, side, name) {
        while (this.#waypointQueue.length > 0 && this.#waypointQueue[0].waypoint.x <= waypoint.x) {
            const existing = this.#waypointQueue[0];
            this.#addWaypointHelper(existing.waypoint, existing.side, existing.name);
            this.#waypointQueue.shift();
        }
        this.#addWaypointHelper(waypoint, side, name);
    }
    #addWaypointHelper(waypoint, side, name) {
        if (name) {
            this.#namedWaypoints.set(name, this.#waypoints.length);
        }
        this.#waypointAjd.push([this.#waypoints.length - 1]);
        this.#waypointAjd[this.#waypoints.length - 1].push(this.#waypoints.length);
        if (side) {
            if (this.#prevTop.waypoint && this.#prevTop.idx !== this.#waypoints.length - 1) {
                this.#waypointAjd[this.#prevTop.idx].push(this.#waypoints.length);
                this.#waypointAjd[this.#waypoints.length].push(this.#prevTop.idx);
            }
            this.#prevTop = { waypoint: true, idx: this.#waypoints.length };
        }
        else {
            if (this.#prevBot.waypoint && this.#prevBot.idx !== this.#waypoints.length - 1) {
                this.#waypointAjd[this.#prevBot.idx].push(this.#waypoints.length);
                this.#waypointAjd[this.#waypoints.length].push(this.#prevBot.idx);
            }
            this.#prevBot = { waypoint: true, idx: this.#waypoints.length };
        }
        this.#waypoints.push(waypoint);
    }
    generatePath(stepSize = 20) {
        if (this.#size < 3 || this.#bottomEdges.length == 0 || this.#topEdges.length == 0) {
            throw new Error("Invalid region, unable to generate path");
        }
        const insert = this.#pathInserter();
        const end = this.#bottomEdges.at(-1).to;
        let botIdx = 0;
        let topIdx = 0;
        let currBot = this.#bottomEdges[botIdx];
        let currTop = this.#topEdges[topIdx];
        let currX = this.#bottomEdges[0].from.x;
        let nextX = Number.MIN_SAFE_INTEGER;
        let nextType;
        this.#path = [];
        this.#pathDistance = 0;
        if (!this.#namedWaypoints.has("end")) {
            this.#addWaypoint(end, false, "end");
        }
        while (currX < end.x) {
            if (currBot.to.x < currTop.to.x) {
                nextX = currBot.to.x;
                nextType = BOTTOM;
            }
            else if (currBot.to.x > currTop.to.x) {
                nextX = currTop.to.x;
                nextType = TOP;
            }
            else {
                nextX = currTop.to.x;
                nextType = BOTH;
            }
            while (currX < nextX) {
                insert(currX, currBot, currTop);
                currX += stepSize;
            }
            currX = currX > nextX ? nextX : currX;
            if (nextType === BOTTOM || nextType === BOTH) {
                botIdx++;
                currBot = this.#bottomEdges[botIdx];
            }
            if (nextType === TOP || nextType === BOTH) {
                topIdx++;
                currTop = this.#topEdges[topIdx];
            }
        }
        this.#path.push(end);
    }
    #pathInserter() {
        const context = this;
        const intersects = (at, { from, to }) => from.y + (to.y - from.y) * ((at - from.x) / (to.x - from.x));
        let flip = false;
        function flipInsert(currX, bottomEdge, topEdge) {
            let bottomY = intersects(currX, bottomEdge);
            let topY = intersects(currX, topEdge);
            context.#pathDistance += topY - bottomY;
            if (bottomY == topY) {
                context.#path.push({ x: currX, y: bottomY });
                return;
            }
            if (flip) {
                [bottomY, topY] = [topY, bottomY];
            }
            if (context.#path.length > 0) {
                context.#pathDistance += distance(context.#path.at(-1), { x: currX, y: bottomY });
            }
            context.#path.push({ x: currX, y: bottomY }, { x: currX, y: topY });
            flip = !flip;
        }
        return flipInsert;
    }
}
