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
  // Set canvas to video’s natural width/height for accurate scaling
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

  // Draw landmarks points
  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "lime";
    ctx.fill();
  }

  // Draw face outline connecting landmarks smoothly
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();

  // You can connect specific landmarks for a cleaner face outline:
  // For simplicity, connect these jawline points in order:
  const jawlineIndices = [
    127, 34, 139, 127, 162, 21, 54, 103,
    67, 109, 10, 338, 297, 332, 284, 251,
    389, 356, 454, 323, 361, 288, 397, 365,
    379, 378, 400, 377, 152, 148, 176, 149,
    150, 136, 172, 58, 132, 93, 234, 127
  ];

  jawlineIndices.forEach((idx, i) => {
    const pt = landmarks[idx];
    const x = pt.x * canvas.width;
    const y = pt.y * canvas.height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.closePath();
  ctx.stroke();

  // Calculate face height using nose bridge (168) and chin (8)
  const top = landmarks[168];
  const bottom = landmarks[8];

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

// Start the camera immediately on load
startCamera();
