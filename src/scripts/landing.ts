/**
 * Landing page behaviour: the race, the terminal, the share card, the memory
 * lab, the platform diagram and the chrome around them. Everything is torn
 * down on `astro:before-swap` so client-side navigation never doubles a loop.
 */
import {
  raceEngines,
  raceCommand,
  termSession,
  platforms,
  navLinks,
  installTargets,
  type RacePath,
} from "../lib/landing";

type Teardown = () => void;
let teardowns: Teardown[] = [];

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Native scroll-driven animations beat any observer we could write. */
const nativeView =
  typeof CSS !== "undefined" && CSS.supports("(animation-timeline: view()) and (animation-range: entry)");
const nativeScroll =
  typeof CSS !== "undefined" && CSS.supports("(animation-timeline: scroll()) and (animation-range: 0% 100%)");
const nativeSpy = typeof CSS !== "undefined" && CSS.supports("scroll-target-group: auto");

function listen<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Document | Window,
  type: K | string,
  fn: (ev: never) => void,
  opts?: AddEventListenerOptions,
) {
  el.addEventListener(type, fn as EventListener, opts);
  teardowns.push(() => el.removeEventListener(type, fn as EventListener, opts));
}

function q<T extends Element>(root: ParentNode, sel: string): T | null {
  return root.querySelector<T>(sel);
}

function every<T extends Element>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

function fmtMs(ms: number) {
  return `${ms < 10 ? ms.toFixed(2) : ms < 100 ? ms.toFixed(1) : Math.round(ms)} ms`;
}

function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function paintRange(input: HTMLInputElement) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const pct = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty("--k-fill", `${pct}%`);
}

/**
 * Runs `fn` only while `el` is on screen *and* the browser is still rendering
 * it. `content-visibility: auto` sections report their own rendering state,
 * which arrives earlier than intersection and is what actually costs battery.
 */
function whileVisible(
  el: HTMLElement,
  enter: () => void,
  leave: () => void,
  options: IntersectionObserverInit = { threshold: 0.15 },
) {
  let inView = false;
  let rendering = true;
  const sync = () => (inView && rendering ? enter() : leave());

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        sync();
      }
    },
    options,
  );
  io.observe(el);
  teardowns.push(() => io.disconnect());

  const host = el.closest<HTMLElement>(".k-defer");
  if (host && "contentVisibility" in document.documentElement.style) {
    const onState = (ev: Event) => {
      rendering = !(ev as Event & { skipped: boolean }).skipped;
      sync();
    };
    host.addEventListener("contentvisibilityautostatechange", onState);
    teardowns.push(() => host.removeEventListener("contentvisibilityautostatechange", onState));
  }
}

/* ------------------------------------------------------------------ chrome */

