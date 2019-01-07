const mongoose = require('mongoose')

const hash = require('./hash')

const userSchema = mongoose.Schema({
    'firstname': { type: String, required: [true, 'Le champs prénom est obligatoire'] },
    'lastname': { type: String, required: [true, 'Le champs nom est obligatoire'] },
    
    // Validateur personnalisé qui vérifie le format d'une adresse e-mail.
    // Basé sur la documentation de mongoose : http://mongoosejs.com/docs/validation.html#custom-validators 
    'email' : {
        type: String,
        validate: {
            validator: function(mailValue) {
                // c.f. http://emailregex.com/
                const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return emailRegExp.test(mailValue);
            },
            message: 'L\'adresse email {VALUE} n\'est pas une adresse RFC valide'
        },
    },

    'password_salt': { type: String, required: true },
    'password_hash': { type: String, required: true },

    'favorites': { type: Array, default: () => new Array() }
})

userSchema.statics.register = function(firstname, lastname, email, pass, pass_confirmation) {
    // Vérification des champs de mot de passe
    const error_messages = []

    if (pass.trim() === '')
        error_messages.push('Le champs "mot de passe" est obligatoire')

    if (pass_confirmation.trim() === '')
        error_messages.push('Le champs "confirmation de mot de passe" est obligatoire')

    if (error_messages.length === 0 && pass.trim() !== pass_confirmation.trim())
        error_messages.push('Les mots de passe doivent être identiques')

    if (email.trim() === '')
    	error_messages.push('L\'adresse email doit être renseignée')

    if (error_messages.length > 0)
        return Promise.reject(error_messages)

    /*
        Insertion en base, en utilisant la méthode .create() de d'un Model mongoose
        c.f. http://mongoosejs.com/docs/api.html#create_create

        Cette méthode renvoie une Promesse JS. Avec l'instruction 'return', on renvoie donc
        la promesse comme valeur de 'UserSchema.statics.signup'
    */
    
    return this.findOne({ email: email })
        .then(user => {
            if (user)
                return Promise.reject(new Error(`Cette adresse email est déjà utilisée (${user.email})`));
        })
        .then(() => hash(pass))
        .then(({ salt, hash }) => {
        return this.create({
            firstname : firstname,
            lastname : lastname,
            email : email,
            password_salt : salt,
            password_hash : hash
        })
    }).catch(err => {
        // Fabrication d'un tableau de messages d'erreur (extraits de l'objet 'ValidationError' renvoyé par Mongoose)
        if (err.errors)
            throw Object.keys(err.errors).map(field => err.errors[field].message);
        
        throw [err.message ? err.message : err];
    })
}

userSchema.statics.login = function(email, passwordInClear) {
    return this.findOne({ email: email })
        .then(user => {
            if (!user)
                return Promise.reject(new Error(`Identifiants invalides!`));
            
            const {password_salt: userSalt, password_hash: userHash} = user

            return hash(passwordInClear, userSalt).then(({ hash: computedHash }) => {
                if (computedHash === userHash) {
                    return Promise.resolve(user)
                } else {
                    return Promise.reject(new Error('Identifiants invalides!'))
                }
            })
        })
}

// Export du Modèle mongoose représentant un objet User
module.exports = mongoose.model('User', userSchema);