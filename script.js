const video = document.getElementById("inputVideo");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const resultBox = document.getElementById("resultBox");

canvas.width = 300;
canvas.height = 300;

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
camera.start();

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // Draw landmarks
    for (let point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 1, 0, 2 * Math.PI);
      ctx.fillStyle = "#00FF00";
      ctx.fill();
    }

    // Measure face width (landmark 234 - left, 454 - right cheek)
    const left = landmarks[234];
    const right = landmarks[454];

    const dx = (right.x - left.x) * canvas.width;
    const dy = (right.y - left.y) * canvas.height;
    const faceWidthPixels = Math.sqrt(dx * dx + dy * dy);

    // Assume camera width corresponds to 150mm face (adjust as needed)
    const faceWidthMM = (faceWidthPixels / canvas.width) * 150;

    let size = "Unknown";
    if (faceWidthMM < 106) size = "Small";
    else if (faceWidthMM < 121) size = "Medium";
    else size = "Large";

    resultBox.textContent = `Recommended Mask Size: ${size} (${faceWidthMM.toFixed(1)} mm)`;
  } else {
    resultBox.textContent = "Face not detected.";
  }
}
