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

                async.each(allGroups, (group, callback) => {
                    group.populate('_queue', (err, populGroup) => {
                        if (err) callback(err);

                        teamQueues[group.name] = group._queue;

                        callback(null);
                    })

                });

                callback(null);
            });
        },

        (callback) => { // do personals
            User.find({}, (err, allUsers) => {
                if (err) callback(err);

                async.each(allUsers, (user, callback) => {
                    user.populate('personalQueue._invoice', (err, populUser) => {
                        teamQueues[['Personal Queue of', user.firstName, user.lastName].join(' ')] = _.pluck(user._personalQueue, '_invoice');
                    });
                });

                callback(null);
            });
        }
    ],
    (err) => {
        if (err) next(err);

        utils.deepPopulateManyQueues(teamQueues, (err, populatedTeamQueues) => {
            if (err) next(err);

            return res.json(populatedTeamQueues);
        });
    });
}
