require('dotenv').config({ path: 'database.env' }); // Varabili d'ambiente per connessione al database
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000; // Porta su cui il server ascolterà

app.use(cors());
app.use(bodyParser.json());

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
            const redirect_page = role === 'bibliotecario' ? 'home_bibliotecario.html' : 'home_cliente.html';
            return res.status(200).json({ redirect: redirect_page });
        } else { // Se non ci sono risultati, le credenziali sono errate
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
    })
});

app.listen(port, () => { // Avvio del server sulla porta specificata
  console.log(`Server in ascolto sulla porta ${port}`);
});