/* TODO FINAL:
 * - https://github.com/jaredhanson/passport-dropbox as middleware (second argument) for get/post/put methods
 * to ensure all backend validation
 *
 * Even if you do deprecate this API, still have to ensure login above.
 * But maybe keep for some 1:1 mapping purposes
 */

var express = require('express');
var _ = require('underscore');
var mongoose = require('mongoose');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

const models = require('./lib/Models')

var router = express.Router();

////////////////////////////////////////////////////////////////////////

//initial authentication send
router.get('/auth/dropbox', passport.authenticate('dropbox-oauth2'));

//callback from dropbox after authentication
router.get('/auth/dropbox/callback',
           passport.authenticate('dropbox-oauth2',
                                 {
                                    successRedirect: '/#!/dashboard',
                                    failureRedirect: '/#!/login'
                                 }));

////////////////////////////////////////////////////////////////////////

var crudableModels = [ 'Activity', 'Hood', 'Expense', 'Vendor' ]

_.each(models, (model) => {
    if (_.contains(crudableModels, model.modelName)) {
        crudify(model, router);
    }
})

////////////////////////////////////////////////////////////////////////




module.exports = router;