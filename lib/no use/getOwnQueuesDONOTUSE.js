// /**
//  * Only need user from req - no custom params
//  *
//  * res.queues is a map of arrays of invoices
//  *
//  * NOTE: Dropbox has a 'dropzone' directory for every file that hasn't been
//  * keyed yet. All users where canKey==true have a 'to key from dropzone' queue
//  * that corresponds with the files in that directory. The way this is
//  * implemented is that brand new files in the 'dropzone' directory become
//  * invoices, i.e. they are added to database, when a user with canKey==true
//  * requests getOwnQueues. This eliminates the need for WebHoooks and server-side
//  * workers, while also preventing any loss of resources - the first time anyone
//  * will ever need to see the invoice object is when they are being keyed.
//  *
//  * Possible client errors: none. Due to nature of request any error is 500
//  */




// var _ = require('underscore');
// var async = require('async');

// const Invoice = require('../models').Invoice;
// const Group = require('../models').Group;
// const utils = require('../utils')
// const globals = require('../globals');

// var getOwnQueues = (req, res, next) => {
// 	var user = globals.testingMode ? globals.testUser : req.user;
// 	var tasks = {};

// 	// Define possible tasks -- different ways of fetching types of queues

// 	var getKeyQueue = (callback) => {
// 		utils.loadFromDropzone(user.currentToken, (err) => {
// 			if (err) return callback(err, null);

// 			Invoice.find().where('canKey').equals('true').exec(callback);
// 		});
// 	};

// 	var getGroupsQueues = (callback) => {
// 		utils.getQueuesFromGroups(user._groups, callback);
// 	};

// 	var getPersonalQueue = (callback) => {
// 		async.each(user._personalQueue, (invoiceId, callback) => {
// 			Invoice.findById(invoiceId, callback)
// 		}, callback);
// 	}

// 	// Run some tasks in parallel:
// 	if (!_.isEmpty(user._groups)) 		 tasks.groups   = getGroupsQueues;
// 	if (!_.isEmpty(user._personalQueue)) tasks.personal = getPersonalQueue;
// 	if (user.canKey) 					 tasks.keyables = getKeyQueue;

// 	// If no tasks to run, send back empty Map (this is still a 200)
// 	if (_.isEmpty(tasks)) return res.send(new Map()) 

// 	async.parallel(tasks, (err, results) => {
// 		err ? next(err) : res.json({ queues: parseResultsToMap(results) });
// 		return;
// 	});
// }

// ////////////////////////////////////////////////////////////////////////////////

// // After running tasks must parse results into one map of arrays. Groups is
// // a map of arrays, and keyables and personables are arrays.
// // 
// // Takes: results of parallel tasks. This is an object with 3 possible elements:
// // 	-groups
// // 	-personal
// // 	-keyables
// // 	
// // returns: Map of arrays of Invoices
// // 
// function parseResultsToMap(results) {
// 	var queues = new Map();

// 	if (results.keyables) queues['Invoices to key'] = results.keyables;
// 	if (results.personal) queues['Your personal queue'] = results.personal;

// 	if (results.groups) {
// 		// groups are returned as a Map where key is group name and value is
// 		// array of Invoices
// 		_.each(results.groups, (groupQueue, groupName) => {
// 			queues[groupName] = groupQueue;
// 		})
// 	}

// 	return queues;
// }



// module.exports = getOwnQueues;