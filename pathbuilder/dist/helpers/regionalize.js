import Region from "../elements/Region2.js";
export default function regionalize(events, lines) {
    const regions = [];
    const currRegions = [];
    let regionCount = 0;
    let prevEvent = {
        type: "end",
        primary: Number.MIN_SAFE_INTEGER,
        cross: Number.MIN_SAFE_INTEGER,
    };
    for (let i = 0, j = 0; i < events.length; i++) {
        const currEvent = events[i];
        const newRegions = [];
        let lookAhead = i;
        while (lookAhead < events.length && events[lookAhead].primary === currEvent.primary) {
            newRegions.push(new Region(events[lookAhead].cross));
            i++;
            lookAhead++;
        }
        if (currEvent.type === "start") {
        }
        else {
        }
    }
}
