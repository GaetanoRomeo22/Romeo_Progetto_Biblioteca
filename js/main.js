function toggleFields() { // Funzione per mostrare/nascondere i campi in base al ruolo selezionato
    const role = document.getElementById('role').value;
    const emailGroup = document.getElementById('email-group');
    const identifierLabel = document.getElementById('identifier-label');
    if (role === 'bibliotecario') { // Se il ruolo è bibliotecario, mostra solo il campo per la matricola
        emailGroup.style.display = 'none';
        document.getElementById('email').required = false;
        identifierLabel.textContent = 'Matricola';
    } else { // Se il ruolo è cliente, mostra il campo per il codice fiscale e l'email
        emailGroup.style.display = 'block';
        document.getElementById('email').required = true;
        identifierLabel.textContent = 'Codice Fiscale';
    }
}

async function login () { // Funzione per gestire il login
    const identifier = document.getElementById('identifier').value.trim(), // Recupera il codice fiscale inserito
            role = document.getElementById('role').value.trim(), // Recupera il ruolo selezionato
            email = role === 'cliente' ? document.getElementById('email').value.trim() : '', // Recupera l'email inserita solo se il ruolo è cliente
            error_message = document.getElementById('error_message'); // Recupera l'elemento per il messaggio di errore
    error_message.style.display = 'none'; // Nasconde il messaggio di errore all'inizio
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // credentials: 'include', // Includi le credenziali per la sessione
            body: JSON.stringify({ identifier: identifier, email: email, role: role }) // Invia il codice fiscale, l'email e il ruolo al server
        });
        const data = await response.json();
        if (response.ok) {
            window.location.href = data.redirect; // Reindirizza alla pagina home se il login ha successo
        } else {
            error_message.textContent = data.error; // Mostra il messaggio di errore
            error_message.style.display = 'block'; // Rende visibile il messaggio di errore
        }
    }
    catch (error) {
        error_message.textContent = 'Errore del server. Riprova più tardi.';
        error_message.style.display = 'block';
    }
};