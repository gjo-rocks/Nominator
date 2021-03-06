const User = require('../models/users.model.js');
const notificationController = require('../controllers/notification.controller');
var atob = require('atob');
var btoa = require('btoa');
var nodemailer = require('nodemailer');


const admins = [
    'kgaurav@sapient.com',
    'sraghavan@sapient.com',
    'vrufus3@sapient.com',
    'gjoshi7@sapient.com',
    'span10@sapient.com'
];

/*  */
function encodeString(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
};

function decodeString(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
};


// Create and Save a new User
exports.create = (req, res) => {
    // Validate request
    if (!req.body.emailId || !req.body.name) {
        return res.status(400).send({
            message: "User email or name can not be empty"
        });
    }

    // Create a User
    const user = new User({
        name: req.body.name,
        emailId: req.body.emailId,
        role: req.body.role || "User"
    });

    // Save User in the database
    user.save()
        .then(data => {
            res.send(data);
            notificationController.notify({ 'title': `User created: ${user.name}` });
        }).catch(err => {
            let message = "Some error occurred while creating the User.";
            if (err.code) {
                if (err.code === 11000) {
                    message = 'Duplicate user';
                }
            }
            res.status(500).send({
                message: message,
                code: err.code
            });
        });
};

// Retrieve all users from the database.
exports.findAll = (req, res) => {
    User.find()
        .then(users => {
            res.send(users);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving users."
            });
        });
};

// Retrieve all users from the database.
exports.findSupervisees = (req, res) => {
    let decryptedEmailId = decodeString(req.params.emailId);
    User.find({ supervisorEmailId: decryptedEmailId })
        .then(users => {
            res.send({
                role: admins.includes(decryptedEmailId) ? 'Admin' : 'User',
                nominees: users
            });
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving users."
            });
        });
};

// Find a user with a userId
exports.findOne = (req, res) => {
    User.findById(req.params.userId)
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            res.send(user);
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            return res.status(500).send({
                message: "Error retrieving user with id " + req.params.userId
            });
        });
};

// Update user by the userId in the request
exports.update = (req, res) => {
    // Validate Request
    if (!req.body.role) {
        return res.status(400).send({
            message: "User role can not be empty"
        });
    }

    // Find note and update it with the request body
    User.findByIdAndUpdate(req.params.userId, req.body, { new: true })
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            res.send(user);
            notificationController.notify({ 'title': `User updated: ${user.name}` });
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            return res.status(500).send({
                message: "Error updating user with id " + req.params.userId
            });
        });
};

// Update user by the userId in the request
exports.sendMail = (req, res) => {
    let encEmailId = encodeString('span10@sapient.com');
    const appURL = `http://localhost:4200/${encEmailId}`;
};



// Delete user with the userId in the request
exports.delete = (req, res) => {
    User.findByIdAndRemove(req.params.userId)
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            res.send({ message: "User deleted successfully!" });
            notificationController.notify({ 'title': `User deleted: ${user.name}` });
        }).catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({
                    message: "User not found with id " + req.params.userId
                });
            }
            return res.status(500).send({
                message: "Could not delete user with id " + req.params.userId
            });
        });

};