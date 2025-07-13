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
        const booksList = document.getElementById('books-list');
        const booksSection = document.getElementById('books-section');
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
        booksSection.style.display = 'block';
    } catch (err) {
        console.error('Errore:', err);
    }
};

async function showLoans() {
    try {
        const res = await fetch('http://localhost:3000/get/loans', {
            credentials: 'include'
        });
        const data = await res.json();
        const loansList = document.getElementById('loans-list');
        const loansSection = document.getElementById('loans-section');
        loansList.innerHTML = '';
        if (!data.prestiti || data.prestiti.length === 0) {
            container.textContent = 'Nessun prestito trovato.';
            return;
        }
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ISBN</th>
                    <th>Titolo</th>
                    <th>Numero copia</th>
                    <th>Inizio prestito</th>
                    <th>Scadenza prestito</th>
                    <th>Data restituzione</th>
                </tr>
            </thead>
            <tbody>
                ${data.prestiti.map(p => `
                    <tr>
                        <td>${p.ISBN}</td>
                        <td>${p.TITOLO}</td>
                        <td>${p.NUMERO_COPIA}</td>
                        <td>${new Date(p.DATA_INIZIO_PRESTITO).toLocaleDateString()}</td>
                        <td>${new Date(p.DATA_SCADENZA_PRESTITO).toLocaleDateString()}</td>
                        <td>${p.DATA_RESTITUZIONE ? new Date(p.DATA_RESTITUZIONE).toLocaleDateString() : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        loansList.appendChild(table);
        loansSection.style.display = 'block'; // Mostra la sezione dei prestiti
    } catch (err) {
        console.error('Errore nel recupero dello storico prestiti:', err);
    }
};

async function showCardDetails() { // Funzione per mostrare i dettagli della carta dell'utente
    document.getElementById('books-section').style.display = 'none';
    document.getElementById('card-section').style.display = 'block';
    checkCardStatus();
};

async function checkCardStatus() { // Funzione per controllare lo stato della carta dell'utente
    try {
        const res = await fetch('http://localhost:3000/card/status', {
            credentials: 'include'
        });
        const data = await res.json(); // Recupera lo stato della carta
        const statusDiv = document.getElementById('card-status');
        const requestBtn = document.getElementById('request-card-btn');
        const renewBtn = document.getElementById('renew-card-btn');
        requestBtn.style.display = 'none'; // Nasconde il pulsante di richiesta carta
        renewBtn.style.display = 'none'; // Nasconde il pulsante di rinnovo carta
        let dataScadenzaFormattata = '';
        if (data.scadenza) {
            const dataScadenza = new Date(data.scadenza);
            dataScadenzaFormattata = dataScadenza.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        if (data.status === 'mancante') { // Se l'utente non ha una carta
            statusDiv.textContent = 'Non hai ancora una tessera.';
            requestBtn.style.display = 'inline-block';
        } else if (data.status === 'valida') { // Se la carta è valida
            statusDiv.textContent = `Tessera valida. Scadenza: ${dataScadenzaFormattata}`;
        } else if (data.status === 'scaduta') { // Se la carta è scaduta
            statusDiv.textContent = `Tessera scaduta. Scadenza: ${dataScadenzaFormattata}`;
            renewBtn.style.display = 'inline-block';
        }
    } catch (err) {
        console.error('Errore nel recupero dello stato della tessera:', err);
    }
};

async function requestCard() {
    try {
        const res = await fetch('http://localhost:3000/request/card', {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            checkCardStatus(); // Aggiorna lo stato della carta dopo la richiesta
        } else {
            console.error('Errore durante la richiesta della tessera');
        }
    } catch (err) {
        console.error('Errore nella richiesta della carta:', err);
    }
};

async function renewCard() {
    try {
        const res = await fetch('http://localhost:3000/renew/card', {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            checkCardStatus(); // Aggiorna lo stato della carta dopo la richiesta
        } else {
            console.error('Errore durante la richiesta della tessera');
        }
    } catch (err) {
        console.error('Errore nella richiesta della carta:', err);
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