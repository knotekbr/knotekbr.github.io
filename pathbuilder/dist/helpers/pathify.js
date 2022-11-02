export default function pathify(events, lines) {
    let expandedLines = [];
    let flattenedLines = [];
    let linesIdx = 0;
    let linesEntry = lines[linesIdx];
    let flip = 0;
    for (const event of events) {
        while (linesIdx < lines.length && linesEntry.primary < event.primary) {
            for (let i = 0; i < linesEntry.cross.length; i += 2) {
                expandedLines[i] = expandedLines[i] || [];
                expandedLines[i].push({ x: linesEntry.primary, y: linesEntry.cross[i + flip] }, { x: linesEntry.primary, y: linesEntry.cross[i + 1 - flip] });
                flip = 1 - flip;
            }
            linesIdx++;
            linesEntry = lines[linesIdx];
        }
        flattenedLines = [...flattenedLines, ...expandedLines.flat()];
        expandedLines = [];
    }
    return flattenedLines;
}
