const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");

let currentStream = null;
let useFrontCamera = true;

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResults);

// Start camera with correct facing mode
async function startCamera() {
  stopCamera(); // Clear existing stream
  resultBox.textContent = "Initializing camera...";

  const constraints = {
    video: {
      facingMode: useFrontCamera ? "user" : "environment",
      width: { ideal: 640 },
      height: { ideal: 800 }
    },
    audio: false
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
    console.error("Camera error:", err);
  }
}

// Stop camera stream and clear overlay
function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Adjust canvas to video size
function updateCanvasSize() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// Toggle camera front/back
document.getElementById("toggleCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

// Handle capture button
document.getElementById("captureBtn").addEventListener("click", () => {
  if (video.readyState >= 2) {
    updateCanvasSize();
    faceMesh.send({ image: video });
  } else {
    resultBox.textContent = "Camera not ready.";
  }
});

// Handle results from FaceMesh
function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    resultBox.textContent = "No face detected.";
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];

  // Draw face landmarks
  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "lime";
    ctx.fill();
  }

  // Measure distance from nose bridge (168) to chin (8)
  const top = landmarks[168];  // Nose bridge
  const bottom = landmarks[8]; // Chin

  const dx = (bottom.x - top.x) * canvas.width;
  const dy = (bottom.y - top.y) * canvas.height;
  const faceHeightPx = Math.sqrt(dx * dx + dy * dy);

  // Calibration: assume 110 pixels ≈ 100 mm at 30cm distance
  const faceHeightMM = (faceHeightPx / 110) * 100;

  let size = "Unknown";
  if (faceHeightMM < 95) size = "Small";
  else if (faceHeightMM < 110) size = "Medium";
  else size = "Large";

  resultBox.textContent = `Recommended Mask Size: ${size} (${faceHeightMM.toFixed(1)} mm)`;
}

// Start on page load
startCamera();
