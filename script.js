const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const message = document.getElementById('message');

let faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw face circle guide
  ctx.strokeStyle = "#00FF00";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.width/2, canvas.height/2, 150, 0, 2 * Math.PI);
  ctx.stroke();

  if (results.multiFaceLandmarks.length > 0) {
    const lm = results.multiFaceLandmarks[0];

    // Eye distance (to estimate distance from camera)
    const x1 = lm[33].x * canvas.width;
    const y1 = lm[33].y * canvas.height;
    const x2 = lm[263].x * canvas.width;
    const y2 = lm[263].y * canvas.height;
    const eyeDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    // Face width (cheek to cheek)
    const fx1 = lm[234].x * canvas.width;
    const fx2 = lm[454].x * canvas.width;
    const faceWidthPx = Math.abs(fx2 - fx1);

    if (eyeDist > 180) {
      message.innerText = "Too close – please move the phone farther.";
      return;
    } else if (eyeDist < 100) {
      message.innerText = "Too far – bring the phone a bit closer.";
      return;
    } else {
      const faceWidthMM = (faceWidthPx / 150) * 120;

      let size = "";
      if (faceWidthMM < 106) size = "Small";
      else if (faceWidthMM <= 120) size = "Medium";
      else size = "Large";

      message.innerText = `✔ Recommended Mask Size: ${size} (${faceWidthMM.toFixed(1)} mm)`;
    }
  } else {
    message.innerText = "Face not detected. Please center your face in the circle.";
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({image: video});
  },
  width: 640,
  height: 480
});
camera.start();
