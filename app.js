require('dotenv').config();

const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true })
    .then(() => {
        console.log("Successfully connected to the MongoDB server!");
    });

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secrets: {
        type: [String],
        default: []
    }
});



userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(function(user) {
            done(null, user);
        })
        .catch(function(err) {
            done(err);
        });
});

app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Error during logout");
        }
        console.log("Logout!");
        res.redirect("/");
    });
});

app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get("/secrets", function(req, res) {
    if (req.isAuthenticated()) {
        User.findById(req.user.id)
            .then((user) => {
                if (user) {
                    res.render("secrets", { usersWithSecrets: [user] });
                } else {
                    res.redirect("/login");
                }
            })
            .catch((err) => {
                console.error(err);
                res.status(500).send("An error occurred while fetching secrets.");
            });
    } else {
        res.redirect("/login");
    }
});


app.post("/register", function(req, res) {
    User.register({ username: req.body.username }, req.body.password)
        .then(() => {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/login");
            });
        })
        .catch((err) => {
            res.redirect("/register");
        });
});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Error during login");
        }

        passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets");
        });
    });
});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id)
        .then((user) => {
            if (user) {
                user.secrets.push(submittedSecret);
                return user.save();
            } else {
                throw new Error("User not found");
            }
        })
        .then(() => {
            res.redirect("/secrets");
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send("An error occurred while submitting the secret.");
        });
});



app.listen(3000, function() {
    console.log("Successfully Started the Server!");
});