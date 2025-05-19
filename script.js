const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

canvasElement.width = 500;
canvasElement.height = 375;

function drawLandmarks(landmarks) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.fillStyle = 'red';
  for (const point of landmarks) {
    const x = point.x * canvasElement.width;
    const y = point.y * canvasElement.height;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 2, 0, 2 * Math.PI);
    canvasCtx.fill();
  }
}

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    drawLandmarks(landmarks);
    statusElement.textContent = 'Face detected.';
  } else {
    statusElement.textContent = 'No face detected.';
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 500,
  height: 375,
});
camera.start();
