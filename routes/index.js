var express =require("express");
//The rouder allows the creation of modular handler instead of adding everything in the app.js
var router = express.Router({mergeParams: true});
var User = require("../models/user");
var passport = require("passport");
var Campground = require("../models/campground");
var async = require("async");
var nodemailer = require ("nodemailer");
//Crypto is not needed to install is part of express
var crypto = require ("crypto");
//If we dont specify the name of the required file it will automatically
//look for the name index
var middleware = require("../middleware");

//var locus = require('locus');

//Homepage, root route
router.get ("/", function(req, res){
    // res.send("This is homepage!");
    res.render("landing")
});

// ============
// AUTH ROUTES
// ============
//show register form
router.get("/register", function(req, res){
   res.render("register", {page:"register"}); 
});
//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User(
    {
        username: req.body.username, 
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar    
    });
    
    if(req.body.adminCode===process.env.ADMIN_CODE){
        newUser.isAdmin = true;
         User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err)
            return res.render("register", {"error": err.message});
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds"); 
        });
    });
    } else {
        req.flash("error", "Only Admin can access");
        res.redirect("/campgrounds"); 
    }
});

//show login form
router.get("/login", function(req, res) {
    //Adding the key error form middleware with flash
    res.render("login", {page:"login"});
})
// handling login logic
router.post('/login', passport.authenticate('local', 
    { 
        failureRedirect: '/login', 
        failureFlash: true 
        
    }), function(req, res){
        req.flash("success", "Log In Sucessfully!")
        res.redirect('/campgrounds');
});

//Logout route
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Logged you out!")
    res.redirect("/campgrounds");
})

//forgot password
router.get("/forgot", function(req, res) {
    res.render("forgot");
});

router.post("/forgot", function(req, res, next){
    async.waterfall([
        function(done){
            //create the token
            crypto.randomBytes(20, function(err, buf){
                var token = buf.toString("hex");
                done(err, token)
            })
        },
        function(token, done){
            User.findOne({email: req.body.email}, function(err, user){
                //Review if email exist
                if(!user){
                    req.flash("error", "No account with that email address exists");
                    return res.redirect("/forgot");
                }
                //If exist assign the previously created token to the email and set timeout
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                
                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        //Send the email from a provider services in this case google 
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "yelpcampchan@gmail.com",
                    //Adding a env params to hide password
                    pass: process.env.GMAILPW
                }
            });
            //Mail body
            var mailOptions = {
                to: user.email,
                from: "yelpcampchan@gmail.com",
                subject: "Yelpcamp Password Reset",
                text: "You are receiving this because you (or someone else) hae requested the reset of the password. "+
                "Please click on the following link, or paste this into your browser to complete the process "+
                "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                "If you did not request this, please ignore this email and your password will remain unchanged."
            };
            smtpTransport.sendMail(mailOptions, function(err){
                console.log("email sent");
                req.flash("success", "An e-mail has been sent to "+ user.email + "with further instructions");
                done(err, "done")
            });
        }
    ], function(err){
        if (err) return next(err);
            res.redirect("/forgot");
    });
});
//When the token is received check if its valid
router.get("/reset/:token", function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
        if(!user){
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot")
        }
        res.render("reset", {
            token: req.params.token
        });
    });
});


router.post("/reset/:token", function(req, res) {
    async.waterfall([
        function(done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user){
                if(!user){
                    req.flash("error", "Password reset token is invalid or has expired.");
                    return res.redirect("back");
                }
                if(req.body.password === req.body.confirm){
                    //Sets the new password in the DB
                    user.setPassword(req.body.password, function(err){
                        //Clears the password token and expire
                        user.resetPasswordToken=undefined;
                        user.resetPasswordExpires=undefined;
                        // Update database info and login
                        user.save(function(err){
                            req.logIn(user, function(err){
                            done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error", "Password do not match.");
                    return res.redirect("back")
                }
            });
        },
        function(user, done){
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "yelpcampchan@gmail.com",
                    //Adding a env params to hide password
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: "yelpcampchan@gmail.com",
                subject: "Your password has been changed",
                text: "Hello,\n\n"+
                "This is a confirmation that the password for your account "+user.email+" has been changed."
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash("sucess", "Success! Your password has been changed.");
                done(err);
            });
        }
        ], function(err){
            res.redirect("/campgrounds");
        });
});

//USER PROFILES
router.get("/users/:id", function(req, res) {
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("error", "Something went wrong");
            res.redirect("/")
        }
        Campground.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds){
            if (err) {
                req.flash("error", "Something went wrong");
                res.redirect("/")
            }
            res.render("users/show", {user:foundUser, campgrounds: campgrounds});
        })
    });
});

//EDIT PROFILES
router.get("/users/:id/edit",middleware.checkUserOwnership, function(req, res) {
    User.findById(req.params.id, function (err, foundUser) {
        res.render("users/edit", {user:foundUser})
    });
});

//UPDATE PROFILES ROUTE
router.put("/users/:id", middleware.checkUserOwnership, function (req, res) {
    // var newData = {username: req.body.user.username, firstName:req.body.user.firstName, lastName:req.body.user.lastName,
    // email:req.body.user.email, avatar:req.body.user.avatar
    // };
    //eval(require('locus'));
    //find and update correct campground
    User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedProfile){
        if (err){
            req.flash("error", err.message);
            res.redirect("/campgrounds");
        } else {
            
            req.flash("success", "Sucessfully Updated!");
            res.redirect("/users/" + req.params.id);
        }
    });
});

module.exports=router;