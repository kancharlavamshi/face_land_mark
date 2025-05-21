const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");

canvas.width = 300;
canvas.height = 400;

let currentStream;
let useFrontCamera = true;

// FaceMesh Setup
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

// Start Camera
async function startCamera() {
  stopCamera();
  const constraints = {
    video: {
      facingMode: useFrontCamera ? "user" : "environment",
      width: { ideal: 720 },
      height: { ideal: 960 }
    },
    audio: false
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    video.play();
  } catch (err) {
    resultBox.textContent = "Camera not accessible.";
  }
}

// Stop current camera stream
function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Toggle Camera
document.getElementById("toggleCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

// Manual Capture
document.getElementById("captureBtn").addEventListener("click", () => {
  faceMesh.send({ image: video });
});

// Handle FaceMesh results
function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // Draw landmarks
    for (let point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#00FF00";
      ctx.fill();
    }

    const top = landmarks[168]; // bridge of nose
    const bottom = landmarks[8]; // chin
    const dx = (bottom.x - top.x) * canvas.width;
    const dy = (bottom.y - top.y) * canvas.height;
    const faceHeightPx = Math.sqrt(dx * dx + dy * dy);

    // Calibrate: assume 30cm distance = ~110px = 100mm
    const faceHeightMM = (faceHeightPx / 110) * 100;

    let size = "Unknown";
    if (faceHeightMM < 95) size = "Small";
    else if (faceHeightMM < 110) size = "Medium";
    else size = "Large";

    resultBox.textContent = `Recommended Mask Size: ${size} (${faceHeightMM.toFixed(1)} mm)`;
  } else {
    resultBox.textContent = "Face not detected.";
  }
}

// Start initial camera
startCamera();
