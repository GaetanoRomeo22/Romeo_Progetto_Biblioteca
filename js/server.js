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
    db.query(query, params, (error, results) => { // Query da eseguire
        if (error) { // Gestione degli errori durante la query
            console.error('Errore durante la query:', error);
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
    db.query(query, [identifier], (error, results) => { // Esegue la query per ottenere il nome dell'utente
        if (error || results.length === 0) { // Gestione degli errori durante la query o se non ci sono risultati
            return res.status(500).json({ error: 'Errore nel recupero del nome utente' });
        }
        const name = results[0].NOME; // Recupera il nome dell'utente
        res.status(200).json({ name: name }); // Risponde con il nome dell'utente
    })
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