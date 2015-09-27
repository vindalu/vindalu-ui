angular.module('asset.type', [])
.factory('AssetTypeService', [ '$http', '$q','Configuration', function($http, $q, Configuration) {
    // Delay request to wait for user to complete input.
    var timer;

    var list = function() {
        return $http.get(Configuration.api_prefix+"/");
    }

    var getTypeProperties = function(assetType) {
        return $http.get(Configuration.api_prefix + "/" + assetType + "/properties")
    }

    var searchForAssetOfType= function(assetType, data) {
        var dfd = $q.defer();

        if (timer) clearTimeout(timer);
        
        timer = setTimeout(function(){

            $http({
                method:'GET',
                url: Configuration.api_prefix + "/" + assetType,
                params: data
            }).success(function(rslt) { 
                dfd.resolve(rslt); 
            }).error(function(err) {
                console.log(err); 
                dfd.reject(err);
            });

        }, 500);

        return dfd.promise;
    }

    return {
        list: list,
        search: searchForAssetOfType,
        getTypeProperties: getTypeProperties
    }
}])
.controller('assetTypeController', [
    '$routeParams', '$scope', 'AssetTypeService',
    function($routeParams, $scope, AssetTypeService) {
        /*
         *
         * Asset management for a given type. Asset listing.
         *
         */

        $scope.assetType = $routeParams.asset_type;
       
        $scope.typeProperties = [];

        $scope.assetSearch = "";
        $scope.searchResults = [];
        $scope.searchLoading = false;
        $scope.searchResultLimit = 250;

        $scope.sortBy = 'id';
        $scope.reverseSort = false;

        $scope.queryLimit = 1000;

        var setTypeProperties = function(aType) {
            AssetTypeService.getTypeProperties(aType)
            .success(function(rslt) {
                $scope.typeProperties = rslt;
            }).error(function(err) {
                console.error(err);
            })
        }

        $scope.setSearchLimit = function(limit) {
            $scope.searchResultLimit = limit;
        }

        $scope.searchForAsset = function() {
            
            if ( $scope.assetSearch == "" ) {
                $scope.searchResults = [];
                $scope.searchLoading = false;
                return;
            }

            var q = {id: $scope.assetSearch};
            if ($scope.queryLimit != 'None') {
                q.size = $scope.queryLimit;
            }

            $scope.searchLoading = true;

            AssetTypeService.search($routeParams.asset_type, q)
            .then(function(rslt){
                if (rslt.length > 0) {
                    $scope.searchResults = rslt;
                } else {
                    $scope.searchResults = [];
                }
                $scope.searchLoading = false;
            });
        }

        $scope.setQueryLimit = function(limit) {
            $scope.queryLimit = limit;
            $scope.searchForAsset();
        }

        var init = function() {
            $scope.assetSearch = ".*";
            $scope.searchForAsset();
            setTypeProperties($routeParams.asset_type);
        }

        init();
    }
])
.directive('assetTypeList', ['$routeParams', 'AssetTypeService', function($routeParams, AssetTypeService) {
    return {
        restrict: 'A',
        scope: {},
        templateUrl: 'app/assettype/asset-type-list.html',        
        link: function(scope, elem, attr) {
            
            scope.assetTypes = [];
            scope.activeAssetType = $routeParams.asset_type;
            scope.assetTypeFilter = "";
            scope.isRefreshing = false;

            scope.refreshAssetTypeList = function() {
                scope.isRefreshing = true;
                AssetTypeService.list().success(function(rslt) {
                    scope.assetTypes = rslt;
                    scope.isRefreshing = false;
                }).error(function(err){
                    console.log(err);
                    scope.isRefreshing = false;
                });
            }

            scope.refreshAssetTypeList();

            //console.log(scope.activeAssetType);
            scope.$on('$routeChangeSuccess', function(evt, nxt, curr) {
                scope.activeAssetType = $routeParams.asset_type;
            });
        }
    }
}]);
