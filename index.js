require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const jsonwebtoken = require('jsonwebtoken')
const { createHash } = require('crypto')

const User = require('./UserModel')

const app = express()

const PORT = process.env.PORT
const HOST = process.env.HOST

app.use(cors({allowedHeaders: ['Content-Type', 'Authorization']}))
app.use(bodyParser.json())

app.post('/login', (req, res) => {
    // Authentification de l'utilisateur
    // Si OK, --> générer un token
    User.login(req.body.email, req.body.password)
        .then(user => {
            const token = jsonwebtoken.sign({ userId: user._id }, process.env.SECRET_KEY)
            res.json({ token })
        })
        .catch(err => {
            res.status(401).send(err.message)
        })
})

app.get('/auth', (req, res) => {
    if (!req.query.token)
        return res.status(400).send('Token non renseigné')

    jsonwebtoken.verify(req.query.token, process.env.SECRET_KEY, (err, decodedToken) => {
        if (err)
            return res.status(400).send('Token invalide')

        // Si le token de login est valide, on va chercher en base l'utilisateur avec l'id présent dans le token décodé
        User.findById({ _id: decodedToken.userId }).then(user => {
            if (!user)
                return res.status(404).send('Utilisateur inexistant')
            
            // on ne renvoie pas tous les champs de la base, mais plutôt un object exploitable par le client
            const userCopy = {
                id        : user._id,
                firstname : user.firstname,
                lastname  : user.lastname,
                email     : user.email,
                favorites : user.favorites,
                avatar    : `https://www.gravatar.com/avatar/${createHash('md5').update(user.email).digest('hex')}` // Les URLs 'gravatar' sont composée du MD5 de l'adresse email
            }
            res.status(200).json(userCopy)
        })
        .catch(err => {
            res.sendStatus(500)
        })
    })
})

app.post('/register', (req, res) => {
    // Enregistrement de l'utilisateur dans la base
    User.register(req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.body.password_confirmation)
        .then(user => {
            res.status(201).json({ success: 'User account created! You can log in!' })
        })
        .catch(error => {
            res.status(409).send(errors)
        })
})

// Toutes les requêtes qui utiliseront la route "/favorite" passeront par ce middleware perso
// Cela permet avant toute opération sur les favoris de vérifier si le client envoie bien son token
app.use('/favorite', (req, res, next) => {
    let token = req.headers['authorization'] // Le token du client est sensé se trouver dans l'entete HTTP "Authorization" (standard)
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trimLeft(); // retrait de "Bearer " en début de chaîne
    }
    if (token) {
        jsonwebtoken.verify(token, process.env.SECRET_KEY, (err, decodedToken) => {// Vérification de l'authenticité du token avec la clé secrète, uniquement connue du serveur
            if (err) return res.status(401).send('Token invalide')

            // Sinon, on place le JWT décodé (qui est un objet) dans une propriété custom ".token" de l'objet "req"
            req.token = decodedToken
            next() // Fin du travail du middleware, la fonction "next()" indique de laisser passer la requête
        })
    } else {
        return res.status(401).send('Token invalide') // En cas d'erreur, le middleware stoppe toute action et renvoie immédiatement au client une erreur
    }
})

app.post('/favorite', (req, res) => {
    User.addFavorite(req.token.userId, req.body.track).then(() => {
        res.status(201).send('Track ajouté aux favoris')
    }).catch(err => {
        res.status(400).send(err)
    })
})

app.delete('/favorite/:trackId', (req, res) => {
    User.removeFavorite(req.token.userId, req.params.trackId).then(() => {
        res.sendStatus(204)
    }).catch(err => {
        res.status(400).send(err)
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