
const binaryInput = document.getElementById("binaryInput");
const startBtn = document.getElementById("startBtn");
const stepBtn = document.getElementById("stepBtn");
const autoBtn = document.getElementById("autoBtn");
const resetBtn = document.getElementById("resetBtn");

const tapeContainer = document.getElementById("tapeContainer");
const currentState = document.getElementById("currentState");
const headPosition = document.getElementById("headPosition");
const stepCount = document.getElementById("stepCount");
const statusMessage = document.getElementById("statusMessage");
const originalInput = document.getElementById("originalInput");
const finalOutput = document.getElementById("finalOutput");
const errorMessage = document.getElementById("errorMessage");

const BLANK = "□";

let tape = new Map();
let head = 0;
let state = "q0";
let steps = 0;
let running = false;
let finished = false;
let autoTimer = null;

// The same transition rules used in JFLAP
const transitions = {
  q0: {
    "0": { write: "0", move: 1, next: "q0" },
    "1": { write: "1", move: 1, next: "q0" },
    [BLANK]: { write: BLANK, move: -1, next: "q1" }
  },

  q1: {
    "1": { write: "0", move: -1, next: "q1" },
    "0": { write: "1", move: 1, next: "q2" },
    [BLANK]: { write: "1", move: 1, next: "q2" }
  }
};

function readCell(position) {
  return tape.get(position) ?? BLANK;
}

function writeCell(position, symbol) {
  if (symbol === BLANK) {
    tape.delete(position);
  } else {
    tape.set(position, symbol);
  }
}

function getTapeOutput() {
  const positions = [...tape.keys()].sort((a, b) => a - b);

  return positions.map(position => tape.get(position)).join("");
}

function renderTape() {
  tapeContainer.innerHTML = "";

  const positions = [...tape.keys()];
  const min = Math.min(-1, head - 2, ...positions);
  const max = Math.max(5, head + 2, ...positions);

  for (let i = min; i <= max; i++) {
    const cell = document.createElement("div");

    cell.className = "tape-cell";
    cell.textContent = readCell(i);

    if (i === head) {
      cell.classList.add("active");
    }

    tapeContainer.appendChild(cell);
  }

  const activeCell = tapeContainer.querySelector(".active");

  if (activeCell) {
    activeCell.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }

  currentState.textContent = state;
  headPosition.textContent = head;
  stepCount.textContent = steps;
}

function startMachine() {
  stopAutoRun();

  const input = binaryInput.value.trim();

  if (!/^[01]+$/.test(input)) {
    errorMessage.textContent =
      "Please enter a valid binary number containing only 0 and 1.";
    return;
  }

  errorMessage.textContent = "";

  tape = new Map();

  for (let i = 0; i < input.length; i++) {
    tape.set(i, input[i]);
  }

  head = 0;
  state = "q0";
  steps = 0;
  running = true;
  finished = false;

  originalInput.textContent = input;
  finalOutput.textContent = "—";

  statusMessage.textContent =
    "Machine initialized. Click Next Step or Auto Run.";

  stepBtn.disabled = false;
  autoBtn.disabled = false;

  renderTape();
}

function nextStep() {
  if (!running || finished) return;

  const symbol = readCell(head);
  const transition = transitions[state]?.[symbol];

  if (!transition) {
    stopAutoRun();
    running = false;
    finished = true;

    statusMessage.textContent =
      "Machine halted: no valid transition found.";

    stepBtn.disabled = true;
    autoBtn.disabled = true;
    return;
  }

  const previousState = state;
  const previousHead = head;

  writeCell(head, transition.write);
  head += transition.move;
  state = transition.next;
  steps++;

  const direction = transition.move === 1 ? "Right" : "Left";

  statusMessage.textContent =
    `${previousState}: Read ${symbol}, ` +
    `write ${transition.write}, move ${direction}, ` +
    `enter ${state}.`;

  renderTape();

  if (state === "q2") {
    running = false;
    finished = true;

    stopAutoRun();

    finalOutput.textContent = getTapeOutput();

    statusMessage.textContent =
      "Accepted! Binary increment completed successfully.";

    stepBtn.disabled = true;
    autoBtn.disabled = true;
  }
}

