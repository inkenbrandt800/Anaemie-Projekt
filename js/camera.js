
let stream = null;
export function capture() {
    document.getElementById("noFingernailsDetected").style.display = "none"
    document.getElementById("canvas").style.display = "none";
    document.getElementById("video").style.display = "block"
    document.getElementById("confirmBoxes").style.display = "none"
    document.getElementById("selectBoxes").style.display = "none"
    document.getElementById("analyze").style.display = "block"
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(videoStream => {
            stream = videoStream;
            document.getElementById("video").srcObject = stream;

            document.getElementById("takePhoto").style.display = "block";
            document.getElementById("takePhotoAgain").style.display = "none";
            document.getElementById("openCam").style.display = "none";
            document.getElementById("analyze").style.display = "none";
        })
        .catch(err => {
            console.error("Kamera-Zugriff verweigert: ", err);
        });
}

export function takePhoto() {
    let canvas = document.getElementById("canvas")
    let video = document.getElementById("video")

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.style.display = "block";
    video.style.display = "none";

    document.getElementById("takePhoto").style.display = "none";
    document.getElementById("takePhotoAgain").style.display = "block";
    document.getElementById("analyze").style.display = "block";

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    let imageUrl = canvas.toDataURL("image/png")
    sessionStorage.setItem("picture", imageUrl)
}

window.capture = capture
window.takePhoto = takePhoto