/**
 * activity.js
 */

var mongoose = require('mongoose');

var activitySchema = new mongoose.Schema({
		code: Number,
		desc: String
	});

module.exports = mongoose.model('Activity', activitySchema, 'activities');