function stopAutoRun() {
  if (autoTimer !== null) {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  autoBtn.textContent = "Auto Run";
}

function toggleAutoRun() {
  if (!running || finished) return;

  if (autoTimer !== null) {
    stopAutoRun();
    return;
  }

  autoBtn.textContent = "Pause";
  stepBtn.disabled = true;

  autoTimer = setInterval(() => {
    nextStep();

    if (finished) {
      stopAutoRun();
    }
  }, 650);
}

function resetMachine() {
  stopAutoRun();

  tape = new Map();
  head = 0;
  state = "q0";
  steps = 0;
  running = false;
  finished = false;

  tapeContainer.innerHTML = "";
  currentState.textContent = "q0";
  headPosition.textContent = "—";
  stepCount.textContent = "0";

  originalInput.textContent = "—";
  finalOutput.textContent = "—";

  errorMessage.textContent = "";

  statusMessage.textContent =
    "Enter a binary number and click Start.";

  stepBtn.disabled = true;
  autoBtn.disabled = true;
}

startBtn.addEventListener("click", startMachine);
stepBtn.addEventListener("click", nextStep);
autoBtn.addEventListener("click", toggleAutoRun);
resetBtn.addEventListener("click", resetMachine);


/* ===== JFLAP FILE CONNECTION ===== */

const jflapFile = document.getElementById("jflapFile");
const jflapStatus = document.getElementById("jflapStatus");

let jflapTransitions = null;
let jflapInitialState = null;
let jflapFinalStates = new Set();

jflapFile.addEventListener("change", async function () {
  const file = this.files[0];

  if (!file) return;

  // Stop any previous simulation
  resetMachine();

  jflapTransitions = null;
  jflapInitialState = null;
  jflapFinalStates = new Set();

  try {
    const xmlText = await file.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(
      xmlText,
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("Invalid XML file.");
    }

    const automaton = xml.querySelector("automaton");

    if (!automaton) {
      throw new Error("No JFLAP automaton found.");
    }

    
const states = automaton.querySelectorAll("state, block");const stateNames = new Map();

states.forEach(stateElement => {
  const id = stateElement.getAttribute("id");
  const name = stateElement.getAttribute("name") || id;

  stateNames.set(id, name);

  // Detect initial and final states from JFLAP XML
  const childTags = Array.from(stateElement.children)
    .map(child => child.tagName.toLowerCase());

  if (childTags.includes("initial")) {
    jflapInitialState = name;
  }

  if (childTags.includes("final")) {
    jflapFinalStates.add(name);
  }
});

// Show exactly what the parser detected
console.log("States found:", [...stateNames.values()]);
console.log("Initial state:", jflapInitialState);
console.log("Final states:", [...jflapFinalStates]);

    // Check initial and final states
    if (!jflapInitialState || jflapFinalStates.size === 0) {
      throw new Error(
        "The JFLAP file needs an initial and a final state."
      );
    }

    // Read transitions from JFLAP
    const importedTransitions = {};

    automaton.querySelectorAll("transition").forEach(t => {
      const fromId = t.querySelector("from")?.textContent.trim();
      const toId = t.querySelector("to")?.textContent.trim();

      const from = stateNames.get(fromId);
      const to = stateNames.get(toId);

      const read = t.querySelector("read")?.textContent || BLANK;
      const write = t.querySelector("write")?.textContent || BLANK;

      const direction = t.querySelector("move")?.textContent.trim();

      const move =
        direction === "R" ? 1 :
        direction === "L" ? -1 : 0;

      if (!from || !to) {
        throw new Error(
          "A transition references an unknown state."
        );
      }

      if (!importedTransitions[from]) {
        importedTransitions[from] = {};
      }

      if (importedTransitions[from][read]) {
        throw new Error(
          "Multiple transitions for the same state and symbol."
        );
      }

      importedTransitions[from][read] = {
        write: write,
        move: move,
        next: to
      };
    });

    // Store the imported machine
    jflapTransitions = importedTransitions;

    // Show success message
    jflapStatus.textContent =
      `Loaded: ${file.name} | ` +
      `${states.length} states | ` +
      `${automaton.querySelectorAll("transition").length} transitions`;

    jflapStatus.style.color = "#4ade80";

  } catch (error) {
    jflapStatus.textContent = "Error: " + error.message;
    jflapStatus.style.color = "#f87171";

    console.error("JFLAP loading error:", error);
  }
});
