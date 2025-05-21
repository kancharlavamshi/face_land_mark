let currentStream;
let useFrontCamera = true;

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
    resultBox.textContent = "Camera access denied or not available.";
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

document.getElementById("toggleCamera").addEventListener("click", async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera();
});

startCamera();
