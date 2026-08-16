(() => {
  const nikkes = Array.isArray(window.NIKKES) ? window.NIKKES : [];
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

  let currentGrid = [];
  let currentCode = "";
  let chosenKey = null;
  let codesMap = new Map();
  let toastTimer = 0;

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

  function renderBoard(grid) {
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

  function applyGrid(code, grid) {
    currentCode = code;
    currentGrid = grid;
    codeDisplay.value = code;
    setYourNikke(null);
    renderBoard(grid);
    statusLine.textContent = `${nikkes.length} Nikkes on the nikke.gg tier list · 6×6 board`;
  }

  function randomize() {
    if (codesMap.size > 0) {
      const codes = Array.from(codesMap.keys());
      const code = codes[Math.floor(Math.random() * codes.length)];
      const resolved = window.GWN.resolveGrid(nikkes, code, codesMap);
      if (!resolved.ok) {
        showToast(resolved.error);
        return;
      }
      applyGrid(resolved.code, resolved.grid);
      return;
    }
    const code = window.GWN.randomCode();
    applyGrid(code, window.GWN.selectGrid(nikkes, code));
  }

  function loadTypedCode() {
    const resolved = window.GWN.resolveGrid(nikkes, codeInput.value, codesMap);
    if (!resolved.ok) {
      showToast(resolved.error);
      return;
    }
    applyGrid(resolved.code, resolved.grid);
    showToast(`Loaded ${resolved.code}`);
  }

  async function copyCode() {
    if (!currentCode) {
      showToast("Randomize a grid first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentCode);
      showToast("Grid code copied.");
    } catch (_err) {
      codeDisplay.select();
      document.execCommand("copy");
      showToast("Grid code copied.");
    }
  }

  function downloadCodes() {
    const text = window.GWN.generateCodeFile(nikkes, 1000);
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
        showToast("No valid 36-Nikke codes in that file.");
        return;
      }
      optionsModal.hidden = true;
      randomize();
      showToast(`Loaded ${codesMap.size} grid codes.`);
    };
    reader.readAsText(file);
  }

  if (!nikkes.length || nikkes.length < window.GWN.GRID_SIZE) {
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
    optionsModal.hidden = true;
    randomize();
  });
  document.getElementById("generateBtn").addEventListener("click", downloadCodes);
  document.getElementById("loadFileBtn").addEventListener("click", () => filePicker.click());
  filePicker.addEventListener("change", onFile);
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadTypedCode();
  });
})();
