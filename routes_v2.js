/**
 * routes_v2.js
 *
 * API has been completely revamped, v1 deprecated as of Oct 28 2016.
 *
 */

var express = require('express');
var passport = require('passport');
var _ = require('underscore');
var bunyanLogger = require('express-bunyan-logger');

var router = express.Router();

const Controllers = require('./lib/Controllers');
const utils = require('./lib/utils');
const globals = require('./lib/globals');
const models = require('./lib/models');
const User = require('mongoose').model('User');

const authRedirects = {
	successRedirect: '/#!/dashboard',
    failureRedirect: '/#!/404' // TODO
}

router.get('/auth/dropbox', passport.authenticate('dropbox-oauth2'));
router.get('/auth/dropbox/callback', passport.authenticate('dropbox-oauth2', authRedirects));

/**
 * Error-handling for auth routes
 * 
 * TODO: Should the view for error handling for auth routes be rendered by Express or by Angular?
 * TODO: Shouldn't always send 500 - sometimes its 4xx depending on what happened
 */
router.use((err, req, res, next) => {
	res.status(500).send(err)
});

/**
 * pre-response middleware:
 *
 * Verify valid SID - respond with 401 if not logged in
 */
router.use((req, res, next) => {
    if (!req.user && !globals.testingMode) {
        res.sendStatus(401)
    } else if (!req.user && globals.testingMode) {
        console.log('Bypassing cookie verification and logging in manually');
        
        User.findById(globals.testUserId, (err, user) => {
            if (err) {
                res.sendStatus(500)
                console.log(err);
                return;
            } else {
                req.user = user;
                next();
            }
        });
    } else {
        next();
    }
});

router.get('/currentuser', (req, res, next) => { res.send(req.user); }); // TODO: strip down some info, so only includes first and last names
router.get('/ownqueues', Controllers.getOwnQueues);
router.get('/invoice/:id', Controllers.getInvoice);
router.get('/refreshdropzone', Controllers.refreshDropzone);
router.post('/submitinvoice', Controllers.submitInvoice);

var crudableModels = [ 'Activity', 'Hood', 'Expense', 'Vendor' ]

_.each(models, (model) => {
    if (_.contains(crudableModels, model.modelName)) {
        crudify(model, router);
    }
})

/**
 * Error-handling for core api v2 routes:
 *
 * Log error stack then respond with 500
 *
 * Don't expose error message to client
 */
router.use((err, req, res, next) => {
	if(err.stack) {
		console.log(err.stack);
	} else {
		console.log(err || 'Error-handling middleware called with no error');
	}
	
	res.sendStatus(500); 
});


////////////////////////////////////////////////////////////////////////////////

/**
 * Add routes to the router that allow for basic CRUD operations on the model
 */
function crudify(model, router) {
    /* POST
     * Pass an object (note: mongoose doesn't validate)
     * Nothing is sent back.
     * anything as an extram URI param has no effect (wildcard)
     */
    router.post('/' + model.modelName + '/:wildcard', function(req, res) {
        model(req.body).save(function(error) {
            if (error) {
                console.log(error);
                res.send(error);
            } else {
                res.send({ success: true })
            }
        });
    });

    /* GET by query (also the easiest way to get full list of documents)
     * Pass a standard MongoDB query as params
     * The entire object is sent back.
     */
    router.get('/' + model.modelName, function(req, res) {
        model.find(req.query, function(error, data) {
            if (error) {
                console.log(error);
                res.send(error);
            } else {
                res.send(data);
            }
        });
    });

    /* GET by id
     * same as get by query except the id is passed as part of the URI
     */
    router.get('/' + model.modelName + '/:id', function(req, res) {
        model.findById(req.params.id, function(error, data) {
            if (error) {
                console.log(error);
                res.send(error);
            } else {
                res.send(data);
            }
        });
    });

    /* PUT by id
    * Any updates to elements (adding elements, etc.) pass as body
    * Imposible to remove single elements but an array can be fully replaced.
    *
    * Nothing is sent back.
    */
    router.put('/' + model.modelName + '/:id', function(req, res) {
        model.findById(req.params.id, function(error, data) {
            if (error) {
                console.log("Error with finding id:\n" + error);
                res.json(error);
            } else {
                _.extend(data, req.body)
                .save(function(error, data) {
                    if (error) {
                        console.log("Error updating model:\n" + error);
                        res.json(error);
                    } else {
                        res.json({ success: true });
                    }
                });
            }
        });
    })

    /* DELETE by id
    * Pass a standard MongoDB query as params
    * Nothing is sent back.
    */
    router.delete('/' + model.modelName + '/:id', function(req, res) {
        model.findByIdAndRemove(req.params.id, function(error) {
            console.log(error);
            if (error) {
                console.log(error);
                res.status(500).send(error);
            } else {
                res.json({ success: true });
            }
        });
    });
}








module.exports = router;