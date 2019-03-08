var Campground = require("../models/campground");
var Comment = require("../models/comment");
var User = require("../models/user");

//all the middleware goes here
var middlewareObj ={};
//Check Campgrounds ownership
middlewareObj.checkCampgroundOwnership = function(req, res, next){
    //Middleware checkCampgroundOwnership(), validates if is authorized or not to move to the next middleware
    if (req.isAuthenticated()){
        Campground.findById(req.params.id, function (err, foundCampground) {
            if(err|| !foundCampground){
                req.flash("error", "Campground not found");
                //back will take the user back from where they came from (previous page)
                res.redirect("back")
            } else {
                //Does the user owns the campgrounds?
                //Warning we cannot do this:
                // if (foundCampground.author.id === req.user._id)
                //Because foundCampground.author.id returns a Mongus object and req.user._id
                // returns a string
                if((foundCampground.author.id.equals(req.user._id)) || (req.user.isAdmin)){
                    next();
                } else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back")
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

//Check Comments ownership
middlewareObj.checkCommentOwnership = function(req, res, next){
    //Middleware checkCommentOwnership(), validates if is authorized or not to move to the next middleware
    if (req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function (err, foundComment) {
            if(err || !foundComment){
                //back will take the user back from where they came from (previous page)
                req.flash("error", "Comment not found")
                res.redirect("back")
            } else {
                //Does the user owns the comment?
                //Warning we cannot do this:
                // if (foundComment.author.id === req.user._id)
                //Because foundComment.author.id returns a Mongus object and req.user._id
                // returns a string
                if((foundComment.author.id.equals(req.user._id))||(req.user.isAdmin)){
                    next();
                } else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back")
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

//Check User ownership
middlewareObj.checkUserOwnership = function(req, res, next){
    //Middleware checkUserOwnership(), validates if is authorized or not to move to the next middleware
    if (req.isAuthenticated()){
        User.findById(req.params.id, function (err, foundUser) {
            if(err || !foundUser){
                //back will take the user back from where they came from (previous page)
                req.flash("error", "User not found")
                res.redirect("back")
            } else {
                //eval(locus);
                //Is the current user the same of the profile??
                if((foundUser._id.equals(req.user._id))||(req.user.isAdmin)){
                    next();
                } else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back")
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

//Middleware isLoggedIn(), validates if is authenticated or not to move to the next middleware
middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    //Adding flash, we are asigning the msg to error, then the router needs
    //to know what to do next with error, in this case the router assigned
    //is /login
    req.flash("error", "You need to be logged to do that");
    res.redirect("/login")
}

module.exports= middlewareObj