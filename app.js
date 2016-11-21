/* Dillon Bostwick 2016
 * 
 * app.js
 *
 * 
 * /api/v1/... - RESTful connection with basic 1:1 mapping to db
 * /api/v2/... - RESTful connection to db
 * /wsdl - SOAP connection to qbwc
 * /#!/... - Angular routes
 * mongoDB connection on port 27017
 */

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var mongoose = require('mongoose');
var favicon = require('serve-favicon');
var path = require('path');
var passport = require('passport');
var expressSession = require('express-session');
var _ = require('underscore');
var dropboxStrategy = require('passport-dropbox-oauth2').Strategy;

var models = require('./lib/models');

const globals = require('./lib/globals')
const qbws   = require('./lib/qbws');
const v2ApiRouter = require('./routes_v2');
const User = require('./lib/models').User

const dbStrategyOptions = {
  apiVersion: '2',
  clientID: 'o2h3e5h6mytkwvg',
  clientSecret: 'n59fazsvvrs7708',
  callbackURL: globals.authCallbackUrl
}

////////////////////////////////////
//DATABASE SETUP////////////////////
////////////////////////////////////

mongoose.Promise = global.Promise;

mongoose.connect(globals.mongoUri); // db is called 'saguaro'

var db = mongoose.connection;

db.on("error", console.error.bind(console, "Connection to MongoDB failed"));

db.once("open", (callback) => {
  console.log("Connection to MongoDB on " + globals.mongoPort);
});

////////////////////////////////////
//OAUTH SETUP///////////////////////
////////////////////////////////////

passport.use(
  new dropboxStrategy(
    dbStrategyOptions,
    function(accessToken, refreshToken, profile, done) {
      if (!profile._json.team || profile._json.team.id != globals.brightwaterDropboxTeamId) {
        done('ERROR: User is valid Dropbox user but does not belong to the Brightwater Homes team', false);
      } else {
        User.findById(profile._json.account_id, function(err, data) {
          if (err) {
            done('An error occured while retrieving user from database:\n\n\n' + 
            JSON.stringify(err) + '\n\n\nYour Dropbox user ID: ' +
            profile._json.account_id, false);
          } else {
            data.currentToken = accessToken;

            data.save(function() {
              done(null, data);
            }); //end save
          } //end if
        }); //end findByIdandUpdate
      } //end if
    }) //end dropboxStrategy constructor
); //end passport.use

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//Declaring app after Oauth setup - see https:github.com/passport/express-4.x
//-twitter-example/blob/master/server.js
var app = express();

app.set('port', (process.env.PORT || globals.localPort));
console.log('Express server running on ' + globals.localPort);

////////////////////////////////////
//MIDDLEWARE////////////////////////
////////////////////////////////////

app.use(favicon(path.join(__dirname, 'public', 'images/favicon.ico')));
app.use(express.static(path.join(__dirname, 'public'))); // accesses Angular app, with ensureLoggedIn as middleware
app.use(expressSession({ secret: 'dillon', resave: true, saveUninitialized: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/v2', v2ApiRouter);


////////////////////////////////////
//SERVER LINK TO QBWS///////////////
////////////////////////////////////

//qbws takes care of linking the server to the soap at '/wsdl'... The server
//must get passed to run so that qbws knows where to listen

var server = http.createServer(app);
qbws.run(server);

////////////////////////////////////

/* Returns the _id of a user in the databse with the matching dropboxUid.
 * if no match, returns null
 *
 * TODO: move to model
 */
function getUserIdByDropboxId(dropboxUid) {
  //find in models array
  _.find(models, function(model) { return model.modelName === 'user'})
  
  //db find given result of previous find
  .find({'dropboxUid': dropboxUid}, function(error, data) {
    return error ? null : data._id
  });
}







module.exports = app;
