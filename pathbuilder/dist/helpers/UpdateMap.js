export default class UpdateMap extends Map {
    update(oldKey, newKey) {
        if (!this.has(oldKey)) {
            return false;
        }
        this.set(newKey, this.get(oldKey));
        this.delete(oldKey);
        return true;
    }
}
