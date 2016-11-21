//TODO: Validation

'use strict';

angular.
    module('settings').
    component('settings', {
        templateUrl: 'components/settings/settings.template.html',
        controller: function SettingsController(api, $window, $location) {
        	var self = this;
            window.ctrl = self;
            self.path = $window.location.hash

            var DIRNAME = '/components/settings/';

            ////////////////////////////////////////////////////////////////////

            // External requests:
            self.Vendors = api.Vendor.query();
            self.Hoods = api.Hood.query();
            self.Expenses = api.Expense.query();
            self.Activities = api.Activity.query();
            self.Invoices = api.Invoice.query();
            self.CurrentUser = api.CurrentUser.get();
            self.Groups = api.Group.query();
            self.Users = api.User.query();

            //UI

            self.isLoading = false;
            self.alertMessage = ''; //This should never get a alert from a query string as long as in settings - because no redirects to here

            self.showAdder = false;
            self.showDeleter = []
            self.newGroupName = '';

            ////////////////////////////////////////////////////////////////////

            self.Groups.$promise.then(function() {
                //BUG
                self.Groups = self.Groups.sort(function(a, b) {
                    console.log(a);
                    console.log(b);
                    return a > b ? 1 : 0;
                });
            });

            /* .panel-default, .panel-primary, .panel-success, .panel-info, .panel-warning, or .panel-danger */
            self.viewPanels = [
                {
                    title: 'Define users',
                    template: DIRNAME + 'user-define.partial.html',
                    class: 'well well-lg'
                },
                {
                    title: 'Define pipeline',
                    template: DIRNAME + 'pipeline-define.partial.html',
                    class: 'well well-lg'
                }
            ];

            ////////////////////////////////////////////////////////////////////

            self.makeAdmin = function(user) {
                if (user.isAdmin) {
                    user.canOverride = true;
                    user.canCreate   = true;
                }
            };

            self.getUserNamesForGroup = function(group) {
                var users = _.where(self.Users, {_group: group._id});

                return _.pluck(users, 'firstName');
            }

            self.submitUserChange = function() {
                self.isLoading = true;

                //Update each invoice individually
                _.each(self.Users, function(user) {
                    user.$update(function() {

                    //When last one complete:
                    if (_.last(self.Users) == user) {
                            self.isLoading = false;
                            self.alertMessage = 'Successfully updated users';
                            self.Users = api.User.query();
                        }
                    });
                });
            }

            self.deleteGroup = function(group, index) {
                self.isLoading = true;

                self.Groups.splice(index, 1);

                group.$delete(function() {
                    self.isLoading = false;
                    self.alertMessage = 'Successfully deleted group';
                });
            }

            /* Push a new group to Groups according to self.newGroupName.
             * also resets the newGroupName field
             */
            self.addNewGroup = function() {
                self.Groups.push(new api.Group({
                    _id: generateMongoObjectId(),
                    name: self.newGroupName,
                    pipelineIndex: null
                    //isHead and _nextGroup get set later
                }));

                self.newGroupName = '';
            }

            self.submitGroupChange = function() {
                function andCheckLast(self, i) {
                    if (i === self.Groups.length - 1) {
                        self.isLoading = false;
                        self.alertMessage = 'Successfully updated groups';
                        self.Groups = api.Group.query();
                    }
                }

                self.isLoading = true;

                //set _nextGroup and isHead for each group in Groups
                for (var i = 0; i < self.Groups.length; i++) {
                    var group = self.Groups[i]

                    group.isHead = (i === 0);

                    if (i === self.Groups.length - 1) {
                        group._nextGroup = null;
                    } else {
                       group._nextGroup = self.Groups[i + 1]._id;
                    }

                    if (group.pipelineIndex) { //isn't new in db
                        group.$update(andCheckLast(self, i));
                    } else { // must add to db
                        group.$save(andCheckLast(self, i))
                    }
                };
            }





















            ////////////////////////////////////////////////////////////////////

            //TODO: Move mongo generator to core

            /* Generate a new MongoDB ObjectId
             * Copied from user solenoid at:
             * https://gist.github.com/solenoid/1372386
             */
            function generateMongoObjectId() {
                var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
                return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
                    return (Math.random() * 16 | 0).toString(16);
                }).toLowerCase();
            };



        }
    });