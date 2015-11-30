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

    var aggregate = function(rsrcType, field) {
        return $http.get(Configuration.api_prefix+'/'+rsrcType+'?aggregate='+field);
    }

    return {
        list: list,
        search: searchForAssetOfType,
        getTypeProperties: getTypeProperties,
        aggregate: aggregate
    }
}])
.controller('assetTypeController', [
    '$routeParams', '$scope', 'AssetTypeService', 'Configuration',
    function($routeParams, $scope, AssetTypeService, Configuration) {
        /*
         *
         * Asset management for a given type. Asset listing.
         *
         */

        $scope.assetType = $routeParams.asset_type;
       
        $scope.typeProperties = [];

        $scope.assetSearch = ".*";
        $scope.searchResults = [];
        $scope.searchLoading = false;
        $scope.searchResultLimit = 250;
        $scope.searchAttribute = "name";

        $scope.sortBy = "id";
        $scope.reverseSort = false;
        
        $scope.nameAsInt = false;
        // Fields to show in table view
        $scope.showFields = ["updated_by", "created_on"].concat(Configuration.asset.required_fields);


        $scope.queryLimit = 1000;

        var typeHasProperty = function(prop) {
            for(var i=0; i < $scope.typeProperties.length; i++) {
                if (prop == $scope.typeProperties[i]) return true;
            }
            return false;
        }

        var setDefaultSearchAttribute = function() {
            if (!typeHasProperty("name")) {
                if (!typeHasProperty("Name")) {
                    $scope.searchAttribute = "id";
                } else {
                    $scope.searchAttribute = "Name";
                    $scope.showFields = ["Name"].concat($scope.showFields);
                }
            } else {
                $scope.showFields = ["name"].concat($scope.showFields);
            }
        }

        /* 
            Fetch type properties and set default search property. Perform a search 
            after setting defaults
        */
        var initTypeProperties = function(aType) {
            AssetTypeService.getTypeProperties(aType)
            .success(function(rslt) {
                $scope.typeProperties = rslt;
                setDefaultSearchAttribute();
                $scope.searchForAsset();
            }).error(function(err) {
                console.error(err);
            })
        }

        $scope.togglePropertyVisibility = function(prop) {
            if (prop == "id" || prop == "updated_by" || prop == "timestamp") return;

            var idx = $scope.showFields.indexOf(prop);
            if (idx < 0 ) {
                $scope.showFields.push(prop);
            } else {
                $scope.showFields.splice(idx, 1);
            }
        }

        $scope.isPropertyVisible = function(prop) {
            if (prop == "id" || prop == "updated_by" ||prop == "timestamp") return true;
            
            return ($scope.showFields.indexOf(prop) >= 0);
        }

        $scope.setSearchLimit = function(limit) {
            $scope.searchResultLimit = limit;
        }

        $scope.sortTableColumn = function(field) {
            if ($scope.sortBy == field) {
                $scope.reverseSort = !$scope.reverseSort;    
            } else {
                $scope.sortBy = field;
                $scope.reverseSort = false;
            }
        }

        $scope.searchForAsset = function(optionalProp) {
            $scope.searchAttribute = optionalProp ? optionalProp : $scope.searchAttribute;

            if ( $scope.assetSearch == "" ) {
                $scope.searchResults = [];
                $scope.searchLoading = false;
                return;
            }

            var q = {};
            q[$scope.searchAttribute] = $scope.assetSearch;
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
            initTypeProperties($routeParams.asset_type);
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
}])
.directive('aggrFieldChart', ['$routeParams', 'AssetTypeService', function($routeParams, AssetTypeService) {
    return {
        restrict: 'A',     
        link: function(scope, elem, attr) {

            scope.selectedProperty = "updated_by";
            scope.typeProps = [];

            scope.aggrDataset = [];
            scope.aggrColorPatterns = DEFAULT_CHART_COLOR_PATTERNS;

            scope.showChart = false;

            // Collapsible chart
            var cpsChart = $(elem[0]).collapse({toggle:false});

            var getAggregate = function() {
                AssetTypeService.aggregate($routeParams.asset_type, scope.selectedProperty)
                .success(function(rslt) {
                   scope.aggrDataset = rslt;
                   //console.log(scope.aggrDataset);
                }).error(function(err) {
                    console.error(err);
                });
            }

            AssetTypeService.getTypeProperties($routeParams.asset_type)
            .success(function(rslt){
                scope.typeProps = rslt;
                //console.log(scope.typeProps);
            }).error(function(err) {
                console.log(err)
            });

            scope.$watch(function() {return scope.selectedProperty;}, function(n, o) {
                if (n) getAggregate();
            });

            scope.$watch(function() {return scope.showChart;}, function(n, o) {
                if (n) {
                    cpsChart.collapse('show');
                    //todo: re-render
                } else {
                    cpsChart.collapse('hide');
                }
            });
        }
    }
}]);
