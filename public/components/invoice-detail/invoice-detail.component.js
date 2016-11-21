'use strict';

angular.
    module('invoiceDetail', ['ngInputModified', 'ui.bootstrap', 'ng-file-model']).
    component('invoiceDetail', {
        templateUrl: 'components/invoice-detail/invoice-detail.template.html',
        controller: function InvoiceDetailController(api, $routeParams, $window, $filter, $scope, $location) {
            var self = this;
            window.ctrl = self;
            self.path = $window.location.hash

            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////

            self.File = {
                data: 'https://dl.dropboxusercontent.com/apitl/1/AAD7Q5u42FvrToUY8RdEBXLE8wCwRfAeY_N9lozKj8zzDEPii_zd7inY6DM6Mamn6vj1GKnJv6-gA2nEtqE1nThpSB0s4A21tp5xUJEaqJnKHom4jab8M8Gl3Ju7i7mEIsdOUnNMLlcVTq6Wj9EdeiuIG12-xWN5H2ig7u_UDX27rZMf2ENcnirYxGK_rbjNDhRDUpSJbhMPnKyc_28K9nctUgA7i9KvMRXYHLx3PVAjQQ',
                type: 'application/pdf'
            }

            // External requests:
            self.Vendors = api.crudResources.Vendor.query();
            self.Hoods = api.crudResources.Hood.query();
            self.Expenses = api.crudResources.Expense.query();
            self.Activities = api.crudResources.Activity.query();
            self.CurrentUser = api.controls.getCurrentUser();

            //Used for adding new changes to Invoice.actions when it is being
            //edited:
            self.changeComments = [];
            self.generalComment = '';

            // Bootstrap UI & third-party configs:
            self.addAnother = false; //Checkbox at bottom of form
            self.hideDeleteConfirm = true; //collapser for delete confirm
            self.enableAim = false; //Starts disabed - wait until the invoice promise
            self.openDate = false;  //Opens datepicker on icon click
            self.showAlert = true;

            //
            self.isLoading = false;
            self.alertMessage = $location.search().alert || '';

            // Whether the invoice is new:
            self.isNew = $routeParams.id === 'new';

            self.datePickerOptions = {
                disabled: [],
                maxDate: new Date,
                minDate: new Date(2015, 1, 1),
                startingDay: 1
            };

            // Either Invoice is retrived from DB or it gets a starter template:
            self.Invoice = {
                    serviceDate: new Date,
                    invNum: '',
                    _vendor: '',
                    lineItems: [],
                    comment: '',
                    actions: [{
                        desc: 'CREATED',
                        comment: '',
                        date: new Date,
                        _user: undefined // Wait for CurrentUser promise resolution to fill
                    }],
                    filePath: null
                };

            ////////////////////////////////////////////////////////////////////
            //PROMISES

            /* Note: self.isNew can be processed on page load because $routeParams 
             * processes on page load. For self.canReview and self.canEdit, must
             * wait for the CurrentUser to be fetched from the api (via a server
             * round trip processing SID cookie). Note that the camelCased currentUser
             * is different from the PascalCased self.CurrentUser. The former is
             * the returned data from the promise, while the latter is used to
             * bind to the view (which obviously Angular knows when to update).
             */
            // self.CurrentUser.$promise.then(function(currentUser) {
            //     // Whether is in the current user's queue:
            //     self.canReview = _.contains(currentUser._invoiceQueue, $routeParams.id);
            //     // Whether it can be edited at all:
            //     self.canEdit = self.isNew || self.canReview;
            //     // See self.Invoice declaration for this:
            //     if (self.isNew) {
            //         self.Invoice.actions[0]._user = currentUser._id;
            //     }

            //     return currentUser;
            // });

            //Set pristine after the invoice loads, so that AIM doesn't
            //recognize the invoice load from api is a Form change
            if (!self.isNew) { // i.e., the invoice must have been an api get
                self.Invoice.$promise.then(function(invoice) {
                    //Datepicker needs to initially get a Date object
                    invoice.serviceDate = new Date(invoice.serviceDate);

                    self.enableAim = true; //Turn on AIM
                    $scope.Form.$setPristine() //Reset changes tracked
                });
            }

            ////////////////////////////////////////////////////////////////////
            //FORM CTRL METHODS

            //lineItem logic:

            /* Pushes a new lineItem to self.lineItems.
             * Note: it is a angular getter/setter, hence must check args
             */
            self.addLineItem = function() {
                //Push the line item itself
                self.Invoice.lineItems.push({
                    category: 'CIP', //default behavior is CIP
                    _hood: '',
                    subHood: '',
                    _activities: [],
                    _expense: '',
                    amount: undefined,
                    desc: ''
                });
            }

            //(this gets ran on pageload but waits
            //for the addLineItem definition)
            if (self.isNew) { self.addLineItem(); }

            /* Given a lineItem, pushes an empty object literal to
             * the back of the _activities array of the lineItem
             */
            self.addActivity = function(lineItem) {
                lineItem._activities.push('')
            }

            /* getSubHoodOptions takes a lineItem and returns
             * the possible options that can be selected for ANOTHER subHood.
             */
            self.getSubHoodOptions = function(lineItem) {
                return lineItem._hood
                       ? self.getElementById(lineItem._hood, 'subHoodOptions', 'Hoods')
                       : [];
            }

            /* Given a subHood (dev, hood, or a number), determine which activities
             * can be applicable to that subHood. Follows Brightwater logic:
             * 0000-0399 = Dev
             * 0400-0999 = Hood
             * 1000-9999 = else
             *
             * lineItem is the line item and currentIndex is the the index of the
             * activity in lineItem._activities that is being changed - this is
             * so that it is persistent in the dropdown list when other currently
             * selected activities would otherwise get filtered out by the function
             */
            self.getActivityOptions = function(lineItem, currentIndex) {
                var activityOptions;

                switch(lineItem.subHood) {
                    case '':
                        activityOptions = [];
                        break;
                    case 'Dev':
                        activityOptions = self.Activities.filter(function(activity) {
                            return   0 <= activity.code && 
                                   399 >= activity.code
                        });

                        break;
                    case 'Hood':
                        activityOptions = self.Activities.filter(function(activity) {
                            return 400 <= activity.code &&
                                   999 >= activity.code
                        });

                        break;
                    default: // i.e. is number so lots
                        activityOptions = self.Activities.filter(function(activity) {
                            return 1000 <= activity.code &&
                                   9999 >= activity.code
                        });
                }

                return activityOptions
            }

            /* Given a lineItem, runs the JS native eval() function on the
             * lineItem's amount - in other words, if the amount is a string
             * including operators, it will evaluate the operators and convert
             * it to a Number. Also updates total amount upon change
             */
            self.evaluateAmount = function(lineItem) {
                lineItem.amount = $filter('currency')(eval(lineItem.amount), '');
                self.updateAmount();
            }

            /* Given an array activities, sorts the array alphabetically
             * according to the 'desc' property of each objet in the array.
             * returns the sorted array
             */
            self.sortByDesc = function(activities) {
                return activities.sort(function(a, b) {
                    if (a.desc < b.desc) { return -1; }
                    if (a.desc > b.desc) { return 1; }

                    return 0;
                });
            }

            /* To be ran every time an amount changes - updates Invoice.amount with
             * the correct amount, or sets to NaN if a view expression has not
             * been evaluated with eval()
             */
            self.updateAmount = function() {
                self.Invoice.amount = _.pluck(self.Invoice.lineItems, 'amount')
                .reduce(function(a, b) {
                    return Number(a) + Number(b);
                }, 0);
            }

            ////////////////////////////////////////////////////////////////////

            self.submit = function() {
                
            }

            self.hold = function () {
                
            }

            self.deleteInvoice = function() {

            }

            ////////////////////////////////////////////////////////////////////
            //db getters

            /* Given an id and a collection, return the name of that document
             * 
             * Warning: this is reproduced elsewhere (as of writing, in user-dashboard).
             *  Consider moving to core!
             */
            self.getNameById = function(id, collection) {
                var doc = _.findWhere(self[collection], { _id: id })

                // If not found return null, otherwise return the name or
                // 'firstName lastName'
                return doc
                    ? doc.name
                    || [doc.firstName, doc.lastName].join(' ')
                    : null;
            }

            self.getElementById = function(id, element, collection) {
                var doc = _.findWhere(self[collection], { _id: id });

                return doc ? doc[element] : null;
            }
















            function getFileType(path) {
                var re = /(?:\.([^.]+))?$/;
                var extension = re.exec(path)[1];

                return extension === 'pdf' ? 'application/pdf' : 'image/' + extension;
            }

            /* Generate a new MongoDB ObjectId
             * Coped from user solenoid at:
             * https://gist.github.com/solenoid/1372386
             */
            function generateMongoObjectId() {
                var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
                return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
                    return (Math.random() * 16 | 0).toString(16);
                }).toLowerCase();
            };


        } // end controller
    }); // end component