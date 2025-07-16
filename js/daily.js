let BACKEND_URL = ""
fetch('./config.json')
    .then(res => res.json())
    .then(config => {
        BACKEND_URL = config.BACKEND_URL
    });

export function saveMood() {
    if(sessionStorage.getItem("mood") !== null){
        document.getElementById("symptoms-section").style.display = "block"
        document.getElementById("saveMood").style.display = "none"
        document.getElementById("moodError").style.display = "none"
    } else {
        document.getElementById("moodError").style.display = "block"
    }
}

export function saveSymptoms() {
    if(sessionStorage.getItem("symptoms") !== null && sessionStorage.getItem("symptoms") !== "[]"){
        document.getElementById("tracking-section").style.display = "block"
        document.getElementById("saveSymptoms").style.display = "none"
        document.getElementById("symptomsError").style.display = "none"
    } else {
        document.getElementById("symptomsError").style.display = "block"
    }

}

export function savePeriod() {
    if(sessionStorage.getItem("period") !== null){
        document.getElementById("periodError").style.display = "none"
        document.getElementById("sports-section").style.display = "block"
        document.getElementById("savePeriod").style.display = "none"
    } else {
        document.getElementById("periodError").style.display = "block"
    }
}

export async function saveSport() {
    if(sessionStorage.getItem("sport_type") !== null && sessionStorage.getItem("sport_intensity") !== null && sessionStorage.getItem("sport_duration") !== null){
        let body = {
            uid: localStorage.getItem("uid"),
            mood: sessionStorage.getItem("mood"),
            symptoms: JSON.parse(sessionStorage.getItem("symptoms")),
            period: sessionStorage.getItem("period"),
            sport: {
                type: sessionStorage.getItem("sport_type"),
                intensity: sessionStorage.getItem("sport_intensity"),
                duration: sessionStorage.getItem("sport_duration"),
                comment: sessionStorage.getItem("sport_comment")
            },
            date: Date.now()
        }
        await axios.post(BACKEND_URL + "/daily", body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(resp => {
            if(resp.status === 200){
                document.getElementById("successMessage").style.display = "block"
                document.getElementById("mood-section").style.display = "none"
                document.getElementById("symptoms-section").style.display = "none"
                document.getElementById("tracking-section").style.display = "none"
                document.getElementById("sports-section").style.display = "none"
                sessionStorage.setItem("uploadedDaily", "true")
            }
        })
    }
}

// Stimmungs-Funktion
export function selectMood(element) {
    document.getElementById("moodError").style.display = "none"

    document.querySelectorAll('.mood-option').forEach(option => {
        option.classList.remove('selected');
    });

    element.classList.add('selected');
    const mood = element.getAttribute('data-mood');
    const responseElement = document.getElementById('moodResponse');

    if (!responseElement) return;

    let response = '';
    let responseColor = '';

    switch(mood) {
        case 'glücklich':
            response = 'Wie schön, dass du heute glücklich bist! 🌟';
            responseColor = '#4CAF50';
            sessionStorage.setItem("mood", "glücklich")
            break;
        case 'entspannt':
            response = 'Toll, dass du dich entspannt fühlst! 🌸';
            responseColor = '#2196F3';
            sessionStorage.setItem("mood", "entspannt")
            break;
        case 'gestresst':
            response = 'Stress kann sehr belastend sein. Denk daran, kleine Pausen einzulegen! 🍃';
            responseColor = '#FFC107';
            sessionStorage.setItem("mood", "gestresst")
            break;
        case 'traurig':
            response = 'Schade, dass du heute traurig bist. Morgen wird bestimmt ein besserer Tag! 💝';
            responseColor = '#E91E63';
            sessionStorage.setItem("mood", "traurig")
            break;
    }

    responseElement.style.backgroundColor = responseColor + '20';
    responseElement.style.color = responseColor;
    responseElement.innerHTML = response;
    responseElement.classList.add('show');
}

// Menstruations-Funktion
export function selectMenstruation(element) {
    document.getElementById("periodError").style.display = "none"
    document.querySelectorAll('.menstruation-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');
    const intensity = element.getAttribute('data-value');
    sessionStorage.setItem("period", intensity)
    const warningElement = document.getElementById('menstruationWarning');

    if (!warningElement) return;

    if (intensity === 'stark') {
        warningElement.innerHTML = `
            <div>
                <h4>⚠️ Wichtiger Hinweis zur starken Menstruation</h4>
                <p>Starke Monatsblutungen können zu Eisenmangel führen. Wir empfehlen:</p>
                <ul>
                    <li>Dokumentiere die Dauer der starken Blutungen</li>
                    <li>Achte auf zusätzliche Anämie-Symptome</li>
                    <li>Lass nach Ende der Menstruation deine Eisenwerte überprüfen</li>
                    <li>Sprich mit deinem Arzt über präventive Maßnahmen</li>
                </ul>
                <p><strong>Tipp:</strong> Eine eisenreiche Ernährung kann unterstützend wirken.</p>
            </div>
        `;
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}

// Symptom-Check Funktion
export function checkSymptoms() {
    document.getElementById("symptomsError").style.display = "none"

    console.log("Symptom-Check wird ausgeführt");
    const symptoms = [
        'fatigue', 'dizziness', 'shortness_of_breath', 'headache',
        'pale_skin', 'weakness', 'cold_hands', 'concentration'
    ];

    let checkedSymptoms = symptoms.filter(symptom => {
        const checkbox = document.getElementById(symptom);
        return checkbox && checkbox.checked;
    });

    sessionStorage.setItem("symptoms", JSON.stringify(checkedSymptoms))

    const warningElement = document.getElementById('symptomWarning');
    if (!warningElement) {
        console.error("symptomWarning Element nicht gefunden");
        return;
    }

    if (checkedSymptoms.length >= 3) {
        warningElement.innerHTML = `
            <div class="warning-box warning-severe">
                <h4>⚠️ Wichtiger Hinweis</h4>
                <p>Du hast ${checkedSymptoms.length} Symptome angegeben, die auf eine Anämie hinweisen könnten. 
                Wir empfehlen dir, dies mit deinem Arzt zu besprechen und gegebenenfalls 
                deine Blutwerte überprüfen zu lassen.</p>
                <p><strong>Tipp:</strong> Führe ein Symptom-Tagebuch und zeige es bei deinem nächsten Arztbesuch.</p>
            </div>
        `;
        warningElement.style.display = 'block';
        document.getElementById('symptomWarning').style.backgroundColor = "var(--danger-light)"
    } else if (checkedSymptoms.length > 0) {
        document.getElementById('symptomWarning').style.backgroundColor = "var(--warning-light)"
        warningElement.innerHTML = `
            <div class="warning-box warning-mild">
                <h4>ℹ️ Information</h4>
                <p>Die von dir angegebenen Symptome können verschiedene Ursachen haben. 
                Beobachte sie weiter und sprich mit deinem Arzt, wenn sie länger anhalten.</p>
            </div>
        `;
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}

// Sport-Intensität Auswahl
export function selectIntensity(button) {
    console.log("Intensität wird ausgewählt");
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    updateSportWarning();
}

// Sport-Warning Update Funktion
export function updateSportWarning() {
    console.log("Sport-Warning wird aktualisiert");
    const selectedSport = document.querySelector('input[name="sport-type"]:checked');
    const selectedIntensity = document.querySelector('.intensity-btn.selected');
    const durationElement = document.getElementById('duration');
    const duration = durationElement ? parseInt(durationElement.value) || 0 : 0;
    const warningElement = document.getElementById('sportWarning');

    if (!selectedSport || !selectedIntensity) {
        warningElement.style.display = 'none';
        return;
    }

    const sportType = selectedSport.id;
    const intensity = selectedIntensity.getAttribute('data-intensity');
    const comment = document.getElementById("activities").value

    sessionStorage.setItem("sport_type", sportType)
    sessionStorage.setItem("sport_intensity", intensity)
    sessionStorage.setItem("sport_duration", duration.toString())
    sessionStorage.setItem("sport_comment", comment)

    let warningMessage = '';

    if (sportType === 'endurance' && (intensity === 'intense' || (intensity === 'moderate' && duration > 60))) {
        document.getElementById("sportWarning").style.borderLeft = "4px solid var(--warning-dark)"
        document.getElementById("sportWarning").style.backgroundColor = "var(--warning-light)"

        warningMessage = `
            <div>
                <h4>⚠️ Hinweis zu intensivem Ausdauertraining</h4>
                <p>Intensives Ausdauertraining kann zu einer temporären Sportanämie führen:</p>
                <ul>
                    <li>Erhöhte Zerstörung roter Blutkörperchen durch mechanische Belastung</li>
                    <li>Verdünnung des Blutes durch erhöhtes Plasmavolumen</li>
                </ul>
                <p><strong>Empfehlungen:</strong></p>
                <ul>
                    <li>Achte auf ausreichende Regeneration</li>
                    <li>Beobachte Anämie-Symptome</li>
                    <li>Stelle eine ausgewogene Ernährung sicher</li>
                </ul>
            </div>
        `;
    } else if (intensity === 'moderate') {
        document.getElementById("sportWarning").style.borderLeft = "4px solid var(--primary-green)"
        document.getElementById("sportWarning").style.backgroundColor = "var(--primary-light)"
        warningMessage = `
            <div>
                <h4>ℹ️ Information zu moderater Bewegung</h4>
                <p>Moderate Bewegung kann positive Effekte auf deine Blutwerte haben:</p>
                <ul>
                    <li>Verbesserte Durchblutung</li>
                    <li>Anregung der Blutbildung</li>
                    <li>Stärkung des Immunsystems</li>
                </ul>
            </div>
        `;
    }

    if (warningMessage) {
        warningElement.innerHTML = warningMessage;
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}

window.saveMood = saveMood
window.saveSymptoms = saveSymptoms
window.savePeriod = savePeriod
window.saveSport = saveSport
window.selectMood = selectMood;
window.selectMenstruation = selectMenstruation;
window.checkSymptoms = checkSymptoms;
window.selectIntensity = selectIntensity;
window.updateSportWarning = updateSportWarning;