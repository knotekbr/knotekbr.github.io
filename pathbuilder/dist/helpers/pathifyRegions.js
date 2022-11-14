import shortestPath from "./shortestPath.js";
export default function pathifyRegions(regions, regionAdj) {
    const visited = regions.map(() => false);
    const instructions = [];
    const resultPath = [];
    let pathDistance = 0;
    let prevName = undefined;
    const addInstructions = (id, prev) => {
        regions[id].generatePath();
        visited[id] = true;
        instructions.push({ type: "cover", id });
        for (let i = regionAdj[id].length - 1; i >= 0; i--) {
            if (visited[regionAdj[id][i]]) {
                continue;
            }
            instructions.push({ type: "navigate", from: id, to: regionAdj[id][i] });
            addInstructions(regionAdj[id][i], id);
        }
        if (prev !== undefined) {
            instructions.push({ type: "navigate", from: id, to: prev });
        }
    };
    addInstructions(0);
    for (const instruction of instructions) {
        let currPath;
        if (instruction.type === "cover") {
            if (prevName !== undefined) {
                currPath = shortestPath(regions[instruction.id], prevName, ["start"]);
                resultPath.push(...currPath.path);
                pathDistance += currPath.distance;
            }
            resultPath.push(...regions[instruction.id].path);
            pathDistance += regions[instruction.id].pathDistance;
            prevName = "end";
        }
        else if (instruction.type === "navigate") {
            currPath = shortestPath(regions[instruction.from], prevName || "start", [
                `r_${instruction.to}_0`,
                `r_${instruction.to}_1`,
            ]);
            resultPath.push(...currPath.path);
            pathDistance += currPath.distance;
            if (currPath.endName.slice(-1) === "0") {
                prevName = `r_${instruction.from}_0`;
            }
            else {
                prevName = `r_${instruction.from}_1`;
            }
        }
    }
    resultPath.push(...shortestPath(regions[0], prevName || "start", ["start"]).path);
    return { path: resultPath, distance: pathDistance };
}
