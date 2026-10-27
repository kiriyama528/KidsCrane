/* ぽかぽかクレーン — no framework, requests, fonts, or external assets. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const R = globalThis.CraneRules;
  const NS = "http://www.w3.org/2000/svg";
  const STORE = "pokapoka-crane-v1";
  const names = {
    bear: "くま",
    bunny: "うさぎ",
    cat: "ねこ",
    duck: "あひる",
    panda: "パンダ",
    dino: "きょうりゅう",
  };
  let saved;
  try {
    saved = R.readSave(localStorage.getItem(STORE));
  } catch {
    saved = R.readSave(null);
  }
  let sound = saved.sound;
  let shelf = saved.shelf;
  let audio = null;
  let phase = "idle";
  let paused = false;
  let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let sceneHeight = 400;
  let slots = R.layout(sceneHeight);
  let selected = 4;
  let motion = null;
  let heldKind = null;
  let rewardKind = null;
  let caughtSlot = null;
  let targetX = 180;
  let grip = 0;
  let claw = { x: 180, y: 70 };
  let direction = 0;
  let activePointer = null;
  let dragStart = null;
  let lastFrame = performance.now();
  let gameTime = 0;
  let pendingResize = false;
  let tutorial = "choose";
  let hintStart = 0;
  let lastAnnouncement = "";
  let particles = [];
  const hint = $("hint");
  document.querySelector(".arcade").append(hint);

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ version: 1, shelf, sound }));
    } catch {
      /* Storage is optional, including file: and private browsing. */
    }
  }
  function announce(text) {
    if (text !== lastAnnouncement) {
      $("announcement").textContent = text;
      lastAnnouncement = text;
    }
  }
  function unlockAudio() {
    if (!sound) return;
    try {
      if (!audio)
        audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume().catch(() => {});
    } catch {
      audio = null;
    }
  }
  function notes(frequencies, spacing = 0.1, volume = 0.045) {
    if (
      !sound ||
      !audio ||
      audio.state !== "running" ||
      paused ||
      document.hidden
    )
      return;
    frequencies.forEach((frequency, index) => {
      const start = audio.currentTime + spacing * index;
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);
      oscillator.connect(envelope).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    });
  }
  function drawSound() {
    $("sound").innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4z"/>${sound ? '<path d="M14 8a6 6 0 0 1 0 8m4-12a11 11 0 0 1 0 16"/>' : '<path d="m15 9 6 6m0-6-6 6"/>'}</svg>`;
    $("sound").setAttribute("aria-pressed", String(sound));
    $("sound").setAttribute("aria-label", sound ? "音を消す" : "音を出す");
  }

  // Each toy is a local vector drawing. The same art appears in the machine,
  // claw, outlet, and shelf so the selected prize stays identifiable throughout.
  function animal(kind) {
    const colors = {
      bear: ["#dfac6a", "#efc68d"],
      bunny: ["#edb3af", "#f8d0c5"],
      cat: ["#91b8a5", "#b5d0b8"],
      duck: ["#edc75f", "#f6db88"],
      panda: ["#e9e6cc", "#fff4dc"],
      dino: ["#a9bc7d", "#c8d69c"],
    };
    const [dark, light] = colors[kind];
    const line = "#8a6b53";
    const ears = {
      bear: `<circle cx="-26" cy="-41" r="14" fill="${dark}"/><circle cx="26" cy="-41" r="14" fill="${dark}"/><circle cx="-26" cy="-41" r="8" fill="#c78e59"/><circle cx="26" cy="-41" r="8" fill="#c78e59"/>`,
      bunny: `<ellipse cx="-17" cy="-47" rx="11" ry="29" transform="rotate(-11 -17 -47)" fill="${light}"/><ellipse cx="17" cy="-47" rx="11" ry="29" transform="rotate(11 17 -47)" fill="${light}"/><ellipse cx="-17" cy="-49" rx="5" ry="19" transform="rotate(-11 -17 -49)" fill="#de9695"/><ellipse cx="17" cy="-49" rx="5" ry="19" transform="rotate(11 17 -49)" fill="#de9695"/>`,
      cat: `<path d="M-32-22q-5-34 3-33l23 19M32-22q5-34-3-33L6-36" fill="${dark}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/><path d="m-28-44 1 18 12-8m43-10-1 18-12-8" fill="#e5b4a0"/>`,
      duck: `<path d="M-9-37q-7-23 5-14l7 7q-1-17 8-8l3 17" fill="${dark}" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`,
      panda:
        '<circle cx="-27" cy="-40" r="14" fill="#657d70"/><circle cx="27" cy="-40" r="14" fill="#657d70"/>',
      dino: `<path d="m-23-33 6-15 10 9 8-15 10 13 12-7 3 19" fill="#e9bf73" stroke="#d7a965" stroke-width="1.5"/>`,
    }[kind];
    const tail =
      kind === "cat"
        ? `<path d="M24 40q38 7 23-19" fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round"/>`
        : kind === "dino"
          ? `<path d="M-25 41q-27 5-28-14 13 8 23-4" fill="${dark}"/>`
          : "";
    const paws = kind === "panda" ? "#657d70" : dark;
    const belly =
      kind === "bunny" ? "#fce8d8" : kind === "cat" ? "#e9e5c6" : "#fae7b9";
    let face;
    if (kind === "duck") {
      face = `<g class="eye" fill="${line}"><ellipse cx="-12" cy="-15" rx="2.6" ry="3.3"/><ellipse cx="12" cy="-15" rx="2.6" ry="3.3"/></g><ellipse cy="-3" rx="13" ry="7" fill="#dc9556"/><path d="M-8-3H8" stroke="#b77f45" stroke-width="1.3"/>`;
    } else if (kind === "dino") {
      face = `<ellipse cy="-1" rx="25" ry="14" fill="#d6dfa7"/><g class="eye" fill="${line}"><ellipse cx="-16" cy="-18" rx="2.6" ry="3.2"/><ellipse cx="16" cy="-18" rx="2.6" ry="3.2"/></g><circle cx="-9" cy="-5" r="1.4" fill="#92a66f"/><circle cx="9" cy="-5" r="1.4" fill="#92a66f"/><path d="M-10 4q10 8 20 0" fill="none" stroke="${line}" stroke-width="1.8" stroke-linecap="round"/>`;
    } else {
      const mask =
        kind === "panda"
          ? '<ellipse cx="-13" cy="-15" rx="9" ry="11" transform="rotate(24 -13 -15)" fill="#657d70"/><ellipse cx="13" cy="-15" rx="9" ry="11" transform="rotate(-24 13 -15)" fill="#657d70"/>'
          : "";
      const snout =
        kind === "bear"
          ? '<ellipse cy="-1" rx="16" ry="12" fill="#fae1af"/>'
          : "";
      face = `${mask}${snout}<g class="eye" fill="${kind === "panda" ? "#ffefcd" : line}"><ellipse cx="-13" cy="-16" rx="2.6" ry="3.2"/><ellipse cx="13" cy="-16" rx="2.6" ry="3.2"/></g><path d="M-4-6Q0-9 4-6L0-2Z" fill="${kind === "bunny" ? "#b47971" : line}"/><path d="M0-2v4m-7-1q3 6 7 1 4 5 7-1" fill="none" stroke="${line}" stroke-width="1.5" stroke-linecap="round"/>`;
      if (kind === "cat")
        face += `<path d="m-23-6-10-3m10 8-11 1m57-6 10-3M23-1l11 1" stroke="#779e8c" stroke-width="1.5" stroke-linecap="round"/>`;
    }
    return `<g class="toy-art">${tail}<ellipse cx="0" cy="28" rx="28" ry="31" fill="${dark}"/><ellipse cy="31" rx="18" ry="22" fill="${belly}" opacity=".8"/><ellipse cx="-29" cy="25" rx="9" ry="16" transform="rotate(24 -29 25)" fill="${paws}"/><ellipse cx="29" cy="25" rx="9" ry="16" transform="rotate(-24 29 25)" fill="${paws}"/><ellipse cx="-17" cy="51" rx="13" ry="10" fill="${paws}"/><ellipse cx="17" cy="51" rx="13" ry="10" fill="${paws}"/>${ears}<ellipse cy="-13" rx="35" ry="32" fill="${light}"/><path d="M-24-31q9-10 22-9" stroke="#fff9e2" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" fill="none"/><ellipse cx="-23" cy="-4" rx="6" ry="3.5" fill="#dca18b" opacity=".55"/><ellipse cx="23" cy="-4" rx="6" ry="3.5" fill="#dca18b" opacity=".55"/>${face}<path d="m-8 23 8 4 8-4-1 10-7-3-7 3z" fill="${kind === "duck" || kind === "dino" ? "#dd9071" : "#c99567"}"/><circle cy="28" r="2.8" fill="#fbe1a6"/><path d="M0 39v9" stroke="${line}" stroke-width="1" stroke-dasharray="2 3" opacity=".25"/></g>`;
  }
  function miniAnimal(kind) {
    return `<svg viewBox="-60 -80 120 145" aria-hidden="true">${animal(kind)}</svg>`;
  }
  function drawSlots() {
    $("prizes").innerHTML = slots
      .map(
        (slot) =>
          `<g id="toy-${slot.id}" class="toy" role="button" tabindex="0" aria-label="${names[slot.kind]}をねらう" transform="translate(${slot.x} ${slot.y})" style="--blink-delay:${slot.id * -0.8}s"><ellipse cy="53" rx="38" ry="8" fill="#869a6c" opacity=".13"/><g filter="url(#toyShadow)">${animal(slot.kind)}</g><rect class="hit-area" x="-49" y="-68" width="98" height="129" rx="28"/></g>`,
      )
      .join("");
    slots.forEach((slot) => {
      const toy = $(`toy-${slot.id}`);
      toy.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose(slot.id);
        }
      });
    });
    if (caughtSlot !== null) $(`toy-${caughtSlot}`).style.visibility = "hidden";
  }
  function drawScenery() {
    const h = sceneHeight;
    $("scenery").innerHTML =
      `<rect width="360" height="${h}" fill="url(#glass)"/><rect width="360" height="${h}" fill="url(#wallPattern)"/><path d="M0 ${h - 129}Q180 ${h - 152} 360 ${h - 129}V${h}H0Z" fill="#d9dca6"/><path d="M0 ${h - 82}Q180 ${h - 99} 360 ${h - 82}V${h}H0Z" fill="#e7e4b5"/><path d="M0 ${h - 30}Q180 ${h - 45} 360 ${h - 30}" fill="none" stroke="#eeeac6" stroke-width="12"/><rect x="12" y="28" width="336" height="7" rx="3.5" fill="#92b5a8"/><path d="M18 29h324" stroke="#c9dfcd" stroke-width="2"/><path d="M14 48v${h - 66}m332 0V48" stroke="#f9fff1" stroke-opacity=".5" stroke-width="4"/><g opacity=".65" fill="#f9fff1"><path d="M34 69q-1-13 12-13 5-14 17-6 15-2 16 12H34Z"/><path d="M265 84q1-9 10-9 5-11 14-4 12-2 14 10h-38Z"/></g><rect x="17" y="${h - 13}" width="92" height="16" rx="8" fill="#b3b98b"/><rect x="24" y="${h - 8}" width="78" height="12" rx="6" fill="#858d6c"/>`;
    $("frontGlass").innerHTML =
      `<g pointer-events="none"><path d="M6 65v${h - 96}" stroke="#fffdf0" stroke-width="5" stroke-opacity=".45" stroke-linecap="round"/><path d="M328 51 306 88m31-18-15 25" stroke="#fffdf0" stroke-width="6" stroke-opacity=".4" stroke-linecap="round"/><rect y="${h - 8}" width="360" height="8" fill="#b4b98b" opacity=".4"/></g><g id="confetti" pointer-events="none"></g>`;
  }
  function drawTarget() {
    if (phase !== "idle") {
      $("target").innerHTML = "";
      return;
    }
    const slot = slots[selected];
    $("target").innerHTML =
      `<g transform="translate(${slot.x} ${slot.y})" pointer-events="none"><ellipse cy="55" rx="43" ry="10" stroke="#dca84d" stroke-width="3" fill="none"/><path d="M-46-25v-11h10m72 0h10v11M-46 22v11h8m76 0h8V22" stroke="#ca9250" stroke-width="3" stroke-linecap="round" fill="none"/></g>`;
  }
  function drawClaw() {
    const spread = 32 - grip * 17;
    const end = 22 - grip * 12;
    $("trolley").setAttribute("transform", `translate(${claw.x} 0)`);
    $("cable").setAttribute("d", `M${claw.x} 39V${claw.y - 9}`);
    $("claw").setAttribute("transform", `translate(${claw.x} ${claw.y})`);
    const left = `M-12 9 -${spread} 30 -${end} 45`;
    const right = `M12 9 ${spread} 30 ${end} 45`;
    $("leftFinger").setAttribute("d", left);
    $("leftShine").setAttribute("d", left);
    $("rightFinger").setAttribute("d", right);
    $("rightShine").setAttribute("d", right);
    if (heldKind) {
      const swing = reduced
        ? 0
        : Math.sin(gameTime * 2.8) * (phase === "carrying" ? 4 : 1.5);
      $("held").setAttribute(
        "transform",
        `translate(0 53) rotate(${swing} 0 -35)`,
      );
    }
  }
  function drawShelf(pop = false) {
    $("shelf").innerHTML = Array.from({ length: 5 }, (_, index) => {
      const kind = shelf[index];
      return `<div class="shelf-slot">${kind ? `<button type="button" class="shelf-toy${pop && index === shelf.length - 1 ? " pop" : ""}" aria-label="とった${names[kind]}">${miniAnimal(kind)}</button>` : '<span class="shelf-placeholder" aria-hidden="true"></span>'}</div>`;
    }).join("");
    $("shelf")
      .querySelectorAll("button")
      .forEach((button) =>
        button.addEventListener("click", () => {
          unlockAudio();
          button.classList.remove("pop");
          void button.offsetWidth;
          button.classList.add("pop");
          notes([523], 0.1, 0.025);
        }),
      );
  }
  function setPhase(next) {
    phase = next;
    document.querySelector(".arcade").dataset.phase = phase;
    const busy = phase !== "idle";
    ["left", "right", "catch"].forEach((id) => {
      $(id).disabled = busy;
    });
    $("prizes")
      .querySelectorAll('[role="button"]')
      .forEach((toy) => {
        toy.setAttribute("aria-disabled", String(busy));
        toy.setAttribute("tabindex", busy ? "-1" : "0");
      });
    $("outlet").disabled = phase !== "prize";
    $("outlet").classList.toggle("ready", phase === "prize");
    $("catch").classList.toggle("inviting", !busy && tutorial === "catch");
    drawTarget();
    positionHint();
  }
  function react(slot) {
    const toy = $(`toy-${slot.id}`);
    toy.classList.remove("react");
    void toy.getBoundingClientRect();
    toy.classList.add("react");
  }
  function choose(id) {
    if (phase !== "idle" || paused) return;
    unlockAudio();
    selected = id;
    targetX = slots[id].x;
    react(slots[id]);
    notes([440 + id * 35], 0.1, 0.026);
    if (tutorial !== "done") {
      tutorial = "catch";
      hintStart = gameTime;
    }
    $("catch").classList.toggle("inviting", tutorial === "catch");
    drawTarget();
    positionHint();
    announce(
      `${names[slots[id].kind]}をえらんだよ。まんなかのボタンで、つかまえよう。`,
    );
  }
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function animate(duration, fn) {
    return new Promise((resolve) => {
      motion = {
        elapsed: 0,
        duration: duration * (reduced ? 0.78 : 1),
        fn,
        resolve,
      };
    });
  }
  function move(x, y, duration) {
    const from = { ...claw };
    return animate(duration, (t) => {
      const p = ease(t);
      claw.x = from.x + (x - from.x) * p;
      claw.y = from.y + (y - from.y) * p;
    });
  }
  async function catchPrize() {
    if (phase !== "idle" || paused) return;
    // Lock synchronously before starting an animation: repeated taps cannot
    // start another catch or grant the same prize twice.
    stopInput();
    unlockAudio();
    const slot = slots[selected];
    const kind = slot.kind;
    setPhase("positioning");
    announce(`${names[kind]}をつかまえるよ。`);
    await move(slot.x, 70, 0.32);
    setPhase("lowering");
    notes([330, 294], 0.16, 0.022);
    await move(slot.x, slot.y - 53, 0.85);
    setPhase("gripping");
    await animate(0.42, (t) => {
      grip = ease(t);
    });
    caughtSlot = slot.id;
    $(`toy-${slot.id}`).style.visibility = "hidden";
    heldKind = kind;
    $("held").innerHTML = animal(kind);
    notes([392, 523], 0.1, 0.032);
    setPhase("lifting");
    await move(slot.x, 70, 0.85);
    setPhase("carrying");
    await move(63, 70, 0.9);
    setPhase("dropping");
    await animate(0.32, (t) => {
      grip = 1 - ease(t);
    });
    heldKind = null;
    $("held").innerHTML = "";
    $("falling").innerHTML = animal(kind);
    await animate(0.6, (t) => {
      const y = 123 + (sceneHeight + 63 - 123) * t * t;
      $("falling").setAttribute(
        "transform",
        `translate(63 ${y}) rotate(${-7 * t})`,
      );
    });
    $("falling").innerHTML = "";
    rewardKind = kind;
    $("delivered").innerHTML = miniAnimal(kind);
    $("outlet").classList.add("arrived");
    burst(63, sceneHeight - 20);
    notes([523, 659, 784], 0.13, 0.04);
    setPhase("returning");
    await move(180, 70, 0.45);
    tutorial = tutorial === "done" ? "done" : "receive";
    setPhase("prize");
    $("outlet").setAttribute(
      "aria-label",
      `${names[kind]}がとれたよ。タッチして受け取る`,
    );
    announce(`${names[kind]}がとれたよ。取り出し口をタッチして受け取ろう。`);
    if (
      document.activeElement === $("catch") ||
      document.activeElement === document.body
    )
      $("outlet").focus({ preventScroll: true });
  }
  function receivePrize() {
    if (phase !== "prize" || !rewardKind || paused) return;
    const kind = rewardKind;
    rewardKind = null;
    setPhase("collecting");
    unlockAudio();
    notes([659, 784], 0.1, 0.03);
    shelf = R.collect(shelf, kind);
    save();
    drawShelf(true);
    $("outlet").classList.remove("arrived", "ready");
    $("delivered").innerHTML = "";
    $("outlet").setAttribute("aria-label", "取り出し口");
    slots[caughtSlot].kind = R.replacement(kind);
    caughtSlot = null;
    tutorial = "done";
    targetX = 180;
    selected = 4;
    drawSlots();
    if (pendingResize) resize();
    setPhase("idle");
    if (
      document.activeElement === $("outlet") ||
      document.activeElement === document.body
    )
      $("catch").focus({ preventScroll: true });
    announce(`${names[kind]}をうけとったよ。また、すきな子をえらぼう。`);
  }
  function burst(x, y) {
    if (reduced) return;
    const colors = ["#e5a17c", "#f2cf71", "#8ab4a1", "#fff9df"];
    particles = Array.from({ length: 12 }, (_, i) => ({
      x,
      y,
      vx: Math.cos(i * 2.4) * (45 + i * 5),
      vy: -60 - (i % 4) * 30,
      age: 0,
      color: colors[i % colors.length],
      angle: i * 30,
    }));
  }
  function drawParticles(dt) {
    particles = particles.filter((p) => p.age < 1.1);
    particles.forEach((p) => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
    });
    $("confetti").innerHTML = particles
      .map(
        (p) =>
          `<rect x="-2.5" y="-4" width="5" height="8" rx="1.5" fill="${p.color}" opacity="${Math.max(0, 1 - p.age / 1.1)}" transform="translate(${p.x} ${p.y}) rotate(${p.angle + p.age * 150})"/>`,
      )
      .join("");
  }
  function point(event) {
    const matrix = $("scene").getScreenCTM();
    if (!matrix) return { x: 180, y: 70 };
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
  }
  function stopInput() {
    activePointer = null;
    dragStart = null;
    direction = 0;
    $("left").classList.remove("pushed");
    $("right").classList.remove("pushed");
  }
  function nudge(amount) {
    if (phase !== "idle" || paused) return;
    unlockAudio();
    targetX = R.clamp(targetX + amount, 48, 312);
    const previous = selected;
    selected = R.nearest(slots, targetX).id;
    if (previous !== selected)
      announce(`${names[slots[selected].kind]}をねらっているよ。`);
    if (tutorial !== "done") tutorial = "catch";
    $("catch").classList.toggle("inviting", tutorial === "catch");
    drawTarget();
    positionHint();
  }
  function setupDirection(id, sign) {
    const button = $(id);
    button.addEventListener("pointerdown", (event) => {
      if (
        phase !== "idle" ||
        paused ||
        activePointer !== null ||
        !event.isPrimary ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      activePointer = event.pointerId;
      button.setPointerCapture(event.pointerId);
      direction = sign;
      button.classList.add("pushed");
      nudge(sign * 18);
    });
    const release = (event) => {
      if (event.pointerId === activePointer) stopInput();
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("click", (event) => {
      if (event.detail === 0) nudge(sign * 90);
    });
  }
  function positionHint() {
    if (
      (tutorial === "done" && phase !== "prize") ||
      paused ||
      (phase !== "idle" && phase !== "prize")
    ) {
      hint.classList.remove("visible");
      return;
    }
    let x, y;
    if (phase === "prize") {
      // Repeat the outlet cue even after the initial tutorial: the next action
      // remains visually discoverable without reading or remembering an icon.
      const r = $("outlet").getBoundingClientRect();
      x = r.left + r.width * 0.65;
      y = r.top + r.height * 0.45;
    } else if (tutorial === "catch") {
      const r = $("catch").getBoundingClientRect();
      x = r.left + r.width * 0.52;
      y = r.top + r.height * 0.5;
    } else {
      const matrix = $("scene").getScreenCTM();
      if (!matrix) return;
      const s = slots[4];
      const p = new DOMPoint(s.x + 13, s.y + 8).matrixTransform(matrix);
      x = p.x;
      y = p.y;
    }
    const parent = document.querySelector(".arcade").getBoundingClientRect();
    hint.style.left = `${x - parent.left - 19}px`;
    hint.style.top = `${y - parent.top - 9}px`;
    hint.classList.add("visible");
  }
  function resize() {
    if (!["idle", "collecting"].includes(phase)) {
      pendingResize = true;
      return;
    }
    const rect = $("stage").getBoundingClientRect();
    sceneHeight = Math.max(
      310,
      ((rect.height - 3) / Math.max(1, rect.width - 6)) * 360,
    );
    $("scene").setAttribute("viewBox", `0 0 360 ${sceneHeight}`);
    const previous = slots;
    slots = R.layout(sceneHeight).map((slot, index) => ({
      ...slot,
      kind: previous[index].kind,
    }));
    drawScenery();
    drawSlots();
    drawTarget();
    drawClaw();
    positionHint();
    pendingResize = false;
  }
  function pauseGame() {
    if (paused) return;
    stopInput();
    paused = true;
    hint.classList.remove("visible");
    if (audio?.state === "running") audio.suspend().catch(() => {});
    $("pauseDialog").showModal();
  }
  function resumeGame() {
    $("pauseDialog").close();
    paused = false;
    lastFrame = performance.now();
    unlockAudio();
    positionHint();
  }
  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!paused && !document.hidden) {
      gameTime += dt;
      if (motion) {
        const current = motion;
        current.elapsed += dt;
        const t = Math.min(1, current.elapsed / current.duration);
        current.fn(t);
        if (t === 1) {
          motion = null;
          current.resolve();
        }
      } else if (phase === "idle") {
        if (direction) nudge(direction * 130 * dt);
        claw.x += (targetX - claw.x) * Math.min(1, dt * 11);
      }
      drawClaw();
      if (particles.length || $("confetti").hasChildNodes()) drawParticles(dt);
      // An unanswered demo rests after a few cycles; replay is always available.
      if (tutorial !== "done" && phase === "idle" && gameTime - hintStart > 12)
        hint.classList.remove("visible");
    }
    requestAnimationFrame(frame);
  }

  $("scene").addEventListener("pointerdown", (event) => {
    if (
      phase !== "idle" ||
      paused ||
      activePointer !== null ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    activePointer = event.pointerId;
    $("scene").setPointerCapture(event.pointerId);
    const p = point(event);
    dragStart = { x: event.clientX, y: event.clientY, moved: false };
    const toy = event.target.closest(".toy");
    if (toy) choose(Number(toy.id.slice(4)));
    else {
      targetX = R.clamp(p.x, 48, 312);
      choose(R.nearest(slots, targetX).id);
      targetX = R.clamp(p.x, 48, 312);
    }
  });
  $("scene").addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointer || !dragStart || phase !== "idle")
      return;
    if (
      Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 10
    )
      dragStart.moved = true;
    if (dragStart.moved) {
      targetX = R.clamp(point(event).x, 48, 312);
      selected = R.nearest(slots, targetX).id;
      drawTarget();
    }
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    $("scene").addEventListener(type, (event) => {
      if (event.pointerId === activePointer) stopInput();
    }),
  );
  setupDirection("left", -1);
  setupDirection("right", 1);
  $("catch").addEventListener("click", catchPrize);
  $("outlet").addEventListener("click", receivePrize);
  $("sound").addEventListener("click", () => {
    sound = !sound;
    drawSound();
    save();
    if (sound) {
      unlockAudio();
      notes([523], 0.1, 0.03);
    } else if (audio?.state === "running") audio.suspend().catch(() => {});
  });
  $("pause").addEventListener("click", pauseGame);
  $("resume").addEventListener("click", resumeGame);
  $("pauseDialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    resumeGame();
  });
  $("help").addEventListener("click", () => {
    if (phase === "idle") {
      tutorial = "choose";
      hintStart = gameTime;
      $("catch").classList.remove("inviting");
    } else if (phase === "prize") tutorial = "receive";
    positionHint();
  });
  document.addEventListener("keydown", (event) => {
    if (paused) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      nudge(event.key === "ArrowLeft" ? -60 : 60);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      pauseGame();
    }
  });
  document.addEventListener("visibilitychange", () => {
    stopInput();
    lastFrame = performance.now();
    if (document.hidden && audio?.state === "running")
      audio.suspend().catch(() => {});
  });
  window.addEventListener("blur", stopInput);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    (event) => {
      reduced = event.matches;
      if (reduced) particles = [];
    },
  );
  new ResizeObserver(resize).observe($("stage"));
  window.addEventListener("resize", positionHint);
  drawSound();
  drawShelf();
  drawScenery();
  drawSlots();
  setPhase("idle");
  resize();
  announce("すきなぬいぐるみをタッチして、まんなかのボタンでつかまえよう。");
  requestAnimationFrame(frame);
})();
