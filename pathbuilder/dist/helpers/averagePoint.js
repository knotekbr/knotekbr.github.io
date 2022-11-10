export default function averagePoint(...points) {
    let xTotal = 0;
    let yTotal = 0;
    for (const point of points) {
        xTotal += point.x;
        yTotal += point.y;
    }
    return { x: xTotal / points.length, y: yTotal / points.length };
}
