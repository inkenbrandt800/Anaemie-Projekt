import {checkSymptoms, updateSportWarning} from "./daily.js";

let BACKEND_URL = ""
fetch('./config.json')
    .then(res => res.json())
    .then(config => {
        BACKEND_URL = config.BACKEND_URL
    });

let historyChart = null;

function stampToDate(timestamp){
    const date = new Date(timestamp)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
}

// Initialize history chart when the DOM is loaded
export function initializeHistoryChart() {
    const chartCanvas = document.getElementById('historyChart');
    if (chartCanvas) {
        historyChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Hämoglobinwert Verlauf',
                    data: [],
                    borderColor: '#2196F3',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 100,
                        max: 180
                    }
                }
            }
        });
    }
}

export async function updateHistoryChart() {
    if (historyChart) {
        await axios.get(BACKEND_URL + "/hb?uid=" + localStorage.getItem("uid"), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                "Content-Type": "multipart/form-data"
            }
        }).then(res => {
            historyChart.data.labels = res.data.map(d => d.date);
            historyChart.data.datasets[0].data = res.data.map(d => d.value);
            historyChart.update()
        })

        axios.get(BACKEND_URL + "/last-hb?uid=" + localStorage.getItem("uid"), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                "Content-Type": "multipart/form-data"
            }
        }).then(res => {
            console.log("Resp", res.data)
            let difference = ""
            if(sessionStorage.getItem("hb") !== null){
                difference = Math.floor(sessionStorage.getItem("hb") - res.data.value)
                difference = (difference > 0 ? "+" : "") + difference
            }
            sessionStorage.setItem("lasthb_date", res.data.date)
            sessionStorage.setItem("lasthb_difference", difference)
            document.getElementById("lastTest").textContent = res.data.date
            document.getElementById("change").textContent = difference
        })
    }
}

// convert images/files into "blob" to be readable for the backend
export function convertDataUrlToBlob(dataUrl){
    let arr = dataUrl.split(',');
    let mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while(n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export function detectNails() {
    // Convert picture to blob
    let imageBlob = convertDataUrlToBlob(sessionStorage.getItem("picture"));

    let formData = new FormData()
    formData.append("file", imageBlob, "image.png")

    // Send picture to Backend
    axios.post(BACKEND_URL + "/nails/detect", formData, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "multipart/form-data"
        }
    }).then(res => {

        // Process backend response and do something with the detection boxes (?)
        if(res.data.bboxes.length > 0){
            let canvas = document.getElementById("canvas")
            const ctx = canvas.getContext('2d')
            const img = new Image();
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.font = "16px Arial";
                ctx.textBaseline = "top";
                res.data.bboxes.forEach((box, index) => {
                    const width = box.x2 - box.x1;
                    const height = box.y2 - box.y1;
                    ctx.strokeRect(box.x1, box.y1, width, height);
                    ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
                    const text = (index + 1).toString();
                    const textWidth = ctx.measureText(text).width;
                    const padding = 4;
                    ctx.fillRect(box.x1, box.y1, textWidth + padding * 2, 20);

                    ctx.fillStyle = "white";
                    ctx.fillText(text, box.x1 + padding, box.y1 + 2);
                });
            };

            // Show select and confirm boxes for nail detection boxes -> not functional somehow
            img.src = res.data.annotated;
            document.getElementById("selectBoxes").style.display = "block"
            document.getElementById("confirmBoxes").style.display = "block"
        } else {
            // Show error message if no nails were found
            document.getElementById("noFingernailsDetected").style.display = "block"
        }
        // hide "Analysieren" button
        document.getElementById("analyze").style.display = "none"

    })
}

// View option to choose from correct analyzed nails
export function changeBoxes(){
    document.getElementById("selectBoxes").style.display = "none";
    document.getElementById("takePhoto").style.display = "none";
    document.getElementById("changeBoxes").style.display = "block"
    document.getElementById("takePhotoAgain").style.display = "none";
    document.getElementById("analyze").style.display = "none";
    document.getElementById("confirmBoxes").style.display = "none";
    document.getElementById("confirmEditedBoxes").style.display = "block";
}

export function submitChangedBoxes(correctBoxes) {
    document.getElementById("results").style.display = "block"
    document.getElementById("confirmBoxes").style.display = "none"
    document.getElementById("selectBoxes").style.display = "none"
    document.getElementById("confirmEditedBoxes").style.display = "none";
    document.getElementById("changeBoxes").style.display = "none"
    document.getElementById("takePhotoAgain").style.display = "block";


    let imageBlob = convertDataUrlToBlob(sessionStorage.getItem("picture"));
    let formData = new FormData()
    const date = stampToDate(Date.now())
    formData.append("file", imageBlob, "image.png")
    formData.append("uid", localStorage.getItem("uid"))
    formData.append("date", date)
    formData.append("keep_ids", correctBoxes)
    axios.post(BACKEND_URL + "/hb/predict-custom", formData, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "multipart/form-data"
        }
    }).then(res => {
        sessionStorage.setItem("hb", res.data.hb)
        updateHbValue()
        updateHistoryChart()
    })
}

