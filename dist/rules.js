/* Browser-local rules. Also exercised by the dependency-free Node tests. */
(() => {
  "use strict";
  const kinds = Object.freeze([
    "bear",
    "duck",
    "panda",
    "bunny",
    "cat",
    "dino",
  ]);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function layout(height) {
    return kinds.map((kind, id) => ({
      id,
      kind,
      x: [76, 180, 284][id % 3],
      y: height - (id < 3 ? 166 : 79),
      front: id >= 3,
    }));
  }
  function nearest(slots, x) {
    // Horizontal controls select the front row. The back row is directly tappable.
    const front = slots.filter((slot) => slot.front);
    return (front.length ? front : slots).reduce(
      (best, slot) =>
        !best || Math.abs(slot.x - x) < Math.abs(best.x - x) ? slot : best,
      null,
    );
  }
  function readSave(value) {
    const fallback = { version: 1, shelf: [], sound: true };
    try {
      const data = JSON.parse(value);
      if (!data || data.version !== 1) return fallback;
      return {
        version: 1,
        shelf: Array.isArray(data.shelf)
          ? data.shelf.filter((kind) => kinds.includes(kind)).slice(-5)
          : [],
        sound: typeof data.sound === "boolean" ? data.sound : true,
      };
    } catch {
      return fallback;
    }
  }
  function collect(shelf, kind) {
    return kinds.includes(kind)
      ? [...shelf.filter((item) => kinds.includes(item)), kind].slice(-5)
      : shelf.slice(-5);
  }
  function replacement(kind) {
    return kinds[(kinds.indexOf(kind) + 2) % kinds.length];
  }
  globalThis.CraneRules = Object.freeze({
    kinds,
    clamp,
    layout,
    nearest,
    readSave,
    collect,
    replacement,
  });
})();
