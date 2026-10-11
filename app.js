const root = document.documentElement;
const body = document.body;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const navLinks = [...document.querySelectorAll("nav a")];
const stage = document.querySelector("[data-stage]");
const portraitCanvas = document.querySelector("[data-portrait-sequence]");
const portraitContext = portraitCanvas.getContext("2d");
const gestureLabel = document.querySelector("[data-gesture-label]");
const foldLabel = document.querySelector("[data-fold-label]");
const signalLabel = document.querySelector("[data-signal-label]");
const cameraButton = document.querySelector("[data-camera-button]");
const cameraNote = document.querySelector("[data-camera-note]");
const cameraLabel = document.querySelector("[data-camera-label]");
const video = document.querySelector("[data-video]");
const handCanvas = document.querySelector("[data-hand-canvas]");
const handContext = handCanvas.getContext("2d");
const toast = document.querySelector("[data-toast]");

const portraitSprite = new Image();
portraitSprite.src = "portrait-sequence.jpg";

let portraitReady = false;
let fold = 0;
let targetFold = 0;
let cameraMode = false;
let handModel = null;
let cameraStream = null;
let animationFrame = null;
let toastTimeout = null;

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function drawSpriteFrame(frame, opacity = 1) {
  const column = frame % 3;
  const row = Math.floor(frame / 3);
  const sourceWidth = portraitSprite.naturalWidth / 3;
  let sourceHeight = portraitSprite.naturalHeight / 3;
  let sourceY = row * sourceHeight;

  // The middle-row sculptures slightly overlap the final row in the supplied contact sheet.
  // Trim that overlap so the fully compressed states remain isolated on black.
  if (row === 2) {
    sourceY += 25;
    sourceHeight -= 25;
  }

  portraitContext.globalAlpha = opacity;
  portraitContext.drawImage(
    portraitSprite,
    column * sourceWidth,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    portraitCanvas.width,
    portraitCanvas.height,
  );
}

function drawPortrait(progress) {
  if (!portraitReady) return;

  const position = clamp(progress) * 8;
  const current = Math.floor(position);
  const next = Math.min(8, current + 1);
  const blend = position - current;

  portraitContext.globalAlpha = 1;
  portraitContext.fillStyle = "#030405";
  portraitContext.fillRect(0, 0, portraitCanvas.width, portraitCanvas.height);
  drawSpriteFrame(current, 1);
  if (next !== current && blend > 0.025) drawSpriteFrame(next, blend);
  portraitContext.globalAlpha = 1;
}

portraitSprite.addEventListener("load", () => {
  portraitReady = true;
  drawPortrait(0);
});

function updateFoldVisuals() {
  fold += (targetFold - fold) * (cameraMode ? 0.16 : 0.11);
  if (Math.abs(targetFold - fold) < 0.0005) fold = targetFold;

  const eased = fold * fold * (3 - 2 * fold);
  root.style.setProperty("--fold", eased.toFixed(4));
  foldLabel.textContent = String(Math.round(eased * 100)).padStart(2, "0");
  drawPortrait(eased);
  requestAnimationFrame(updateFoldVisuals);
}

function setPointerFold(event) {
  if (cameraMode) return;
  const bounds = stage.getBoundingClientRect();
  const horizontal = clamp((event.clientX - bounds.left) / bounds.width);
  targetFold = clamp((horizontal - 0.08) / 0.84);
  gestureLabel.textContent = targetFold > 0.76 ? "compress" : targetFold > 0.2 ? "scrub" : "release";
  signalLabel.textContent = "pointer timeline";
}

stage.addEventListener("pointermove", setPointerFold);
stage.addEventListener("pointerdown", setPointerFold);
stage.addEventListener("pointerleave", () => {
  if (!cameraMode) {
    targetFold = 0;
    gestureLabel.textContent = "pointer scrub";
    signalLabel.textContent = "interactive";
  }
});

window.addEventListener("pointermove", (event) => {
  root.style.setProperty("--cursor-x", `${event.clientX}px`);
  root.style.setProperty("--cursor-y", `${event.clientY}px`);
});

document.querySelectorAll("a, button").forEach((element) => {
  element.addEventListener("pointerenter", () => body.classList.add("link-hover"));
  element.addEventListener("pointerleave", () => body.classList.remove("link-hover"));
});

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
}, { passive: true });

