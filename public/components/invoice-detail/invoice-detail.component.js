'use strict';

angular.
    module('invoiceDetail', ['ngInputModified', 'ui.bootstrap', 'ng-file-model']).
    component('invoiceDetail', {
        templateUrl: 'components/invoice-detail/invoice-detail.template.html',
        controller: function InvoiceDetailController(api, $q, $routeParams, $window, $filter, $scope, $location) {
            var self = this;
            window.ctrl = self;
            self.path = $window.location.hash

            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////
            ///
            ///// addLineItem doesn't belong here but it is used below

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

            // temporary (for testing);
            self.File = {
                data: 'https://dl.dropboxusercontent.com/apitl/1/AAD7Q5u42FvrToUY8RdEBXLE8wCwRfAeY_N9lozKj8zzDEPii_zd7inY6DM6Mamn6vj1GKnJv6-gA2nEtqE1nThpSB0s4A21tp5xUJEaqJnKHom4jab8M8Gl3Ju7i7mEIsdOUnNMLlcVTq6Wj9EdeiuIG12-xWN5H2ig7u_UDX27rZMf2ENcnirYxGK_rbjNDhRDUpSJbhMPnKyc_28K9nctUgA7i9KvMRXYHLx3PVAjQQ',
                type: 'application/pdf'
            }

            // External requests:
            
            self.Vendors = api.crudResources.Vendor.query();
            self.Hoods = api.crudResources.Hood.query();
            self.Expenses = api.crudResources.Expense.query();
            self.Activities = api.crudResources.Activity.query();
            self.Users = api.crudResources.User.query();

            /////////////////////UI params/////////////////////

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
            self.override = null;

            self.alertMessage = $location.search().alert || '';

            self.datePickerOptions = {
                disabled: [],
                maxDate: new Date,
                minDate: new Date(2015, 1, 1),
                startingDay: 1
            };

            //Get CurrentUser and Invoice:

            api.controls.getCurrentUser().then((res) => {
                self.CurrentUser = res.data;
            });

            api.controls.getInvoice($routeParams.id).then((res) => {
                if (res.status !== 200) {
                    alert(res.status);
                    self.alertMessage = status;
                }

                self.Invoice = res.data.invoice;
                self.canEdit = res.data.location.belongsToUser;
                self.currentQueueName = res.data.location.isPersonal
                                        ? 'Your own queue'
                                        : res.data.location.currentGroupName;

                //UI resets after invoice is found:
                
                self.Invoice.serviceDate = new Date(self.Invoice.serviceDate);
                self.enableAim = true;

                $scope.Form.$setPristine();

                if (_.isEmpty(self.Invoice.lineItems)) {
                    self.addLineItem();
                }
            },
            (error) => {
                console.log(error);

                self.alertMessage = [error.status, error.data].join(': ');
            });

            ////////////////////////////////////////////////////////////////////
            //FORM CTRL METHODS

            /* Given a lineItem, pushes an empty object literal to
             * the back of the _activities array of the lineItem
             */
            self.addActivity = (lineItem) => {
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

                return activityOptions;
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

            self.submit = (isHold) => {
                api.controls.submitInvoice(self.invoice, isHold, self.override)
                .then((res) => {
                    console.log(res);
                });
            }

            self.deleteInvoice = (isArchive) => {
                alert("Delete is not ready!");
            }

            /* Given an id and a collection, return the name of that document
             * 
             * Warning: this is reproduced elsewhere (as of writing, in user-dashboard).
             *  Consider moving to core!
             */
            self.getNameById = (id, collection) => {
                var doc = _.findWhere(self[collection], { _id: id })

                // If not found return null, otherwise return the name or
                // 'firstName lastName'
                return doc
                    ? doc.name
                    || [doc.firstName, doc.lastName].join(' ')
                    : null;
            }

            function getFileType(path) {
                var re = /(?:\.([^.]+))?$/;
                var extension = re.exec(path)[1];

                return extension === 'pdf' ? 'application/pdf' : 'image/' + extension;
            }
        } // end controller
    }); // end component