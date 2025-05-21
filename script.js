let useFrontCamera = true;
const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");
const toggleBtn = document.getElementById("toggleCamera");

canvas.width = 300;
canvas.height = 300;

function startCamera() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
  }

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: useFrontCamera ? "user" : "environment",
      width: 300,
      height: 300,
    }
  }).then((stream) => {
    window.stream = stream;
    video.srcObject = stream;
  }).catch((err) => {
    resultBox.textContent = "Camera access denied or unavailable.";
  });
}

toggleBtn.onclick = () => {
  useFrontCamera = !useFrontCamera;
  startCamera();
};

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

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 300,
  height: 300,
});

startCamera();
camera.start();

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    for (let point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 1, 0, 2 * Math.PI);
      ctx.fillStyle = "#00FF00";
      ctx.fill();
    }

    const nose = landmarks[1];
    const chin = landmarks[152];
    const dy = (chin.y - nose.y) * canvas.height;

    const faceHeightMM = (dy / canvas.height) * 120; // Estimate based on ~30cm phone distance

    let size = "Unknown";
    if (faceHeightMM < 85) size = "Small";
    else if (faceHeightMM < 100) size = "Medium";
    else size = "Large";

    resultBox.textContent = `Recommended Mask Size: ${size} (${faceHeightMM.toFixed(1)} mm)`;
  } else {
    resultBox.textContent = "Face not detected. Please keep your head straight.";
  }
}