menuButton.addEventListener("click", () => {
  const open = !body.classList.contains("menu-open");
  body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

document.querySelectorAll("[data-tilt-card]").forEach((card) => {
  const visual = card.querySelector(".card-visual");
  card.addEventListener("pointermove", (event) => {
    const bounds = visual.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - bounds.top) / bounds.height);
    visual.style.transform = `rotateX(${(0.5 - y) * 2.4}deg) rotateY(${(x - 0.5) * 2.4}deg)`;
  });
  card.addEventListener("pointerleave", () => {
    visual.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", resolve, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

function drawHands(landmarks) {
  const width = handCanvas.width;
  const height = handCanvas.height;
  handContext.clearRect(0, 0, width, height);
  handContext.lineWidth = Math.max(3, width / 280);
  handContext.strokeStyle = "rgba(204, 255, 0, 0.96)";
  handContext.fillStyle = "#ff5c35";
  handContext.shadowColor = "rgba(204, 255, 0, 0.72)";
  handContext.shadowBlur = 10;

  handConnections.forEach(([start, end]) => {
    handContext.beginPath();
    handContext.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    handContext.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    handContext.stroke();
  });

  landmarks.forEach((point) => {
    handContext.beginPath();
    handContext.arc(point.x * width, point.y * height, Math.max(4, width / 185), 0, Math.PI * 2);
    handContext.fill();
  });
  handContext.shadowBlur = 0;
}

function analyseHand(landmarks) {
  const wrist = landmarks[0];
  const tips = [4, 8, 12, 16, 20].map((index) => landmarks[index]);
  const meanDistance = tips.reduce(
    (sum, tip) => sum + Math.hypot(tip.x - wrist.x, tip.y - wrist.y),
    0,
  ) / tips.length;
  const openness = clamp((meanDistance - 0.18) / 0.28);

  targetFold = 1 - openness;
  gestureLabel.textContent = openness > 0.72 ? "open hand" : openness < 0.35 ? "closed hand" : "folding";
  signalLabel.textContent = "hand detected";
  cameraLabel.textContent = "Camera / tracking";
}

async function startCamera() {
  cameraButton.disabled = true;
  cameraButton.querySelector("span").textContent = "Loading hand model";
  cameraNote.textContent = "Requesting local camera access…";

  try {
    await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });

    video.srcObject = cameraStream;
    await video.play();
    handCanvas.width = video.videoWidth || 960;
    handCanvas.height = video.videoHeight || 720;

    handModel = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    handModel.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.58,
      minTrackingConfidence: 0.52,
    });
    handModel.onResults((results) => {
      const landmarks = results.multiHandLandmarks?.[0];
      if (landmarks) {
        drawHands(landmarks);
        analyseHand(landmarks);
      } else {
        handContext.clearRect(0, 0, handCanvas.width, handCanvas.height);
        targetFold *= 0.92;
        gestureLabel.textContent = "show hand";
        signalLabel.textContent = "searching";
        cameraLabel.textContent = "Camera / searching";
      }
    });

    cameraMode = true;
    stage.classList.add("camera-active");
    cameraButton.querySelector("span").textContent = "Stop hand tracking";
    cameraButton.querySelector("b").textContent = "×";
    cameraButton.disabled = false;
    cameraNote.textContent = "Open your hand to release the portrait; close it to compress.";
    cameraLabel.textContent = "Camera / searching";
    showToast("Hand tracking is live");

    const detect = async () => {
      if (!cameraMode) return;
      if (video.readyState >= 2) await handModel.send({ image: video });
      animationFrame = requestAnimationFrame(detect);
    };
    detect();
  } catch (error) {
    stopCamera();
    cameraNote.textContent = "Camera or MediaPipe was unavailable. Pointer scrubbing remains active.";
    showToast("Camera unavailable — pointer mode active");
  }
}

function stopCamera() {
  cameraMode = false;
  stage.classList.remove("camera-active");
  window.cancelAnimationFrame(animationFrame);
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  video.srcObject = null;
  handContext.clearRect(0, 0, handCanvas.width, handCanvas.height);
  targetFold = 0;
  gestureLabel.textContent = "pointer scrub";
  signalLabel.textContent = "interactive";
  cameraLabel.textContent = "Camera / standby";
  cameraButton.querySelector("span").textContent = "Enable hand tracking";
  cameraButton.querySelector("b").textContent = "◎";
  cameraButton.disabled = false;
  cameraNote.textContent = "Optional. Camera frames stay in your browser and are not recorded.";
}

cameraButton.addEventListener("click", () => {
  if (cameraMode) stopCamera();
  else startCamera();
});

document.querySelector("[data-copy-link]").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Portfolio link copied");
  } catch {
    showToast("Copy unavailable in this browser");
  }
});

window.addEventListener("pagehide", stopCamera);
requestAnimationFrame(updateFoldVisuals);
