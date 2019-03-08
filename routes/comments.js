var express =require("express");
//The rouder allows the creation of modular handler instead of adding everything in the app.js
//The mergeParams is needed here to merge the :id that comes from app.js (app.use("/campgrounds/:id/comments", commentRoutes);)
//to be used here when req.params.id needs it
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Comment = require("../models/comment");
//If we dont specify the name of the required file it will automatically
//look for the name index
var middleware = require("../middleware");

//=========================
// COMMENTS ROUTES
//=========================

//NEW
router.get("/new", middleware.isLoggedIn, function(req, res) {
    // find campground by id
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
        } else {
            res.render("comments/new", {campground: campground})
        }
    })
});

//We need to add the middleware here too, because someone could use something like
//postman and send a post modifying things even when not log in
//Comments Create
router.post("/", middleware.isLoggedIn, function(req, res){
    //lookup campground using ID
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
            res.redirect("/campgrounds");
        } else {
        //Create comment
            Comment.create(req.body.comment, function(err, comment){
                if (err){
                    req.flash("error", "Something went wrong");
                    console.log(err);
                } else {
                    // add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    // save comment
                    campground.comments.push(comment);
                    campground.save();
                    console.log(comment);
                    //Redirect to campgrounds id show
                    req.flash("success", "Sucessfully added comments");
                    res.redirect("/campgrounds/"+campground._id);
                }
            })
        }
    });
});

// COMMENTS EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground) {
        if (err || !foundCampground){
            req.flash("error", "No Campground found");
            return res.redirect("back")
        }
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err){
                res.redirect("back");
            } else {
                res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
            }
        });
    });    
});

// COMMENTS UPDATE
// Check ownership/authorization is always needed in update, if someone uses something
// like POSTMAN it could hack the code 
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            res.redirect("back")
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    })
})

//COMMENTS DESTROY
router.delete("/:comment_id",middleware.checkCommentOwnership, function(req, res){
    //find by id and remove
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            res.redirect("back")
        } else {
            req.flash("sucess", "Comments deleted")
            res.redirect("/campgrounds/"+req.params.id)
        }
    })
})

module.exports=router;
