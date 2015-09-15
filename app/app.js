
var app = angular.module('app', [
	'ngRoute',
    'ngResource',
    'login',
    'app.root',
    'asset',
    'asset.type',
    'system.status'
]);

(function() {
	// Bootstrap the app with the config fetched via http //
	var configConstant = "Configuration";
	var configUrl      = "/config";

    function fetchAndInjectConfig() {
        var initInjector = angular.injector(["ng"]);
        var $http = initInjector.get("$http");

        return $http.get(configUrl).then(function(response) {
            app.constant(configConstant, response.data);
        }, function(errorResponse) {
            // Handle error case
            console.log(errorResponse);
        });
    }

    function bootstrapApplication() {
        angular.element(document).ready(function() {
            angular.bootstrap(document, ["app"]);
        });
    }

    fetchAndInjectConfig().then(bootstrapApplication);
    
}());

app.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.when('/login', {
			templateUrl: 'app/login/login.html',
			controller: 'loginController'
		}).when('/status', {
            templateUrl: 'app/status/status.html',
            controller: 'statusController'
        }).when('/:asset_type', {
            templateUrl: 'app/assettype/asset-type.html',
            controller: 'assetTypeController'
        }).when('/:asset_type/:asset', {
            templateUrl: 'app/asset/asset.html',
            controller: 'assetController'
        }).when('/:asset_type/:asset/versions', {
            templateUrl: 'app/asset/asset-versions.html',
            controller: 'assetVersionsController'
        }).when('/', {
            templateUrl: 'app/root/root.html',
            controller: 'rootController'
        }).otherwise({
			redirectTo: '/'
		});
	}
]);

app.filter('objectLength', function() {
	return function(obj) {
    	return Object.keys(obj).length;
	};
})
.filter('toHumanBytes', function() {
    return function(fileSize) {
        var kb  = fileSize/1024;
        if(kb < 1024) {
            return kb.toFixed(2).toString() +" KB";
        }

        var mb = kb/1024;
        if(mb < 1024) {
            return mb.toFixed(2).toString() +" MB";
        }

        var gb = mb/1024;
        if(gb < 1024) {
            return gb.toFixed(2).toString() +" GB";
        }

        return (gb/1024).toFixed(2).toString()+" TB";
    }
})
.controller('defaultController', [
    '$rootScope', '$location', '$scope', 'CredCache', 'Authenticator', '$timeout',
    function($rootScope, $location, $scope, CredCache, Authenticator, $timeout) {
        /* This is the top level controller (all encompassing) */

        var _timer;

        $scope.userNotificationData = {};

        // Where to redirect back to after login
        $scope.currUrlPath = "/";
        // Global session object
        $scope.session = CredCache.getCreds();

        $scope.logout = function() {
            Authenticator.logout();
        }

        $scope.$on('$routeChangeSuccess', function(e) {
            $scope.currUrlPath = $location.url();
        });

        $scope.showUserNotification = function(data) {
            if (_timer) $timeout.cancel(_timer);

            $scope.userNotificationData = data;

            $timeout(function() {
                $scope.userNotificationData = {};
            }, 3000);
        } 
        
        $rootScope.$on('user.authenticated', function(e) {
            $scope.session = CredCache.getCreds();
        });

        $rootScope.$on('user.unauthenticated', function(e) {
            // Manually null as it's cheaper.
            $scope.session = null;    
        });

    }
]);

