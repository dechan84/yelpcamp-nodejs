var express =require("express");
//The rouder allows the creation of modular handler instead of adding everything in the app.js
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
//If we dont specify the name of the required file it will automatically
//look for the name index
var middleware = require("../middleware");
//Allows to pass a string representation of a location and a callback function to geocoder.geocode
var geocoder = require('geocoder');

var multer = require("multer");
//Whenever the file is uploaded were creating a custom name for that file
var storage = multer.diskStorage({
    filename: function(req, file, callback){
        callback(null, Date.now()+file.originalname);
    }
});
//Allows only image files extensions
var imageFilter = function(req, file, cb){
    //accept images files only
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};

var upload = multer({storage: storage, fileFilter: imageFilter});

var cloudinary = require("cloudinary");

cloudinary.config({
    cloud_name: "danqgtmrz",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get ("/", function(req, res){
    var noMatch = null;
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    if(req.query.search){
        // gi adding switch means global and ignore cases
        const regex = new RegExp(escapeRegex(req.query.search), "gi")
        //Rigth now it only search for Campground name, for more complex
        //search we need to add more code...
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({name: regex}).exec(function (err, count) {
                if(err){
                    console.log(err);
                    res.redirect("back");
                }else{
                    if(allCampgrounds.length < 1){
                        noMatch = "No campgrounds match that query, please try again."
                    } 
                    res.render ("campgrounds/index",
                    {
                    campgrounds: allCampgrounds,
                    current: pageNumber,
                    pages: Math.ceil(count / perPage),
                    noMatch: noMatch,
                    search: req.query.search
                    });
                }
            });
        });
        } else {
            // We need to get all the data to render from the DB
          //  Campground.find({}, function(err, allCampgrounds){
            //Invert the selection 
            // var sort=1;
            // if (req.query.latest){sort=-1}
            // else if(req.query.oldest){sort=1}
            // Always sort latest to oldest
            //skip calculates how many data from the collection we need to skip per page, at the beginning is 0 elements to skip
                Campground.find({}).sort([["createdAt", -1]]).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds) {
                    //count, counts all items in MongoDB collection
                    Campground.count().exec(function (err, count) {
                        if(err){
                            console.log(err);
                        }else{
                            res.render ("campgrounds/index",
                            {
                                campgrounds:allCampgrounds,
                                noMatch:noMatch,
                                current: pageNumber,
                                // ceil rounds up to the highest integer
                                pages: Math.ceil(count/ perPage)
                            });
                        }
                    });
            });
        }
    });

router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
    // res.send("You reach the post route!");
    // get data from form and add to campgrounds array
    var name = req.body.campground.name;
    var price = req.body.campground.price;
    var image = req.body.campground.image;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var desc = req.body.campground.description;
    geocoder.geocode(req.body.location, function(err, data){
        if (err){
            console.log(err);
        } else {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            var location = data.results[0].formatted_address;
            
            cloudinary.uploader.upload(req.file.path, function(result){
            //add cloudinary url for the image to the campground object under image property
            image = result.secure_url;
            //add author to campground
            
            var newCampground = {name: name, price: price, image: image, description:desc, author:author,
                location: location, lat: lat, lng: lng
            };
            //console.log(req.user)
             // Create a new campground and save to DB
            Campground.create(newCampground, function(err, newlyCreated){
                if (err){
                    req.flash("err", err.message);
                    return res.redirect("back");
                }else{
                    // redirect back to campgrounds page with updated array data
                    res.redirect("/campgrounds/"+ newlyCreated.id);
                }
            });
        }//,
        //Moderates images uploaded to cloudinary, free version
            // {
            //  moderation: "webpurify"
            // }
        );
        }
    });
});

// NEW - Show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req,res){
    res.render("campgrounds/new");
})

// SHOW - shows more info about one campground
/*Using show info of a specific campground
Be careful with the order because id could match any other previous url routes
that's why is important to put url with ids at the botton, so it prioritize the other routes*/
// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err||!foundCampground){
            req.flash("error", "Campground not found");
            res.redirect("back")
        } else {
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
            
        }
    });
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit",middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        res.render("campgrounds/edit", {campground:foundCampground})
    });
});

//UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function (req, res) {
    geocoder.geocode(req.body.campground.location, function(err, data){
        if (err){
            console.log(err);
        } else {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            var location = data.results[0].formatted_address;
            var newData = {name: req.body.campground.name, price: req.body.campground.price, image: req.body.campground.image, description:req.body.campground.description,
                location: location, lat: lat, lng: lng
            };
            //find and update correct campground
            Campground.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, updatedCampground){
                if (err){
                    req.flash("error", err.message);
                    res.redirect("/campgrounds");
                } else {
                    req.flash("success", "Sucessfully Updated!");
                    res.redirect("/campgrounds/" + req.params.id);
                }
            });
        }
    });
});

// DESTROY CAMPGROUND
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds");
        }
    });
});

//This function replace the text added for search with a match anything globally
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
module.exports=router;