// Get the hb prediction from the backend based on the detected nails
export function predictHb(){

    // show results and hide edit-buttons
    document.getElementById("results").style.display = "block"
    document.getElementById("confirmBoxes").style.display = "none"
    document.getElementById("selectBoxes").style.display = "none"

    // send analyzed picture to backend
    let imageBlob = convertDataUrlToBlob(sessionStorage.getItem("picture"));
    let formData = new FormData()
    const date = stampToDate(Date.now())
    formData.append("file", imageBlob, "image.png")
    formData.append("uid", localStorage.getItem("uid"))
    formData.append("date", date)
    axios.post(BACKEND_URL + "/hb/predict", formData, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "multipart/form-data"
        }
    }).then(res => {
        // save hb value locally (session) and updateHbValue() to show it to the user
        sessionStorage.setItem("hb", res.data.hb)
        updateHbValue()
        updateHistoryChart()
    })
}

export function updateHbValue() {
    const hemoglobinValue = document.getElementById("hemoglobinValue")
    const hemoglobinBar = document.getElementById('hemoglobinBar');
    const recommendationBox = document.getElementById("recommendation")

    let value = sessionStorage.getItem("hb")
    if (hemoglobinBar) {
        // calculate status of the hb bar
        const percentage = ((value - 100) / (180 - 100)) * 100;
        hemoglobinBar.style.width = `${percentage}%`;
    }

    hemoglobinValue.innerText = value + " g/L"

    let color;
    let recommendation;

    // showing recommendations and matching colors depending on the hb value
    if (value < 120) {
        color = "var(--danger-dark)";
        hemoglobinBar.style.background = "linear-gradient(90deg, var(--danger-light), var(--danger-dark))"
        recommendation = 'Niedriger Hämoglobinwert<br />Ärztliche Untersuchung empfohlen';
        recommendationBox.style.background = "var(--danger-light)"
        recommendationBox.style.borderLeft = "4px solid var(--danger-dark)"
    } else if (value > 160) {
        color = "var(--danger-dark)";
        hemoglobinBar.style.background = "linear-gradient(90deg, var(--danger-light), var(--danger-dark))"
        recommendation = 'Erhöhter Hämoglobinwert<br />Ärztliche Kontrolle empfohlen';
        recommendationBox.style.background = "var(--danger-light)"
        recommendationBox.style.borderLeft = "4px solid var(--danger-dark)"
    } else {
        color = "var(--primary-dark)";
        recommendation = 'Normaler Hämoglobinwert<br />Keine Maßnahmen erforderlich';
    }
    hemoglobinValue.style.color = color;

    const recommendationElement = document.getElementById('recommendation');
    if (recommendationElement) {
        recommendationElement.innerHTML = `
            <p>${recommendation}</p>
        `;
    }
}

// --- NOT FUNCTIONAL ---
export function exportPDF() {
    alert('PDF-Export-Funktion wird implementiert');
}

// --- NOT FUNCTIONAL / NOT TESTED ---
export function shareResults() {
    if (navigator.share) {
        navigator.share({
            title: 'Meine Anämie-Testergebnisse',
            text: `Hämoglobinwert: ${document.getElementById('hemoglobinValue').textContent}`
        }).catch(console.error);
    } else {
        alert('Teilen-Funktion nicht verfügbar');
    }
}

// Globaler Event-Listener für Klicks außerhalb der Modals
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Initialize everything on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {

    // Initialize Chart if it exists
    initializeHistoryChart();
    
    // Set up symptom checkboxes
    document.querySelectorAll('.symptom-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', checkSymptoms);
    });

    // Set up sport type radio buttons
    document.querySelectorAll('input[name="sport-type"]').forEach(radio => {
        radio.addEventListener('change', updateSportWarning);
    });

    // Set up duration input
    const durationInput = document.getElementById('duration');
    if (durationInput) {
        durationInput.addEventListener('input', updateSportWarning);
    }

    const commentInput = document.getElementById('activities')
    if(commentInput) {
        commentInput.addEventListener('input', updateSportWarning)
    }

    // Set up intensity buttons
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectIntensity(this);
        });
    });
});

window.detectNails = detectNails
window.changeBoxes = changeBoxes
window.predictHb = predictHb
window.updateHbValue = updateHbValue
window.exportPDF = exportPDF
window.shareResults = shareResults
window.initializeHistoryChart = initializeHistoryChart
window.updateHistoryChart = updateHistoryChart