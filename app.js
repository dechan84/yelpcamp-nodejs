/*Init express*/
var express       = require("express");
var app           = express();
var bodyParser    = require("body-parser");
/*Init mongoose*/
var mongoose      = require ("mongoose");
var flash         = require("connect-flash")
var passport      = require("passport");
var LocalStrategy = require("passport-local")
// Calling campground models
var Campground    = require("./models/campground");
var Comment       = require("./models/comment");
var User          = require("./models/user");
// Adding a seed file to generate comments
var seedDB        = require("./seeds");
var methodOverride = require("method-override");
//Adding moment to all our files
app.locals.moment = require("moment");

//requiring routes
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes       = require("./routes/index")

//The env var uses a var for local cloud 9 dev and another for Heroku
//If you want access you need mlab acount, dbuser and dbpassword
mongoose.connect(process.env.DATABASEURL);

/*We need to tell express to use bodyParser*/
app.use(bodyParser.urlencoded({extended: true}));

/*Add specific folder/path to external files for express to look into it*/
app.use(express.static(__dirname + "/public"));

/*Make express to accept ejs files (or any other extension), this will
allow you to not type ejs extension in each render parameter*/
app.set("view engine", "ejs");

app.use(methodOverride("_method"));
/*Enables flash msg*/
app.use(flash());

// Run the seedDB to use the seeds
//seedDB();

//PASSPORT CONFIG
app.use(require("express-session")({
    secret: "Once again Rusty wins",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//In here we are passing the currentUser parameters to all apps instead of writing
//one by one, 
app.use(function(req, res, next){
    res.locals.currentUser=req.user;
    res.locals.error= req.flash("error");
    res.locals.success= req.flash("success");
    res.locals.myCampground=req.campground;
    next();
})

//Lets append campgrounds, index and comment here and remove them from the routes
//index in this case is not needed because there is not much...
//Remember now we need to modify only the campgrounds routes so instead of "/campgrounds"
//now is "/"
app.use(indexRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds", campgroundRoutes);

app.listen(process.env.PORT, process.env.IP, function () {
    console.log("The Yelp Camp Server connected!")
})