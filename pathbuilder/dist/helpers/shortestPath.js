import MappedMinHeap from "./MappedMinHeap.js";
import distance from "./distance.js";
export default function shortestPath(region, startName, endNames) {
    const start = region.getWaypointIdx(startName);
    const ends = endNames.map((value) => region.getWaypointIdx(value));
    const waypoints = region.waypoints.map((value, index) => ({
        waypoint: value,
        idx: index,
        visited: false,
        distance: index !== start ? Number.MAX_SAFE_INTEGER : 0,
    }));
    const adj = region.waypointAdj;
    const minPQ = new MappedMinHeap((value) => value.idx, (value) => value.distance);
    const resultPath = [];
    let reachedEnd = -1;
    for (const waypoint of waypoints) {
        minPQ.insert(waypoint, waypoint.idx);
    }
    while (minPQ.size > 0) {
        const curr = minPQ.removeMin();
        curr.visited = true;
        for (let i = 0; i < ends.length; i++) {
            if (curr.idx === ends[i]) {
                reachedEnd = i;
                break;
            }
        }
        if (reachedEnd !== -1) {
            break;
        }
        for (const neighborIdx of adj[curr.idx]) {
            const neighbor = waypoints[neighborIdx];
            if (neighbor.visited) {
                continue;
            }
            const newDistance = curr.distance + distance(curr.waypoint, neighbor.waypoint);
            if (newDistance < neighbor.distance) {
                neighbor.distance = newDistance;
                neighbor.prev = curr.idx;
                minPQ.updateIdentifiers(neighbor, null);
            }
        }
    }
    if (reachedEnd === -1) {
        throw new Error("No path found");
    }
    resultPath.push(waypoints[ends[reachedEnd]].waypoint);
    for (let i = ends[reachedEnd]; i !== start && waypoints[i].prev !== undefined; i = waypoints[i].prev) {
        resultPath.splice(0, 0, waypoints[i].waypoint);
    }
    return {
        startName,
        endName: endNames[reachedEnd],
        path: resultPath,
        distance: waypoints[ends[reachedEnd]].distance,
    };
}
