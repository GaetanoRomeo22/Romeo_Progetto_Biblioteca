const path = require('path'); // Per gestire i percorsi dei file
require('dotenv').config({ path: 'database.env' }); // Varabili d'ambiente per connessione al database
const express = require('express');
const session = require('express-session'); // Per gestire le sessioni degli utenti
const mysql = require('mysql2'); // Per interagire con il database MySQL
const cors = require('cors');
const app = express();
const backEndPort = 3000; // Porta su cui il server ascolterà
const frontEndPort = 5500; // Porta del frontend

app.use(express.json()); // Middleware per analizzare il corpo delle richieste JSON

app.use(cors({ // Configurazione CORS per permettere richieste dal frontend
  origin: `http://localhost:${frontEndPort}`,
  credentials: true
}));

app.use(session({ // Configurazione della sessione
    secret: 'Biblioteca', // Chiave segreta per firmare il cookie della sessione
    resave: false, // Non salvare la sessione se non è stata modificata
    saveUninitialized: false, // Non salvare le sessioni non inizializzate
    cookie: { secure: false } // True per HTTPS, false per HTTP
}));

const db = mysql.createConnection({ // Configurazione della connessione al database
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => { // Connessione al database
    if (err) {
        console.error('Connessione al database non riuscita:', err);
        return;
    }
    console.log('Connesso al database');
});

app.post('/login', (req, res) => { // Funzione per gestire il login
    const { identifier, email, role } = req.body; // Estrazione del codice fiscale e dell'email dal corpo della richiesta
    if (!identifier || !role || (role === 'cliente' && !email)) { // Controllo che tutti i campi richiesti siano presenti
        return res.status(400).json({ error: 'Compila tutti i campi richiesti' });
    }
    let query = '',
        params = [];
    if (role === 'bibliotecario') { // Se il ruolo è bibliotecario, si usa la matricola
        query = 'SELECT * FROM BIBLIOTECARIO WHERE NUMERO_MATRICOLA = ?';
        params = [identifier];
    } else if (role === 'cliente') { // Se il ruolo è cliente, si usa il codice fiscale e l'email
        query = 'SELECT * FROM CLIENTE WHERE CODICE_FISCALE_CLIENTE = ? AND EMAIL_CLIENTE = ?';
        params = [identifier, email];
    }
    db.query(query, params, (err, results) => { // Query da eseguire
        if (err) { // Gestione degli errori durante la query
            console.error('Errore durante la query:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        if (results.length > 0) { // Se la query ha restituito risultati, significa che le credenziali sono corrette
            req.session.loggedIn = true; // Imposta la sessione come loggata
            req.session.role = role; // Salva il ruolo nella sessione
            req.session.identifier = role === 'bibliotecario' ? results[0].NUMERO_MATRICOLA : results[0].CODICE_FISCALE_CLIENTE; // Salva il codice fiscale o la matricola nella session
            const redirect_page = role === 'bibliotecario' ? 'home_bibliotecario.html' : 'home_cliente.html';
            return res.status(200).json({ redirect: redirect_page });
        } else { // Se non ci sono risultati, le credenziali sono errate
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
    })
});

app.get('/check/logged', (req, res) => { // Route per verificare se l'utente è loggato
    if (req.session.loggedIn) { // Se l'utente è loggato
        res.status(200).json({ loggedIn: true, role: req.session.role }); // Risponde con lo stato di login e il ruolo dell'utente
    } else { // Se l'utente non è loggato
        res.status(401).json({ loggedIn: false, role: null }); // Risponde con lo stato di login non riuscito
    }
});

app.get('/user/info', (req, res) => { // Route per ottenere le informazioni dell'utente
    if (!req.session.loggedIn) { // Se l'utente non è loggato
        return res.status(401).json({ error: 'Utente non loggato' }); // Risponde con un errore
    }
    const identifier = req.session.identifier, // Recupera il codice fiscale o la matricola dall'oggetto sessione
          role = req.session.role; // Recupera il ruolo dell'utente dall'oggetto sessione
    let query = '';
    if (role === 'cliente') { // Se il ruolo è cliente
        query = 'SELECT NOME_CLIENTE AS NOME FROM CLIENTE WHERE CODICE_FISCALE_CLIENTE = ?';
    } else if (role === 'bibliotecario') { // Se il ruolo è bibliotecario
        query = 'SELECT NOME_BIBLIOTECARIO AS NOME FROM BIBLIOTECARIO WHERE NUMERO_MATRICOLA = ?';
    }
    db.query(query, [identifier], (err, results) => { // Esegue la query per ottenere il nome dell'utente
        if (err || results.length === 0) { // Gestione degli errori durante la query o se non ci sono risultati
            return res.status(500).json({ error: 'Errore nel recupero del nome utente' });
        }
        const name = results[0].NOME; // Recupera il nome dell'utente
        res.status(200).json({ name: name }); // Risponde con il nome dell'utente
    })
});

app.get('/get/books', (req, res) => { // Route per ottenere la lista dei libri
    if (!req.session.loggedIn || req.session.role !== 'cliente') { // Controlla se l'utente è loggato e se il ruolo è cliente
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    const query = 'SELECT * FROM LIBRO'; // Query per ottenere tutti i libri
    db.query(query, (err, results) => { // Esegue la query per ottenere i libri
        if (err) {
            console.error('Errore durante la query dei libri:', err);
            return res.status(500).json({ error: 'Errore durante il recupero dei libri' });
        }
        res.status(200).json({ books: results }); // Risponde con la lista dei libri
    });
});

app.get('/get/loans', (req, res) => { // Route per ottenere i prestiti dell'utente
    if (!req.session.loggedIn || req.session.role !== 'cliente') {
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    const tesseraQuery = 'SELECT NUMERO_TESSERA FROM REGISTRAZIONE WHERE CODICE_FISCALE_CLIENTE = ?';
    db.query(tesseraQuery, [req.session.identifier], (err, results) => {
        if (err) { // Gestione degli errori durante la query
            return res.status(500).json({ error: 'Errore server' });
        }
        if (results.length === 0) { // Se non ci sono tessere associate al cliente
            return res.status(404).json({ error: 'Nessuna tessera trovata' });
        }
        const numeroTessera = results[0].NUMERO_TESSERA;
        const prestitiQuery = `
            SELECT P.ISBN, L.TITOLO, P.NUMERO_COPIA, P.DATA_INIZIO_PRESTITO, P.DATA_SCADENZA_PRESTITO, P.DATA_RESTITUZIONE
            FROM PRENDE P
            JOIN LIBRO L ON P.ISBN = L.ISBN
            WHERE P.NUMERO_TESSERA = ?
            ORDER BY P.DATA_INIZIO_PRESTITO DESC
        `;
        db.query(prestitiQuery, [numeroTessera], (err, prestiti) => {
            if (err) return res.status(500).json({ error: 'Errore nel recupero dei prestiti' });
            res.json({ prestiti });
        });
    });
});

app.get('/card/status', (req, res) => { // Route per ottenere lo stato della carta dell'utente
    if (!req.session.loggedIn || req.session.role !== 'cliente') { // Controlla se l'utente è loggato e se il ruolo è cliente
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    const query = 'SELECT * FROM REGISTRAZIONE WHERE CODICE_FISCALE_CLIENTE = ?'; // Query per ottenere lo stato della carta
    db.query(query, [req.session.identifier], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Errore durante la richiesta della carta' });
        }
        if (results.length === 0) { // Se non ci sono risultati, significa che l'utente non ha una carta
            return res.status(200).json({ status: 'mancante' });
        }
        const dataScadenza = new Date(results[0].DATA_SCADENZA_TESSERA);
        const oggi = new Date();
        if (dataScadenza < oggi) { // Se la data di scadenza è passata
            return res.status(200).json({
                status: 'scaduta',
                numeroTessera: results[0].NUMERO_TESSERA,
                scadenza: results[0].DATA_SCADENZA_TESSERA
            });
        }
        return res.status(200).json({ // Se la carta è ancora valida
            status: 'valida',
            numeroTessera: results[0].NUMERO_TESSERA,
            scadenza: results[0].DATA_SCADENZA_TESSERA
        });
    });
});

app.post('/request/card', (req, res) => { // Route per richiedere la carta
    if (!req.session.loggedIn || req.session.role !== 'cliente') { // Controlla se l'utente è loggato e se il ruolo è cliente
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    const checkQuery = 'SELECT * FROM REGISTRAZIONE WHERE CODICE_FISCALE_CLIENTE = ?'; // Query per verificare se l'utente ha già richiesto la carta
    db.query(checkQuery, [req.session.identifier], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Errore durante la richiesta della carta' });
        }
        if (results.length > 0) {
            return res.status(200).json({ error: 'Tessera già richiesta'});
        }
        const numeroTessera = Math.floor(10000000 + Math.random() * 90000000).toString();
        const oggi = new Date();
        const dataRegistrazione = oggi.toISOString().split('T')[0];
        const dataScadenza = new Date(oggi);
        dataScadenza.setFullYear(dataScadenza.getFullYear() + 1);
        const dataScadenzaFormatted = dataScadenza.toISOString().split('T')[0];
        const insertQuery = 'INSERT INTO REGISTRAZIONE (NUMERO_TESSERA, DATA_REGISTRAZIONE, DATA_SCADENZA_TESSERA, CODICE_FISCALE_CLIENTE) VALUES (?, ?, ?, ?)';
        db.query(insertQuery, [numeroTessera, dataRegistrazione, dataScadenzaFormatted, req.session.identifier], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Errore durante la registrazione della carta' });
            }
            res.status(200).json({ message: 'Carta richiesta con successo', numeroTessera: numeroTessera });
        });
    });
});

app.post('/renew/card', (req, res) => { // Route per rinnovare la carta
    if (!req.session.loggedIn || req.session.role !== 'cliente') { // Controlla se l'utente è loggato e se il ruolo è cliente
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    const checkQuery = 'SELECT * FROM REGISTRAZIONE WHERE CODICE_FISCALE_CLIENTE = ?'; // Query per verificare se l'utente ha già richiesto la carta
    db.query(checkQuery, [req.session.identifier], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Errore durante la richiesta della carta' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Tessera non presente'});
        }
        const oggi = new Date();
        const dataScadenza = new Date(oggi);
        dataScadenza.setFullYear(dataScadenza.getFullYear() + 1);
        const dataScadenzaFormatted = dataScadenza.toISOString().split('T')[0];
        const updateQuery = 'UPDATE REGISTRAZIONE SET DATA_SCADENZA_TESSERA = ? WHERE CODICE_FISCALE_CLIENTE = ?';
        db.query(updateQuery, [dataScadenzaFormatted, req.session.identifier], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Errore durante la registrazione della carta' });
            }
            res.status(200).json({ message: 'Carta rinnovata con successo' });
        });
    });
});

app.post('/logout', (req, res) => { // Route per gestire il logout
    req.session.destroy(err => { // Distrugge la sessione dell'utente
        if (err) {
            console.error('Errore durante il logout:', err);
            return res.status(500).json({ error: 'Errore durante il logout' });
        }
        res.clearCookie('connect.sid'); // Pulisce il cookie della sessione
        res.sendStatus(200); // Risponde con lo stato OK dopo il logout
    });
});

app.listen(backEndPort, () => { // Avvio del server sulla porta specificata
  console.log(`Server in ascolto sulla porta ${backEndPort}`);
});