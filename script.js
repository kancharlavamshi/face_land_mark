const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");
const captureBtn = document.getElementById("captureBtn");
const toggleCameraBtn = document.getElementById("toggleCamera");

let currentStream;
let useFrontCamera = true;

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
}

async function startCamera() {
  stopCamera();
  try {
    const constraints = {
      video: {
        facingMode: useFrontCamera ? "user" : "environment",
        width: { ideal: 720 },
        height: { ideal: 960 }
      }
    };
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
  } catch (error) {
    resultBox.textContent = "Camera not available.";
  }
}

toggleCameraBtn.onclick = () => {
  useFrontCamera = !useFrontCamera;
  startCamera();
};

startCamera();

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

faceMesh.onResults(onResults);

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks.length) {
    resultBox.textContent = "Face not detected.";
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];

  // Draw landmarks
  landmarks.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#00FF00";
    ctx.fill();
  });

  // Measure nose to chin
  const nose = landmarks[1];
  const chin = landmarks[152];
  const dy = (chin.y - nose.y) * canvas.height;
  const faceHeightMM = (dy / canvas.height) * 120; // Approx. if phone is 30cm away

  let size = "Unknown";
  if (faceHeightMM < 85) size = "Small";
  else if (faceHeightMM < 100) size = "Medium";
  else size = "Large";

  resultBox.textContent = `Recommended Mask Size: ${size} (${faceHeightMM.toFixed(1)} mm)`;
}

captureBtn.onclick = async () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  await faceMesh.send({ image: canvas });
};