function initChrome(root: HTMLElement) {
  const nav = q<HTMLElement>(root, "[data-k-nav]");
  const progress = q<HTMLElement>(root, "[data-k-progress]");
  const top = q<HTMLElement>(root, "[data-k-top]");
  const burger = q<HTMLButtonElement>(root, "[data-k-burger]");
  const mobile = q<HTMLElement>(root, "[data-k-mobile]");

  // The scroll range is measured on resize, never inside the scroll handler:
  // reading scrollHeight per frame forces a layout the page cannot afford.
  let max = 1;
  const measure = () => {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(document.body);
  teardowns.push(() => ro.disconnect());
  listen(window, "resize", measure, { passive: true });

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const y = window.scrollY;
      nav?.classList.toggle("is-scrolled", y > 8);
      if (progress && !nativeScroll) progress.style.setProperty("--k-p", String(Math.min(1, y / max)));
      top?.classList.toggle("is-on", y > 700);
    });
  };
  listen(window, "scroll", onScroll, { passive: true });
  onScroll();

  if (burger && mobile) {
    listen(burger, "click", () => {
      const open = mobile.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    every<HTMLAnchorElement>(mobile, "a").forEach((a) =>
      listen(a, "click", () => {
        mobile.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "打开菜单");
      }),
    );
  }

  const themeBtn = q<HTMLButtonElement>(root, "[data-k-theme]");
  if (themeBtn) {
    const sync = () =>
      themeBtn.setAttribute(
        "aria-pressed",
        String(document.documentElement.getAttribute("data-mode") === "dark"),
      );
    sync();
    listen(themeBtn, "click", () => {
      const dark = document.documentElement.getAttribute("data-mode") === "dark";
      const next = dark ? "light" : "dark";
      try {
        localStorage.setItem("ui-mode", next);
      } catch {
        /* storage refused: the layout keeps the choice for this page */
      }
      const apply = (window as unknown as { __nbApplyTheme?: (m: string) => void }).__nbApplyTheme;
      if (apply) apply(next);
      else document.documentElement.setAttribute("data-mode", next);
      sync();
    });
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    teardowns.push(() => mo.disconnect());
  }

  if (top) listen(top, "click", () => window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }));

  // current section in the nav
  const spies = every<HTMLAnchorElement>(root, "[data-k-spy]");
  const setCurrent = (id: string | null) => {
    spies.forEach((a) => {
      const on = a.dataset.kSpy === id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  };
  if (spies.length && nativeSpy) {
    // :target-current draws the state; aria-current is what a reader hears.
    const sync = () => {
      const cur = q<HTMLAnchorElement>(root, "[data-k-spy]:target-current");
      spies.forEach((a) => {
        if (a === cur) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    sync();
    // Chromium resolves :target-current one frame after it dispatches
    // scrollend, so the first frame still names the section we just left.
    const deferred = () => requestAnimationFrame(() => requestAnimationFrame(sync));
    listen(document, "scrollend", deferred, { passive: true });
  } else if (spies.length) {
    const sections = navLinks
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) setCurrent(e.target.id);
          }
        },
        { rootMargin: "-45% 0px -50% 0px" },
      );
      sections.forEach((s) => io.observe(s));
      teardowns.push(() => io.disconnect());
    }
  }

  // Entry effects: native view() timelines where they exist, one observer
  // where they do not. Content is never hidden by a script that failed.
  const items = every<HTMLElement>(root, "[data-reveal]");
  if (!nativeView && !reduced()) {
    root.classList.add("k-js-reveal");
    items.forEach((el) => el.style.setProperty("--k-i", el.dataset.i ?? "0"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    items.forEach((el) => io.observe(el));
    teardowns.push(() => io.disconnect());
  }

  // copy buttons
  every<HTMLButtonElement>(root, "[data-copy]").forEach((btn) => {
    const label = btn.innerHTML;
    let timer = 0;
    listen(btn, "click", async () => {
      const text = btn.dataset.copy ?? "";
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      btn.classList.add("is-done");
      if (btn.classList.contains("k-copy")) btn.textContent = "✓";
      else btn.textContent = "已复制";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        btn.classList.remove("is-done");
        btn.innerHTML = label;
      }, 1600);
    });
    teardowns.push(() => window.clearTimeout(timer));
  });
}

/* -------------------------------------------------------------- hero window */

function initWindow(root: HTMLElement) {
  const win = q<HTMLElement>(root, "[data-k-window]");
  if (!win) return;
  const cpu = q<HTMLElement>(win, "[data-k-cpu]");
  const mem = q<HTMLElement>(win, "[data-k-mem]");
  const footMem = q<HTMLElement>(win, "[data-k-foot-mem]");
  const cpuBars = every<HTMLElement>(win, '[data-k-spark="cpu"] i');
  const memBars = every<HTMLElement>(win, '[data-k-spark="mem"] i');
  const ups = every<HTMLElement>(win, "[data-k-up]");
  const upStart = ups.map((el) => Number(el.dataset.kUp ?? 0));

  let memory = 657;
  let visible = false;
  const shift = (bars: HTMLElement[], value: number) => {
    for (let i = 0; i < bars.length - 1; i++) bars[i].style.height = bars[i + 1].style.height;
    bars[bars.length - 1].style.height = `${Math.max(8, Math.min(100, value))}%`;
  };

  const tick = () => {
    if (!visible || document.hidden) return;
    const load = 0.2 + Math.random() * 0.9;
    memory = Math.max(560, Math.min(760, memory + Math.round((Math.random() - 0.5) * 26)));
    if (cpu) cpu.textContent = `${load.toFixed(1)}%`;
    if (mem) mem.textContent = `${memory} MB`;
    if (footMem) footMem.textContent = `${memory} MB / 4 GB`;
    shift(cpuBars, load * 55 + Math.random() * 12);
    shift(memBars, (memory / 1024) * 100);
    ups.forEach((el, i) => {
      upStart[i] += 2;
      const m = Math.floor(upStart[i] / 60);
      el.textContent = m >= 1 ? `运行 ${m} 分钟` : `运行 ${upStart[i]} 秒`;
    });
  };

  cpuBars.forEach((b, i) => (b.style.height = `${18 + ((i * 13) % 40)}%`));
  memBars.forEach((b, i) => (b.style.height = `${40 + ((i * 7) % 25)}%`));

  if (!reduced()) {
    const id = window.setInterval(tick, 2000);
    teardowns.push(() => window.clearInterval(id));
    whileVisible(win, () => (visible = true), () => (visible = false));
  }
}

