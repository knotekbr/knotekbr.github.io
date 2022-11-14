import { distance, slope } from "../helpers/index.js";
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
    #waypointAdj;
    #openWaypoints;
    #lastQueuedTop;
    #lastQueuedBot;
    constructor(id, bottomEdge, topEdge, borders) {
        this.#id = id;
        this.#size = 0;
        this.#path = [];
        this.#pathDistance = 0;
        this.#waypoints = [];
        this.#namedWaypoints = new Map();
        this.#waypointAdj = [];
        this.#waypointQueue = [];
        this.#openWaypoints = [];
        if (bottomEdge && topEdge) {
            this.#bottomEdges = [bottomEdge];
            this.#topEdges = [topEdge];
            this.#size = 2;
            this.#waypoints.push(bottomEdge.from);
            this.#openWaypoints.push({
                idx: 0,
                minSlope: slope(bottomEdge.from, bottomEdge.to),
                maxSlope: slope(bottomEdge.from, topEdge.to),
            });
            this.#waypointAdj.push([]);
            this.#namedWaypoints.set("start", 0);
            if (borders) {
                this.#namedWaypoints.set(`r_${borders.id}_0`, 0);
                if (borders.side === 1 /* EdgeSide.TOP */) {
                    this.#lastQueuedTop = {
                        side: borders.side,
                        waypoint: topEdge.to,
                        name: `r_${borders.id}_1`,
                        slope: Number.MAX_SAFE_INTEGER,
                        needsSlope: true,
                    };
                    this.#waypointQueue.push(this.#lastQueuedTop);
                }
                else {
                    this.#lastQueuedBot = {
                        side: borders.side,
                        waypoint: bottomEdge.to,
                        name: `r_${borders.id}_1`,
                        slope: Number.MIN_SAFE_INTEGER,
                        needsSlope: true,
                    };
                    this.#waypointQueue.push(this.#lastQueuedBot);
                }
            }
        }
        else {
            this.#bottomEdges = [];
            this.#topEdges = [];
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
        for (const list of this.#waypointAdj) {
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
            if (side === 1 /* EdgeSide.TOP */) {
                this.#topEdges.push(edge);
                if (this.#lastQueuedTop?.needsSlope === true) {
                    this.#lastQueuedTop.slope = slope(edge.from, edge.to);
                    this.#lastQueuedTop.needsSlope = false;
                }
            }
            else {
                this.#bottomEdges.push(edge);
                if (this.#lastQueuedBot?.needsSlope === true) {
                    this.#lastQueuedBot.slope = slope(edge.from, edge.to);
                    this.#lastQueuedBot.needsSlope = false;
                }
            }
            if (edge.fromReflex || borders !== undefined) {
                this.#addWaypoint(edge.from, side, slope(edge.from, edge.to), fromName);
            }
            if (edge.toReflex || borders !== undefined) {
                let newQueuedPoint;
                if (this.#waypointQueue.length == 0 ||
                    this.#waypointQueue.at(-1).waypoint.x <= edge.to.x) {
                    newQueuedPoint = {
                        waypoint: edge.to,
                        name: toName,
                        side,
                        slope: side === 1 /* EdgeSide.TOP */ ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER,
                        needsSlope: true,
                    };
                    this.#waypointQueue.push(newQueuedPoint);
                }
                else {
                    let i = 0;
                    newQueuedPoint = {
                        waypoint: edge.to,
                        name: toName,
                        side,
                        slope: side === 1 /* EdgeSide.TOP */ ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER,
                        needsSlope: true,
                    };
                    while (this.#waypointQueue[i].waypoint.x <= edge.to.x) {
                        i++;
                    }
                    this.#waypointQueue.splice(i, 0, newQueuedPoint);
                }
                if (side === 1 /* EdgeSide.TOP */) {
                    this.#lastQueuedTop = newQueuedPoint;
                }
                else {
                    this.#lastQueuedBot = newQueuedPoint;
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
    #addWaypoint(waypoint, side, initSlope, name) {
        while (this.#waypointQueue.length > 0 && this.#waypointQueue[0].waypoint.x <= waypoint.x) {
            const existing = this.#waypointQueue[0];
            this.#addWaypointHelper(existing.waypoint, existing.side, existing.slope, existing.name);
            this.#waypointQueue.shift();
        }
        this.#addWaypointHelper(waypoint, side, initSlope, name);
    }
    #addWaypointHelper(waypoint, side, initSlope, name) {
        if (waypoint.x === this.#waypoints.at(-1)?.x && waypoint.y === this.#waypoints.at(-1)?.y) {
            if (name && !this.#namedWaypoints.has(name)) {
                this.#namedWaypoints.set(name, this.#waypoints.length - 1);
            }
            return;
        }
        if (name) {
            this.#namedWaypoints.set(name, this.#waypoints.length);
        }
        this.#waypointAdj.push([]);
        for (let i = 0; i < this.#openWaypoints.length;) {
            const open = this.#openWaypoints[i];
            const newSlope = slope(this.#waypoints[open.idx], waypoint);
            if (newSlope >= open.minSlope && newSlope <= open.maxSlope) {
                this.#waypointAdj[open.idx].push(this.#waypoints.length);
                this.#waypointAdj[this.#waypoints.length].push(open.idx);
                if (side === 1 /* EdgeSide.TOP */) {
                    open.maxSlope = newSlope;
                }
                else {
                    open.minSlope = newSlope;
                }
                if (open.minSlope >= open.maxSlope) {
                    this.#openWaypoints.splice(i, 1);
                    continue;
                }
            }
            i++;
        }
        if (side === 1 /* EdgeSide.TOP */) {
            this.#openWaypoints.push({
                idx: this.#waypoints.length,
                minSlope: Number.MIN_SAFE_INTEGER,
                maxSlope: initSlope,
            });
        }
        else {
            this.#openWaypoints.push({
                idx: this.#waypoints.length,
                minSlope: initSlope,
                maxSlope: Number.MAX_SAFE_INTEGER,
            });
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
            this.#addWaypoint(end, 0 /* EdgeSide.BOTTOM */, 0, "end");
        }
        while (currX < end.x) {
            if (currBot.to.x < currTop.to.x) {
                nextX = currBot.to.x;
                nextType = 0 /* EdgeSide.BOTTOM */;
            }
            else if (currBot.to.x > currTop.to.x) {
                nextX = currTop.to.x;
                nextType = 1 /* EdgeSide.TOP */;
            }
            else {
                nextX = currTop.to.x;
                nextType = 2 /* EdgeSide.BOTH */;
            }
            while (currX < nextX) {
                insert(currX, currBot, currTop);
                currX += stepSize;
            }
            if (currX > nextX) {
                insert(nextX, currBot, currTop, nextType);
            }
            if (nextType === 0 /* EdgeSide.BOTTOM */ || nextType === 2 /* EdgeSide.BOTH */) {
                botIdx++;
                currBot = this.#bottomEdges[botIdx];
            }
            if (nextType === 1 /* EdgeSide.TOP */ || nextType === 2 /* EdgeSide.BOTH */) {
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
        function flipInsert(currX, bottomEdge, topEdge, passedType) {
            let bottomY = intersects(currX, bottomEdge);
            let topY = intersects(currX, topEdge);
            if (bottomY == topY) {
                context.#path.push({ x: currX, y: bottomY });
                return;
            }
            if (flip) {
                [bottomY, topY] = [topY, bottomY];
            }
            if (passedType !== undefined) {
                if (context.#path.length > 0) {
                    context.#pathDistance += distance(context.#path.at(-1), { x: currX, y: bottomY });
                }
                context.#path.push({ x: currX, y: bottomY });
            }
            else {
                if (context.#path.length > 0) {
                    context.#pathDistance += distance(context.#path.at(-1), { x: currX, y: bottomY });
                }
                context.#pathDistance += Math.abs(topY - bottomY);
                context.#path.push({ x: currX, y: bottomY }, { x: currX, y: topY });
                flip = !flip;
            }
        }
        return flipInsert;
    }
}
