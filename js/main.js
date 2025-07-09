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
    console.log(role);
    try {
        const res = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Includi le credenziali per la sessione
            body: JSON.stringify({ identifier: identifier, email: email, role: role }) // Invia il codice fiscale, l'email e il ruolo al server
        });
        const data = await res.json();
        if (res.ok) {
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

async function checkAccess(expectedRole) { // Funzione per verificare se l'utente è loggato e ha il ruolo corretto
    try {
        const res = await fetch('http://localhost:3000/check/logged', {
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok || data.role !== expectedRole) { // Se la risposta non è ok o il ruolo non corrisponde a quello atteso
            window.location.href = 'index.html'; // Reindirizza alla pagina di login
        }
    } catch (err) {
        window.location.href = 'index.html';
    }
};

async function showUserInfo() {
    try {
        const res = await fetch('http://localhost:3000/user/info', {
            credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('user-info').textContent = `Ciao, ${data.name}`; // Mostra il nome dell'utente
        } else {
            document.getElementById('user-info').textContent = 'Errore nel recupero del nome utente';
        }
    } catch (error) {
        document.getElementById('user-info').textContent = 'Errore nel recupero del nome utente';
    }
};

async function showAvailableBooks() {
    try {
        const res = await fetch('http://localhost:3000/get/books', {
            credentials: 'include'
        });
        const data = await res.json();
        console.log('Libri disponibili:', data); // Log dei libri disponibili
        const booksList = document.getElementById('books-list');
        booksList.innerHTML = ''; // Pulisce la lista dei libri
        if (data.books.length === 0) {
            booksList.innerHTML = '<p>Nessun libro disponibile al momento.</p>'; // Mostra un messaggio se non ci sono libri
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ISBN</th>
                    <th>Titolo</th>
                    <th>Anno</th>
                    <th>Genere</th>
                </tr>
            </thead>
            <tbody>
                ${data.books.map(book => `
                    <tr>
                        <td>${book.ISBN}</td>
                        <td>${book.TITOLO}</td>
                        <td>${book.ANNO_PUBBLICAZIONE}</td>
                        <td>${book.GENERE}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        booksList.appendChild(table);
    } catch (err) {
        console.error('Errore:', err);
    }
};

async function logout() {
    try {
        const res = await fetch('http://localhost:3000/logout', {
            method: 'POST',
            credentials: 'include' // Includi le credenziali per la sessione
        });
        if (res.ok) {
            window.location.href = 'index.html'; // Reindirizza alla pagina di login dopo il logout
        } else {
            console.error('Errore durante il logout');
        }
    } catch (error) {
        console.error('Errore nel logout:', error);
    }
};