/* -------------------------------------------------------------------- race */

function initRace(root: HTMLElement) {
  const box = q<HTMLElement>(root, "[data-k-race]");
  if (!box) return;

  const cmdEl = q<HTMLElement>(box, "[data-k-race-cmd]");
  const liveEl = q<HTMLElement>(box, "[data-k-race-live]");
  const stateEl = q<HTMLElement>(box, "[data-k-race-state]");
  const playBtn = q<HTMLButtonElement>(box, "[data-k-play]");
  const playLabel = q<HTMLElement>(box, "[data-k-play-label]");
  const replayBtn = q<HTMLButtonElement>(box, "[data-k-replay]");
  const resetBtn = q<HTMLButtonElement>(box, "[data-k-reset]");
  const speedInput = q<HTMLInputElement>(box, "[data-k-speed]");
  const speedVal = q<HTMLElement>(box, "[data-k-speed-val]");
  const loopInput = q<HTMLInputElement>(box, "[data-k-loop]");
  const residueInput = q<HTMLInputElement>(box, "[data-k-residue]");
  const pathBtns = every<HTMLButtonElement>(box, "[data-k-path]");
  const engineInputs = every<HTMLInputElement>(box, "[data-k-engine]");
  const barsBox = q<HTMLElement>(root, "[data-k-bars]");
  const barsCaption = q<HTMLElement>(root, "[data-k-bars-caption]");

  const lanes = raceEngines.map((e) => {
    const el = q<HTMLElement>(box, `[data-k-lane="${e.id}"]`) as HTMLElement;
    return {
      engine: e,
      el,
      token: q<HTMLElement>(el, "[data-k-token]") as HTMLElement,
      fill: q<HTMLElement>(el, "[data-k-fill]") as HTMLElement,
      timer: q<HTMLElement>(el, "[data-k-timer]") as HTMLElement,
      track: q<HTMLElement>(el, "[data-k-track]") as HTMLElement,
      residue: q<HTMLElement>(el, "[data-k-residue-row]") as HTMLElement,
      stops: [] as HTMLElement[],
      ms: e.ms.cli,
    };
  });

  let path: RacePath = "cli";
  let slow = 40;
  let playing = false;
  let started = false;
  let elapsed = 0;
  let raf = 0;
  let last = 0;
  let restart = 0;
  const enabled = new Set(raceEngines.map((e) => e.id));

  const activeLanes = () => lanes.filter((l) => enabled.has(l.engine.id));
  const totalMs = () => Math.max(...activeLanes().map((l) => l.engine.ms[path]), 1);

  function buildStops() {
    for (const l of lanes) {
      l.stops.forEach((s) => s.remove());
      const names = l.engine.stops[path];
      l.stops = names.map((name, i) => {
        const stop = document.createElement("span");
        stop.className = "k-stop";
        stop.style.left = `${(i / (names.length - 1)) * 100}%`;
        const label = document.createElement("span");
        label.textContent = name;
        stop.appendChild(label);
        l.track.insertBefore(stop, l.token);
        return stop;
      });
      l.ms = l.engine.ms[path];
    }
  }

  function paint() {
    for (const l of lanes) {
      const p = Math.max(0, Math.min(1, elapsed / l.ms));
      l.token.style.left = `${p * 100}%`;
      l.fill.style.width = `${p * 100}%`;
      l.timer.textContent = fmtMs(Math.min(elapsed, l.ms));
      l.el.classList.toggle("is-done", p >= 1);
      l.stops.forEach((s, i) => s.classList.toggle("is-hit", p >= i / (l.stops.length - 1) - 0.001));
    }
  }

  function paintBars() {
    if (!barsBox) return;
    const max = Math.max(...raceEngines.map((e) => e.ms[path]));
    for (const e of raceEngines) {
      const row = q<HTMLElement>(barsBox, `[data-k-bar="${e.id}"]`);
      if (!row) continue;
      const fill = q<HTMLElement>(row, "[data-k-bar-fill]");
      const val = q<HTMLElement>(row, "[data-k-bar-val]");
      if (fill) fill.style.width = `${Math.max(3, (e.ms[path] / max) * 100)}%`;
      if (val) val.textContent = fmtMs(e.ms[path]);
    }
    if (barsCaption)
      barsCaption.textContent = `${path === "cli" ? "docker CLI" : "Docker Engine API"} 路径 · 越低越好`;
  }

  function setState(text: string, running: boolean) {
    if (stateEl) stateEl.textContent = text;
    liveEl?.classList.toggle("is-running", running);
    playBtn?.classList.toggle("is-playing", running);
    if (playLabel) playLabel.textContent = running ? "暂停" : elapsed > 0 ? "继续" : "发车";
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(raf);
    window.clearTimeout(restart);
  }

  function resetRun() {
    stop();
    elapsed = 0;
    paint();
    setState("待发车", false);
    if (playLabel) playLabel.textContent = "发车";
  }

  function frame(ts: number) {
    if (!playing) return;
    const dt = Math.min(80, ts - last);
    last = ts;
    elapsed += dt / slow;
    if (elapsed >= totalMs()) {
      elapsed = totalMs();
      paint();
      stop();
      setState("完成", false);
      if (playLabel) playLabel.textContent = "再来一次";
      if (loopInput?.checked) restart = window.setTimeout(() => start(true), 1200);
      return;
    }
    paint();
    raf = requestAnimationFrame(frame);
  }

  function start(fromLoop = false) {
    window.clearTimeout(restart);
    if (elapsed >= totalMs() || fromLoop) elapsed = 0;
    started = true;
    if (reduced()) {
      elapsed = totalMs();
      paint();
      setState("完成", false);
      if (playLabel) playLabel.textContent = "再来一次";
      return;
    }
    playing = true;
    last = performance.now();
    setState("比赛中", true);
    raf = requestAnimationFrame(frame);
  }

  buildStops();
  paintBars();
  resetRun();
  if (speedInput) paintRange(speedInput);

  pathBtns.forEach((btn) =>
    listen(btn, "click", () => {
      path = (btn.dataset.kPath as RacePath) ?? "cli";
      pathBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (cmdEl) cmdEl.textContent = raceCommand[path];
      buildStops();
      paintBars();
      resetRun();
      start();
    }),
  );

  if (speedInput)
    listen(speedInput, "input", () => {
      slow = Number(speedInput.value);
      if (speedVal) speedVal.textContent = `${slow}×`;
      paintRange(speedInput);
    });

  if (playBtn)
    listen(playBtn, "click", () => {
      if (playing) {
        stop();
        setState("已暂停", false);
      } else start();
    });

  if (replayBtn)
    listen(replayBtn, "click", () => {
      resetRun();
      start();
    });

  engineInputs.forEach((input) =>
    listen(input, "change", () => {
      const id = input.dataset.kEngine as string;
      if (!input.checked && enabled.size === 1) {
        input.checked = true;
        return;
      }
      input.checked ? enabled.add(id) : enabled.delete(id);
      const lane = lanes.find((l) => l.engine.id === id);
      if (lane) lane.el.hidden = !input.checked;
      resetRun();
      if (started) start();
    }),
  );

  if (residueInput)
    listen(residueInput, "change", () => {
      lanes.forEach((l) => (l.residue.hidden = !residueInput.checked));
    });

  if (loopInput)
    listen(loopInput, "change", () => {
      if (!loopInput.checked) window.clearTimeout(restart);
      else if (!playing && elapsed >= totalMs()) restart = window.setTimeout(() => start(true), 600);
    });

  if (resetBtn)
    listen(resetBtn, "click", () => {
      path = "cli";
      slow = 40;
      enabled.clear();
      raceEngines.forEach((e) => enabled.add(e.id));
      engineInputs.forEach((i) => (i.checked = true));
      lanes.forEach((l) => {
        l.el.hidden = false;
        l.residue.hidden = false;
      });
      if (residueInput) residueInput.checked = true;
      if (loopInput) loopInput.checked = true;
      if (speedInput) {
        speedInput.value = "40";
        paintRange(speedInput);
      }
      if (speedVal) speedVal.textContent = "40×";
      pathBtns.forEach((b) => {
        const on = b.dataset.kPath === "cli";
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (cmdEl) cmdEl.textContent = raceCommand.cli;
      buildStops();
      paintBars();
      resetRun();
    });

  whileVisible(
    box,
    () => {
      if (!started) start();
      else if (!playing && elapsed > 0 && elapsed < totalMs()) start();
    },
    () => {
      if (playing) {
        stop();
        setState("已暂停", false);
      }
      window.clearTimeout(restart);
    },
    { threshold: 0, rootMargin: "160px 0px" },
  );

  teardowns.push(() => {
    stop();
    window.clearTimeout(restart);
  });
}

/* ---------------------------------------------------------------- terminal */

function initTerminal(root: HTMLElement) {
  const fig = q<HTMLElement>(root, "[data-k-term]");
  if (!fig) return;
  const body = fig.querySelector<HTMLElement>("[data-k-term-body]");
  const replay = q<HTMLButtonElement>(fig, "[data-k-term-replay]");
  if (!body) return;
  const out: HTMLElement = body;

  let timers: number[] = [];
  let started = false;
  let finished = false;

  const clear = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  };
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  const lineHtml = (cmd: string, out: typeof termSession[number]["out"]) =>
    `<span class="k-p">$ </span><span class="k-c">${esc(cmd)}</span>\n` +
    out.map((o) => `<span class="k-${o.tone ?? "o"}">${esc(o.text)}</span>`).join("\n");

  function full() {
    finished = true;
    out.innerHTML = `${termSession.map((l) => lineHtml(l.cmd, l.out)).join("\n\n")}\n\n<span class="k-p">$ </span><span class="k-cursor"></span>`;
  }

  function play() {
    clear();
    finished = false;
    if (reduced()) {
      full();
      return;
    }
    let done = "";
    let li = 0;
    const typeLine = () => {
      if (li >= termSession.length) {
        full();
        return;
      }
      const line = termSession[li];
      let ci = 0;
      const typeChar = () => {
        ci += 1;
        out.innerHTML = `${done}<span class="k-p">$ </span><span class="k-c">${esc(line.cmd.slice(0, ci))}</span><span class="k-cursor"></span>`;
        if (ci < line.cmd.length) later(typeChar, 26);
        else
          later(() => {
            done += `${lineHtml(line.cmd, line.out)}\n\n`;
            out.innerHTML = `${done}<span class="k-p">$ </span><span class="k-cursor"></span>`;
            li += 1;
            later(typeLine, 460);
          }, 340);
      };
      typeChar();
    };
    out.innerHTML = `<span class="k-p">$ </span><span class="k-cursor"></span>`;
    later(typeLine, 300);
  }

  if (replay)
    listen(replay, "click", () => {
      started = true;
      play();
    });

  whileVisible(
    fig,
    () => {
      if (!started || (!finished && timers.length === 0)) {
        started = true;
        play();
      }
    },
    () => clear(),
  );
  teardowns.push(clear);
}

/* ------------------------------------------------------------------- share */

function initShare(root: HTMLElement) {
  const card = q<HTMLElement>(root, "[data-k-share]");
  if (!card) return;
  const state = q<HTMLElement>(card, "[data-k-share-state]");
  const toggle = q<HTMLButtonElement>(card, "[data-k-share-toggle]");
  const copy = q<HTMLButtonElement>(card, "[data-k-share-copy]");
  const hits = q<HTMLElement>(card, "[data-k-share-hits]");

  let connected = true;
  let count = 14;
  let visible = false;

  const paint = () => {
    card.classList.toggle("is-off", !connected);
    if (state) state.textContent = connected ? "已连接" : "已断开";
    if (toggle) toggle.textContent = connected ? "断开" : "重新连接";
    if (copy) copy.disabled = !connected;
  };

  if (toggle)
    listen(toggle, "click", () => {
      connected = !connected;
      paint();
    });

  const id = window.setInterval(() => {
    if (!connected || !visible || document.hidden || reduced()) return;
    count += 1;
    if (hits) hits.textContent = String(count);
  }, 5200);
  teardowns.push(() => window.clearInterval(id));
  whileVisible(card, () => (visible = true), () => (visible = false));
  paint();
}

/* ------------------------------------------------------------ memory lab */

function initResource(root: HTMLElement) {
  const lab = q<HTMLElement>(root, "[data-k-rl]");
  if (!lab) return;

  const containersIn = q<HTMLInputElement>(lab, "[data-k-rl-containers]");
  const perIn = q<HTMLInputElement>(lab, "[data-k-rl-per]");
  const speedIn = q<HTMLInputElement>(lab, "[data-k-rl-speed]");
  const idleIn = q<HTMLSelectElement>(lab, "[data-k-rl-idle]");
  const autoIn = q<HTMLInputElement>(lab, "[data-k-rl-auto]");
  const playBtn = q<HTMLButtonElement>(lab, "[data-k-rl-play]");
  const playLabel = q<HTMLElement>(lab, "[data-k-rl-play-label]");
  const wakeBtn = q<HTMLButtonElement>(lab, "[data-k-rl-wake]");
  const resetBtn = q<HTMLButtonElement>(lab, "[data-k-rl-reset]");

  const containersVal = q<HTMLElement>(lab, "[data-k-rl-containers-val]");
  const perVal = q<HTMLElement>(lab, "[data-k-rl-per-val]");
  const speedVal = q<HTMLElement>(lab, "[data-k-rl-speed-val]");
  const stateEl = q<HTMLElement>(lab, "[data-k-rl-state]");
  const stateText = q<HTMLElement>(lab, "[data-k-rl-state-text]");
  const clockEl = q<HTMLElement>(lab, "[data-k-rl-clock]");
  const vmFill = q<HTMLElement>(lab, "[data-k-rl-vm-fill]");
  const vmVal = q<HTMLElement>(lab, "[data-k-rl-vm-val]");
  const daemonFill = q<HTMLElement>(lab, "[data-k-rl-daemon-fill]");
  const idleFill = q<HTMLElement>(lab, "[data-k-rl-idle-fill]");
  const idleVal = q<HTMLElement>(lab, "[data-k-rl-idle-val]");
  const peakEl = q<HTMLElement>(lab, "[data-k-rl-peak]");
  const line = q<SVGPolylineElement>(lab, "[data-k-rl-line]");
  const area = q<SVGPathElement>(lab, "[data-k-rl-area]");
  const log = q<HTMLElement>(lab, "[data-k-rl-log]");

  const BASE = 120;
  const DAEMON = 15;
  const WAKE = 0.15;

  let containers = 4;
  let per = 128;
  let speed = 6;
  let idleLimit = 60;
  let playing = true;
  let visible = false;
  let t = 0;
  let idle = 0;
  let mem = BASE + containers * per;
  let mode: "run" | "idle" | "sleep" | "wake" = "run";
  let wakeLeft = 0;
  let peak = mem;
  let history: number[] = [mem];
  let sampleAt = 0;
  let autoAt = 0;
  let raf = 0;
  let last = 0;

  const target = () => (mode === "sleep" ? 0 : BASE + containers * per);

  function addLog(text: string) {
    if (!log) return;
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = clock(t);
    const span = document.createElement("span");
    span.textContent = text;
    li.append(b, span);
    log.prepend(li);
    while (log.children.length > 5) log.lastElementChild?.remove();
  }

  function paintControls() {
    if (containersVal) containersVal.textContent = String(containers);
    if (perVal) perVal.textContent = `${per} MB`;
    if (speedVal) speedVal.textContent = `${speed}×`;
    [containersIn, perIn, speedIn].forEach((i) => i && paintRange(i));
    if (playBtn) playBtn.classList.toggle("is-playing", playing);
    if (playLabel) playLabel.textContent = playing ? "暂停" : "继续";
    if (wakeBtn) {
      const asleep = mode === "sleep";
      wakeBtn.textContent = asleep ? "立即唤醒" : "立即休眠";
      wakeBtn.disabled = !asleep && containers > 0;
      wakeBtn.title = wakeBtn.disabled ? "还有容器在运行，VM 不会休眠" : "";
    }
  }

  function paint() {
    const scale = Math.max(512, peak) * 1.16;
    if (vmFill) vmFill.style.width = `${Math.min(100, (mem / scale) * 100)}%`;
    if (vmVal) vmVal.textContent = `${Math.round(mem)} MB`;
    if (daemonFill) daemonFill.style.width = `${(DAEMON / scale) * 100}%`;
    if (idleFill) idleFill.style.width = `${Math.min(100, (idle / idleLimit) * 100)}%`;
    if (idleVal) idleVal.textContent = `${Math.floor(idle)} / ${idleLimit} s`;
    if (clockEl) clockEl.textContent = clock(t);
    if (peakEl) peakEl.textContent = `峰值 ${Math.round(peak)} MB`;
    if (stateEl) {
      stateEl.classList.toggle("is-idle", mode === "idle");
      stateEl.classList.toggle("is-sleep", mode === "sleep");
      stateEl.classList.toggle("is-wake", mode === "wake");
    }
    if (stateText)
      stateText.textContent =
        mode === "run"
          ? `运行中 · ${containers} 个容器`
          : mode === "idle"
            ? `空闲 · ${Math.max(0, Math.ceil(idleLimit - idle))} 秒后休眠`
            : mode === "wake"
              ? "唤醒中 · 0.15 秒"
              : "已休眠 · 内存已归还";

    if (line && area) {
      const n = history.length;
      const pts = history.map((v, i) => {
        const x = n === 1 ? 0 : (i / (n - 1)) * 300;
        const y = 92 - (v / scale) * 84;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      line.setAttribute("points", pts.join(" "));
      area.setAttribute("d", `M0,96 L${pts.join(" L")} L300,96 Z`);
    }
  }

  function step(dt: number) {
    t += dt;
    if (mode === "wake") {
      wakeLeft -= dt;
      if (wakeLeft <= 0) {
        mode = containers > 0 ? "run" : "idle";
        addLog(`VM 已唤醒（约 ${WAKE} 秒）`);
      }
    } else if (containers > 0) {
      if (mode === "sleep") {
        mode = "wake";
        wakeLeft = WAKE;
        addLog("收到请求，正在唤醒 VM…");
      } else {
        mode = "run";
        idle = 0;
      }
    } else if (mode !== "sleep") {
      mode = "idle";
      idle += dt;
      if (idle >= idleLimit) {
        mode = "sleep";
        idle = idleLimit;
        addLog(`空闲 ${idleLimit} 秒，VM 休眠，内存归还系统`);
      }
    }

    const goal = target();
    mem += (goal - mem) * Math.min(1, dt * 3.2);
    if (Math.abs(goal - mem) < 0.6) mem = goal;
    peak = Math.max(peak, mem);

    if (t - sampleAt >= 1) {
      sampleAt = t;
      history.push(mem);
      if (history.length > 120) history.shift();
    }

    if (autoIn?.checked && t - autoAt >= 9) {
      autoAt = t;
      containers = containers === 0 ? 2 + Math.floor(Math.random() * 5) : 0;
      if (containersIn) containersIn.value = String(containers);
      addLog(containers === 0 ? "所有容器已停止" : `启动了 ${containers} 个容器`);
      paintControls();
    }
  }

  function frame(ts: number) {
    raf = requestAnimationFrame(frame);
    const dtWall = Math.min(100, ts - last) / 1000;
    last = ts;
    if (!playing || !visible || document.hidden) return;
    step(dtWall * speed);
    paint();
    paintControls();
  }

  function reset() {
    containers = 4;
    per = 128;
    speed = 6;
    idleLimit = 60;
    t = 0;
    idle = 0;
    mode = "run";
    mem = BASE + containers * per;
    peak = mem;
    history = [mem];
    sampleAt = 0;
    autoAt = 0;
    playing = true;
    if (containersIn) containersIn.value = "4";
    if (perIn) perIn.value = "128";
    if (speedIn) speedIn.value = "6";
    if (idleIn) idleIn.value = "60";
    if (autoIn) autoIn.checked = false;
    if (log) log.innerHTML = "";
    addLog("引擎就绪，4 个容器运行中");
    paintControls();
    paint();
  }

  if (containersIn)
    listen(containersIn, "input", () => {
      const next = Number(containersIn.value);
      if (next !== containers) {
        containers = next;
        if (containers === 0) addLog("所有容器已停止，开始空闲计时");
        else if (mode === "sleep") addLog(`启动 ${containers} 个容器`);
      }
      paintControls();
      paint();
    });
  if (perIn)
    listen(perIn, "input", () => {
      per = Number(perIn.value);
      paintControls();
      paint();
    });
  if (speedIn)
    listen(speedIn, "input", () => {
      speed = Number(speedIn.value);
      paintControls();
    });
  if (idleIn)
    listen(idleIn, "change", () => {
      idleLimit = Number(idleIn.value);
      paintControls();
      paint();
    });
  if (playBtn)
    listen(playBtn, "click", () => {
      playing = !playing;
      paintControls();
    });
  if (wakeBtn)
    listen(wakeBtn, "click", () => {
      if (mode === "sleep") {
        mode = "wake";
        wakeLeft = WAKE;
        idle = 0;
        addLog("手动唤醒 VM…");
      } else if (containers === 0) {
        mode = "sleep";
        idle = idleLimit;
        addLog("手动让 VM 休眠");
      }
      paintControls();
      paint();
    });
  if (resetBtn) listen(resetBtn, "click", reset);

  paintControls();
  paint();
  whileVisible(
    lab,
    () => (visible = true),
    () => (visible = false),
    { threshold: 0, rootMargin: "160px 0px" },
  );
  raf = requestAnimationFrame((ts) => {
    last = ts;
    frame(ts);
  });
  teardowns.push(() => cancelAnimationFrame(raf));
}

/* --------------------------------------------------------------- platforms */

function initPlatforms(root: HTMLElement) {
  const tabs = every<HTMLButtonElement>(root, "[data-k-platform]");
  const diagram = q<HTMLElement>(root, "[data-k-diagram]");
  if (!tabs.length || !diagram) return;
  const channel = q<HTMLElement>(diagram, "[data-k-channel]");
  const guest = q<HTMLElement>(diagram, "[data-k-guest]");
  const note = q<HTMLElement>(diagram, "[data-k-guest-note]");

  tabs.forEach((tab) =>
    listen(tab, "click", () => {
      const p = platforms.find((x) => x.id === tab.dataset.kPlatform);
      if (!p) return;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", String(on));
      });
      if (channel) channel.textContent = p.channel;
      if (guest) guest.textContent = `${p.guest} · kiri-init（PID 1）`;
      if (note) note.textContent = p.guestNote;
    }),
  );
}

/* -------------------------------------------------------------------- yard */

function initYard(root: HTMLElement) {
  const yard = q<HTMLElement>(root, "[data-k-yard]");
  if (!yard) return;

  // install manifest: one panel, three real targets
  const install = q<HTMLElement>(yard, "[data-k-install]");
  if (install) {
    const tabs = every<HTMLButtonElement>(install, "[data-k-install-tab]");
    const panel = q<HTMLElement>(install, ".k-install-body");
    const label = q<HTMLElement>(install, "[data-k-install-label]");
    const cmd = q<HTMLElement>(install, "[data-k-install-cmd]");
    const copy = q<HTMLButtonElement>(install, "[data-k-install-copy]");
    const note = q<HTMLElement>(install, "[data-k-install-note]");
    const pkg = q<HTMLElement>(install, "[data-k-install-pkg]");

    const select = (tab: HTMLButtonElement) => {
      const t = installTargets.find((x) => x.id === tab.dataset.kInstallTab);
      if (!t) return;
      tabs.forEach((b) => {
        const on = b === tab;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panel?.setAttribute("aria-labelledby", tab.id);
      if (label) label.textContent = t.label;
      if (cmd) cmd.textContent = t.cmd;
      // the copy handler reads data-copy at click time, so this is all it needs
      if (copy) {
        copy.dataset.copy = t.cmd;
        copy.setAttribute("aria-label", `复制命令：${t.cmd}`);
      }
      if (note) note.textContent = t.note;
      if (pkg) pkg.textContent = t.pkg;
    };

    tabs.forEach((tab, i) => {
      tab.tabIndex = i === 0 ? 0 : -1;
      listen(tab, "click", () => select(tab));
      listen(tab, "keydown", (ev: KeyboardEvent) => {
        const step = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        ev.preventDefault();
        const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });
  }

  // reading progress readout: only written while the yard is actually rendered
  const fill = q<HTMLElement>(yard, "[data-k-quay-fill]");
  const pct = q<HTMLElement>(yard, "[data-k-quay-pct]");
  if (!fill || !pct) return;
  let shown = -1;
  const paint = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    const whole = Math.round(ratio * 100);
    if (whole === shown) return;
    shown = whole;
    // the bar and the readout share one precision, so 100% always reads full
    fill.style.setProperty("--k-quay", String(whole / 100));
    pct.textContent = `${whole}%`;
  };
  whileVisible(yard, paint, () => {}, { threshold: 0 });
  let queued = false;
  listen(
    window,
    "scroll",
    () => {
      if (queued || shown < 0) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        paint();
      });
    },
    { passive: true },
  );
}

/* -------------------------------------------------------------------- boot */

function init() {
  const root = q<HTMLElement>(document, ".kiri");
  if (!root || root.dataset.kReady === "1") return;
  root.dataset.kReady = "1";
  initChrome(root);
  initWindow(root);
  initRace(root);
  initTerminal(root);
  initShare(root);
  initResource(root);
  initPlatforms(root);
  initYard(root);
}

function cleanup() {
  teardowns.forEach((fn) => fn());
  teardowns = [];
}

document.addEventListener("astro:page-load", init);
document.addEventListener("astro:before-swap", cleanup);