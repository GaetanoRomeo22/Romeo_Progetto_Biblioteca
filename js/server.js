const path = require('path'); // Per gestire i percorsi dei file
require('dotenv').config({ path: 'database.env' }); // Varabili d'ambiente per connessione al database
const express = require('express');
const session = require('express-session'); // Per gestire le sessioni degli utenti
const mysql = require('mysql2'); // Per interagire con il database MySQL
const bodyParser = require('body-parser'); // Per analizzare il corpo delle richieste JSON
const cors = require('cors');
const app = express();
const backEndPort = 3000; // Porta su cui il server ascolterà
const frontEndPort = 5500; // Porta del frontend, se necessario

app.use(bodyParser.json()); // Middleware per analizzare il corpo delle richieste JSON
app.use(cors());
/*
app.use(cors({ // Configurazione CORS per permettere richieste dal frontend
  origin: `http://localhost:${frontEndPort}`, // o la porta del tuo frontend
  credentials: true
}));

app.use(session({ // Configurazione della sessione
    secret: 'Biblioteca', // Chiave segreta per firmare il cookie della sessione
    resave: false, // Non salvare la sessione se non è stata modificata
    saveUninitialized: false, // Non salvare le sessioni non inizializzate
    cookie: { secure: false } // True per HTTPS, false per HTTP
}));
*/

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
            /*
            req.session.loggedIn = true; // Imposta la sessione come loggata
            req.session.role = role; // Salva il ruolo nella sessione
            req.session.identifier = role === 'bibliotecario' ? results[0].NUMERO_MATRICOLA : results[0].CODICE_FISCALE_CLIENTE; // Salva il codice fiscale o la matricola nella session
            */
            const redirect_page = role === 'bibliotecario' ? 'home_bibliotecario.html' : 'home_cliente.html';
            return res.status(200).json({ redirect: redirect_page });
        } else { // Se non ci sono risultati, le credenziali sono errate
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
    })
});

app.listen(backEndPort, () => { // Avvio del server sulla porta specificata
  console.log(`Server in ascolto sulla porta ${backEndPort}`);
});