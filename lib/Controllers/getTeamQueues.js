/**
 * Get all the teams not just belonging to user
 */

var mongoose = require('mongoose');
var async = require('async');
var _ = require('underscore');


const utils = require('../utils');
const Group = mongoose.model('Group');
const User = mongoose.model('User');


module.exports = (req, res, next) => {
    var teamQueues = {};

    async.parallel([
        (callback) => { // do groups
            Group.find({}, (err, allGroups) => {
                if (err) callback(err);

                _.each(allGroups, (group) => {
                    teamQueues[group.name] = group._queue;
                });
            });
        },

        (callback) => { // do personals
            User.find({}, (err, allUsers) => {
                if (err) callback(err);

                _.each(allUsers, (user) => {
                    teamQueues.[['Personal Queue of', firstName, lastName].join(' ')] = _.pluck(user._personalQueue, '_invoice');
                });
            });
        }
    ],
    (err) => {
        if (err) next(err);

        deepPopulateManyQueues(teamQueues, (err, populatedTeamQueues) => {
            return res.json(populatedTeamQueues);
        });
    });
}
