'use strict';

angular.
	module('saguaro')
	.config(['$locationProvider' ,'$routeProvider', 'inputModifiedConfigProvider',
    function config($locationProvider, $routeProvider, inputModifiedConfigProvider) {
    	$locationProvider.hashPrefix('!');

      //Define routes
    	$routeProvider
        .when('/dashboard', {
          template: '<user-dashboard></user-dashboard>'
        })
        .when('/settings', {
          template: '<settings></settings>'
        })
        .when('/invoices/:id', {
          template: '<invoice-detail></invoice-detail>'
        })
        .when('/', {
          templateUrl: 'login.template.html'
        })
        .when('/404', {
          template: '<h2>404</h2><p>I can\'t find what you\'re looking for</p>'
        })
        .otherwise('/404');

      //Configure AngularInputModified:
      inputModifiedConfigProvider
        .disableGlobally()
        .setModifiedClassName('aim-modified')
    }
  ]);