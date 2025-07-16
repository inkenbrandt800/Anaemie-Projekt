let BACKEND_URL = ""
await fetch('./config.json')
    .then(res => res.json())
    .then(config => {
        BACKEND_URL = config.BACKEND_URL
    });

// Get chatbot elements
const chatbot = document.getElementById('chatbot');
const conversation = document.getElementById('conversation');
const inputForm = document.getElementById('input-form');
const inputField = document.getElementById('input-field');

// Add event listener to input form
inputForm.addEventListener('submit', async function(event) {
    // Prevent form submission
    event.preventDefault();

    // Get user input
    const input = inputField.value;

    // Clear input field
    inputField.value = '';
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: "2-digit" });

    // Add user input to conversation
    let message = document.createElement('div');
    message.classList.add('chatbot-message', 'user-message');
    message.innerHTML = `<p class="chatbot-text" sentTime="${currentTime}">${input}</p>`;
    conversation.appendChild(message);

    // Generate chatbot response
    const response = await generateResponse(input);

    // Add chatbot response to conversation
    message = document.createElement('div');
    message.classList.add('chatbot-message','chatbot');
    message.innerHTML = `<p class="chatbot-text" sentTime="${currentTime}">${response}</p>`;
    conversation.appendChild(message);
    message.scrollIntoView({behavior: "smooth"});
});

// Generate chatbot response function
async function generateResponse(input) {
    try {
        let body = {
            question: input,
        }
        let response = await axios.post(BACKEND_URL + "/chatbot", body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        console.log("Chatbot Response", response);
        return response.data
    } catch(e) {
        console.error(e);
        return "Deine Frage konnte leider nicht verarbeitet werden";
    }
}

