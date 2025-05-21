const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");

let currentStream;
let useFrontCamera = true;

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResults);

async function startCamera() {
  stopCamera();
  resultBox.textContent = "Initializing camera...";

  const constraints = {
    video: {
      facingMode: useFrontCamera ? "user" : "environment",
      width: { ideal: 640 },
      height: { ideal: 800 },
    },
    audio: false,
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    video.onloadedmetadata = () => {
      video.play();
      updateCanvasSize();
    };
  } catch (err) {
    resultBox.textContent = "Camera access denied or not available.";
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateCanvasSize() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

document.getElementById("toggleCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

document.getElementById("captureBtn").addEventListener("click", () => {
  if (video.readyState >= 2) {
    updateCanvasSize();
    faceMesh.send({ image: video });
  }
});

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    resultBox.textContent = "No face detected.";
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];

  // Draw landmarks
  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "lime";
    ctx.fill();
  }

  const top = landmarks[168]; // nose bridge
  const bottom = landmarks[8]; // chin

  const dx = (bottom.x - top.x) * canvas.width;
  const dy = (bottom.y - top.y) * canvas.height;
  const faceHeightPx = Math.sqrt(dx * dx + dy * dy);

  // Calibrate based on estimation: 110px ≈ 95mm at ~30cm distance
  const faceHeightMM = (faceHeightPx / 110) * 95;

  let size = "Unknown";
  if (faceHeightMM < 90) size = "Small";
  else if (faceHeightMM < 101) size = "Medium";
  else size = "Large";

  resultBox.textContent = `Recommended Mask Size: ${size} (${faceHeightMM.toFixed(1)} mm)`;

  // Clear canvas and result after 3 seconds
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultBox.textContent = "Align your face and tap 'Capture'";
  }, 3000);
}

// Start the camera on load
startCamera();
