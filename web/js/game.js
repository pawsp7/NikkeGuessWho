(() => {
  const allNikkes = Array.isArray(window.NIKKES) ? window.NIKKES : [];
  const nikkes = window.GWN.playableRoster(allNikkes);
  const boardEl = document.getElementById("board");
  const codeDisplay = document.getElementById("gridCodeDisplay");
  const codeInput = document.getElementById("gridCodeInput");
  const statusLine = document.getElementById("statusLine");
  const remainingLine = document.getElementById("remainingLine");
  const yourImg = document.getElementById("yourNikkeImg");
  const yourName = document.getElementById("yourNikkeName");
  const toastEl = document.getElementById("toast");
  const optionsModal = document.getElementById("optionsModal");
  const filePicker = document.getElementById("filePicker");
  const rowsSelect = document.getElementById("rowsSelect");
  const colsSelect = document.getElementById("colsSelect");
  const modalRowsSelect = document.getElementById("modalRowsSelect");
  const modalColsSelect = document.getElementById("modalColsSelect");

  let currentGrid = [];
  let currentCode = "";
  let currentShare = "";
  let chosenKey = null;
  let codesMap = new Map();
  let toastTimer = 0;
  let syncingSize = false;

  const manufacturerClass = {
    Tetra: "m-tetra",
    Elysion: "m-elysion",
    Missilis: "m-missilis",
    Pilgrim: "m-pilgrim",
    Abnormal: "m-abnormal",
  };

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function portraitSrc(nikke) {
    return `portraits/${nikke.img}.webp`;
  }

  function nikkeKey(nikke) {
    return nikke.url || String(nikke.id);
  }

  function fillSizeSelect(select) {
    select.replaceChildren();
    for (let n = window.GWN.MIN_DIM; n <= window.GWN.MAX_DIM; n += 1) {
      const option = document.createElement("option");
      option.value = String(n);
      option.textContent = String(n);
      select.append(option);
    }
  }

  function readSize() {
    return window.GWN.normalizeSize(rowsSelect.value, colsSelect.value, nikkes.length);
  }

  function setSize(rows, cols, persist) {
    const size = window.GWN.normalizeSize(rows, cols, nikkes.length);
    syncingSize = true;
    rowsSelect.value = String(size.rows);
    colsSelect.value = String(size.cols);
    if (modalRowsSelect) modalRowsSelect.value = String(size.rows);
    if (modalColsSelect) modalColsSelect.value = String(size.cols);
    syncingSize = false;
    if (persist !== false) {
      try {
        localStorage.setItem("gwn-board-size", JSON.stringify({ rows: size.rows, cols: size.cols }));
      } catch (_err) {
        /* ignore quota */
      }
    }
    return size;
  }

  function loadSavedSize() {
    try {
      const saved = JSON.parse(localStorage.getItem("gwn-board-size") || "null");
      if (saved && saved.rows && saved.cols) return setSize(saved.rows, saved.cols, false);
    } catch (_err) {
      /* ignore */
    }
    return setSize(window.GWN.DEFAULT_ROWS, window.GWN.DEFAULT_COLS, false);
  }

  function updateRemaining() {
    const left = boardEl.querySelectorAll(".card:not(.eliminated)").length;
    remainingLine.textContent = `${left} remaining`;
  }

  function setYourNikke(nikke) {
    if (!nikke) {
      chosenKey = null;
      yourImg.src = "ui/nikke_placeholder.png";
      yourName.textContent = "";
      boardEl.querySelectorAll(".card.chosen").forEach((el) => el.classList.remove("chosen"));
      return;
    }
    chosenKey = nikkeKey(nikke);
    yourImg.src = portraitSrc(nikke);
    yourName.textContent = nikke.name;
    boardEl.querySelectorAll(".card").forEach((el) => {
      el.classList.toggle("chosen", el.dataset.key === chosenKey);
    });
  }

  function renderBoard(grid, cols) {
    boardEl.style.setProperty("--cols", String(cols));
    boardEl.replaceChildren();
    grid.forEach((nikke) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.dataset.key = nikkeKey(nikke);
      card.title = [
        nikke.name,
        nikke.rarity,
        nikke.manufacturer,
        nikke.class,
        `Burst ${window.GWN.burstLabel(nikke.burst)}`,
        nikke.element,
        nikke.weapon,
      ]
        .filter(Boolean)
        .join(" · ");

      const img = document.createElement("img");
      img.src = portraitSrc(nikke);
      img.alt = nikke.name;
      img.draggable = false;

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = nikke.name;

      const meta = document.createElement("div");
      meta.className = "meta";
      const mfr = document.createElement("span");
      mfr.className = `pill ${manufacturerClass[nikke.manufacturer] || "m-other"}`;
      mfr.textContent = (nikke.manufacturer || "?").slice(0, 3).toUpperCase();
      const burst = document.createElement("span");
      burst.className = "pill m-other";
      burst.textContent = window.GWN.burstLabel(nikke.burst);
      meta.append(mfr, burst);

      card.append(img, name, meta);

      card.addEventListener("click", () => {
        card.classList.toggle("eliminated");
        updateRemaining();
      });
      card.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (chosenKey === nikkeKey(nikke)) {
          setYourNikke(null);
        } else {
          setYourNikke(nikke);
        }
      });

      boardEl.append(card);
    });
    updateRemaining();
  }

  function applyGrid(resolved) {
    currentCode = resolved.code;
    currentShare = resolved.share;
    currentGrid = resolved.grid;
    setSize(resolved.rows, resolved.cols);
    codeDisplay.value = resolved.share;
    setYourNikke(null);
    renderBoard(resolved.grid, resolved.cols);
    statusLine.textContent = `${nikkes.length} Nikkes · ${resolved.rows}×${resolved.cols} board`;
  }

  function randomize() {
    const size = readSize();
    if (codesMap.size > 0) {
      const matching = Array.from(codesMap.values()).filter((entry) => {
        if (!entry.rows || !entry.cols) return entry.slugs.length === size.size;
        return entry.rows === size.rows && entry.cols === size.cols;
      });
      const pool = matching.length ? matching : Array.from(codesMap.values());
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const resolved = window.GWN.resolveGrid(nikkes, window.GWN.formatShareCode(entry.code, entry.rows || size.rows, entry.cols || size.cols), codesMap, size.rows, size.cols);
      if (!resolved.ok) {
        showToast(resolved.error);
        return;
      }
      applyGrid(resolved);
      return;
    }
    const code = window.GWN.randomCode();
    applyGrid(window.GWN.resolveGrid(nikkes, code, null, size.rows, size.cols));
  }

  async function loadTypedCode() {
    const size = readSize();
    let raw = codeInput.value.trim();
    if (!raw) {
      try {
        raw = (await navigator.clipboard.readText()).trim();
        if (raw) codeInput.value = raw;
      } catch (_err) {
        raw = "";
      }
    }
    if (!raw) {
      codeInput.focus();
      showToast("Paste a grid code, then click Load grid.");
      return;
    }
    const resolved = window.GWN.resolveGrid(nikkes, raw, codesMap, size.rows, size.cols);
    if (!resolved.ok) {
      codeInput.focus();
      showToast(resolved.error);
      return;
    }
    applyGrid(resolved);
    showToast(`Loaded ${resolved.share}`);
  }

  async function copyCode() {
    if (!currentShare) {
      showToast("Randomize a grid first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentShare);
      showToast("Grid code copied.");
    } catch (_err) {
      codeDisplay.select();
      document.execCommand("copy");
      showToast("Grid code copied.");
    }
  }

  function downloadCodes() {
    const size = readSize();
    const text = window.GWN.generateCodeFile(nikkes, 1000, Math.random, size.rows, size.cols);
    codesMap = window.GWN.parseGridCodes(text);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gridCodes.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Saved gridCodes.txt — send it to a friend.");
    optionsModal.hidden = true;
    randomize();
  }

  function onFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      codesMap = window.GWN.parseGridCodes(String(reader.result || ""));
      if (codesMap.size === 0) {
        showToast("No valid grid codes in that file.");
        return;
      }
      optionsModal.hidden = true;
      randomize();
      showToast(`Loaded ${codesMap.size} grid codes.`);
    };
    reader.readAsText(file);
  }

  function onSizeChange(sourceRows, sourceCols) {
    if (syncingSize) return;
    setSize(sourceRows.value, sourceCols.value);
    if (currentGrid.length) randomize();
  }

  fillSizeSelect(rowsSelect);
  fillSizeSelect(colsSelect);
  fillSizeSelect(modalRowsSelect);
  fillSizeSelect(modalColsSelect);
  loadSavedSize();

  if (!nikkes.length || nikkes.length < window.GWN.MIN_DIM * window.GWN.MIN_DIM) {
    statusLine.textContent = "Nikke roster failed to load.";
    return;
  }

  document.getElementById("randomizeBtn").addEventListener("click", randomize);
  document.getElementById("copyBtn").addEventListener("click", copyCode);
  document.getElementById("loadBtn").addEventListener("click", loadTypedCode);
  document.getElementById("optionsBtn").addEventListener("click", () => {
    optionsModal.hidden = false;
  });
  document.getElementById("playNowBtn").addEventListener("click", () => {
    codesMap = new Map();
    setSize(modalRowsSelect.value, modalColsSelect.value);
    optionsModal.hidden = true;
    randomize();
  });
  document.getElementById("generateBtn").addEventListener("click", downloadCodes);
  document.getElementById("loadFileBtn").addEventListener("click", () => filePicker.click());
  filePicker.addEventListener("change", onFile);
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadTypedCode();
  });
  rowsSelect.addEventListener("change", () => onSizeChange(rowsSelect, colsSelect));
  colsSelect.addEventListener("change", () => onSizeChange(rowsSelect, colsSelect));
  modalRowsSelect.addEventListener("change", () => onSizeChange(modalRowsSelect, modalColsSelect));
  modalColsSelect.addEventListener("change", () => onSizeChange(modalRowsSelect, modalColsSelect));
  document.querySelectorAll(".credit a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (typeof window.openExternal === "function") {
        event.preventDefault();
        window.openExternal(link.href);
      }
    });
  });
})();
