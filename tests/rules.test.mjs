import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(
  readFileSync(new URL("../dist/rules.js", import.meta.url), "utf8"),
  context,
);
const rules = context.CraneRules;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("a catch near an empty horizontal gap still selects a real front-row toy", () => {
  const slots = rules.layout(400);
  for (const x of [-100, 0, 48, 120, 180, 260, 312, 500]) {
    const selected = rules.nearest(slots, x);
    assert.ok(selected && selected.front);
    assert.ok(slots.includes(selected));
  }
  assert.equal(rules.nearest(slots, 180).id, 4);
  assert.equal(rules.nearest(slots, 312).id, 5);
});

test("the smallest scene still leaves clearance under the resting claw", () => {
  for (const height of [310, 400, 520]) {
    const slots = rules.layout(height);
    assert.equal(new Set(slots.map((slot) => slot.id)).size, 6);
    for (const slot of slots) {
      assert.ok(
        slot.y - 53 > 70,
        "claw descends, never rises through the rail",
      );
      assert.ok(slot.y + 61 < height, "feet remain above the bottom edge");
      assert.ok(slot.x - 49 >= 0 && slot.x + 49 <= 360);
    }
  }
});

test("broken, old, or unavailable storage starts a usable new game", () => {
  for (const input of [
    null,
    "",
    "{",
    "null",
    "[]",
    '{"version":2}',
    '"text"',
  ]) {
    assert.deepEqual(plain(rules.readSave(input)), {
      version: 1,
      shelf: [],
      sound: true,
    });
  }
});

test("saved data admits only known animals and a boolean sound preference", () => {
  assert.deepEqual(
    plain(
      rules.readSave(
        JSON.stringify({
          version: 1,
          shelf: ["bear", "<script>", null, {}, "cat"],
          sound: false,
        }),
      ),
    ),
    { version: 1, shelf: ["bear", "cat"], sound: false },
  );
  assert.deepEqual(
    plain(rules.readSave('{"version":1,"shelf":{},"sound":"false"}')),
    { version: 1, shelf: [], sound: true },
  );
});

test("many rounds keep the shelf bounded without requiring an album screen", () => {
  let shelf = [];
  for (let round = 0; round < 40; round++)
    shelf = rules.collect(shelf, rules.kinds[round % 6]);
  assert.equal(shelf.length, 5);
  assert.equal(shelf.at(-1), "bunny");
  assert.deepEqual(plain(rules.collect(shelf, "unknown")), plain(shelf));
  assert.equal(
    rules.readSave(JSON.stringify({ version: 1, shelf, sound: true })).shelf
      .length,
    5,
  );
});

test("restocking always gives a different, valid animal", () => {
  for (const kind of rules.kinds) {
    assert.ok(rules.kinds.includes(rules.replacement(kind)));
    assert.notEqual(rules.replacement(kind), kind);
  }
});
