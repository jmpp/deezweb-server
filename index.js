require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const jsonwebtoken = require('jsonwebtoken')

const User = require('./UserModel')

const app = express()

const PORT = process.env.PORT
const HOST = process.env.HOST

app.use(cors())
app.use(bodyParser.json())

app.post('/login', (req, res) => {
    // Authentification de l'utilisateur
    // Si OK, --> générer un token
    User.login(req.body.email, req.body.password)
        .then(user => {
            const token = jsonwebtoken.sign({ user }, process.env.SECRET_KEY)
            res.json({ success : 'Authentification succeeded!', token })
        })
})

app.post('/register', (req, res) => {
    // Enregistrement de l'utilisateur dans la base
    User.register(req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.body.password_confirmation)
        .then(user => {
            res.json({ success: 'User account created! You can log in!' })
        })
        .catch(error => {
            res.status(500).send(error.join(', '))
        })
})

// Démarrage de l'application
// -----------------------------------------

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env // Récupère les valeurs des variables d'environnement présentes dans le fichier ".env"
const startApp = app => { // Création d'une fonction qui renvoie une promesse résolue (ou rejetée) en fonction du résultat du "app.listen" d'Express
    return new Promise( (resolve, reject) => {
        const server = app.listen(PORT, HOST, resolve)
        server.on('error', reject)
    } );
}

mongoose
    .connect(`mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {useNewUrlParser:true})
    .then(() => console.log('MongoDB : Connexion établie'))
    .then(() => startApp(app))
    .then(() => console.log(`Express : Le serveur écoute sur http://${HOST}:${PORT}`))
    .catch(err => console.error(err.message))