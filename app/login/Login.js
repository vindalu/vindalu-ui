angular.module('login', [])
.factory('CredCache', ['$window', function($window) {
    var storageKey = "vindaloo",
        _credsCache = null;

    var getCreds = function() {
        if (_credsCache != null) {
            return _credsCache;
        } else if ($window.sessionStorage[storageKey]) {
            try {
                var c = JSON.parse($window.sessionStorage[storageKey]);
                if (c == null || Object.keys(c).length < 1) return null 
                _credsCache = c;
                return _credsCache;
            } catch(e) { console.error(e); }
        }
        return null;
    }

    var setCreds = function(obj) {
        var creds = getCreds();
        if (creds != null)
            _credsCache = $.extend({}, creds, obj);
        else
            _credsCache = obj;

        // Remove empties
        for (var k in _credsCache) {
            if (k == "" || k == null) delete _credsCache[k]
        }

        //console.log('Setting creds', _credsCache);
        $window.sessionStorage[storageKey] = JSON.stringify(_credsCache);
        
        // Return new cache creds object
        return _credsCache;
    }

    var clearCreds = function() {
        _credsCache = null;
        try { delete $window.sessionStorage[storageKey] } 
        catch(e) { /* harmless */ }
    }

    return {
        getCreds: getCreds,
        setCreds: setCreds,
        clearCreds: clearCreds
    }
}])
.factory('Authenticator', [
    '$rootScope', '$http', '$q', 'CredCache',
    function($rootScope, $http, $q, CredCache) {
    
        var publishEvent = function(evtName) {
            // Notify parent/s and children.
            //$rootScope.$broadcast(evtName);
            $rootScope.$emit(evtName);
        }

        var getBasicAuthdata = function(user, pass) {
            return btoa(unescape(encodeURIComponent(user+":"+pass)));
        }

        var getUserPassAuthHeader = function(user, pass) {
            return {
                "Authorization": "Basic "+getBasicAuthdata(user, pass)
            };
        }

        var _getTokenAuthHeader = function(token) {
            return { "Authorization": "BEARER "+token };
        }

        var getNewToken = function(creds) {
            var headers = creds.token != undefined ? _getTokenAuthHeader(creds.token) : getUserPassAuthHeader(creds.username, creds.password),
                dfd = $q.defer();

            $http({
                url: "/auth/access_token", 
                headers: headers, 
                method: "POST"
            }).then(function(token) {
                dfd.resolve(CredCache.setCreds($.extend({}, {"username": creds.username}, token.data)));
                publishEvent('user.authenticated');
            }, function(err) {
                dfd.reject(err);
            });
            return dfd.promise;
        }

        var _logout = function() {
            CredCache.clearCreds();
            publishEvent('user.unauthenticated');
        }

        var _isSessionAuthenticated = function() {
            return CredCache.getCreds() != null
        }

        var getAuthHeader = function() {
            //currently only
            var creds = CredCache.getCreds()
            return _getTokenAuthHeader(creds.token);
        }

        return {
            login                   : getNewToken,
            logout                  : _logout,
            getAuthHeader           : getAuthHeader,
            isSesstionAuthenticated : _isSessionAuthenticated,
        };

    }
])
.controller('loginController', [
    '$scope', '$window', '$routeParams', '$location', 'Authenticator', 'Configuration', 'CredCache',
    function($scope, $window, $routeParams, $location, Authenticator, Configuration, CredCache) {
        
        var defaultPage = "/";
        
        $scope.credentials = {username:"", password:""}; // Holding area
        $scope.loginWindowHeader = "";

        var performRedirect = function() {
            if ($routeParams.redirect) $location.url($routeParams.redirect);
            else $location.url(defaultPage);
        }

        var resetLoginHeader = function() {
            $scope.loginWindowHeader = "Vindalu "+Configuration.version;
        }

        $scope.attemptLogin = function() {
            $scope.loginWindowHeader = "";
            if ( $scope.credentials.username == "" || $scope.credentials.password == "" ) {
                $scope.loginWindowHeader = "Invalid username/password!";
                return
            }
            
            Authenticator.login($scope.credentials).then(function(creds){
                resetLoginHeader();
                performRedirect();
            }, function(err) {
                $scope.loginWindowHeader = err.data;
            });

        }

        var init = function() {
            resetLoginHeader();

            if (Authenticator.isSesstionAuthenticated()) {
                performRedirect();
            }
            /*
            $('#_password').keypress(function(e) {
                if ( e.which == 13) $scope.attemptLogin(); 
            });*/
        }

        init();
    }
]);




