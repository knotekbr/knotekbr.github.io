export default function distance(from, to) {
    return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
}
