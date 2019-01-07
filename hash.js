// check out https://github.com/visionmedia/node-pwd

/**
 * Module dependencies.
 */

const crypto = require('crypto');

/**
 * Bytesize.
 */

const LEN = 128;

/**
 * Iterations. ~300ms
 */

const ITERATIONS = 12000;

/**
 * Hash a password with optional 'salt'
 */

module.exports = function(password, salt) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!salt)
                salt = await randomBytes(LEN);

            const hash = await pbkdf2(password, salt, ITERATIONS, LEN, 'sha1');

            resolve({salt, hash});
        }
        catch (e) {
            reject(e)
        }
    });
};



/* Promisified crypto functions */

function pbkdf2(pwd, salt, iterations, len, algo) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(pwd, salt, iterations, len, algo, (err, hash) => {
            if (err) return reject(err);
            resolve(hash.toString('base64'));
        });
    });
}

function randomBytes(len, callback) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(len, (err, salt) => {
            if (err) return reject(err);
            resolve(salt.toString('base64'));
        });
    });
}
