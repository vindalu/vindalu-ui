angular.module('asset', [])
.factory('AssetService', [
    '$http', 'Configuration', 'Authenticator',
    function($http, Configuration, Authenticator){

        var getAssetDetails = function(assetType, assetId) {
            return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId);
        }

        var getAssetVersions = function(assetType, assetId) {
            return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId + '/versions')
        }

        var getAssetVersionDiffs = function(assetType, assetId) {
            return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId + '/versions?diff')
        }

        var updateAssetDetails = function(assetType, assetId, assetData, deleteFields) {
            var delParams = "delete_fields="+deleteFields.join(",");

            return $http({
                url: Configuration.api_prefix + "/" + assetType + '/' + assetId + '?' + delParams,
                method: 'PUT',
                headers: Authenticator.getAuthHeader(),
                data: angular.toJson(assetData)
            });
        }

        var deleteAsset = function(assetType, assetId) {
            return $http({
                url: Configuration.api_prefix + "/" + assetType + '/' + assetId,
                method: 'DELETE',
                headers: Authenticator.getAuthHeader()
            });   
        }

        return {
            get                : getAssetDetails,
            getVersions        : getAssetVersions,
            getDiffs           : getAssetVersionDiffs,
            updateAssetDetails : updateAssetDetails,
            deleteAsset        : deleteAsset,
        }
    }
])
.directive('dynamicInput', [function() {
    return {
        restrict: 'A',
        require: '?ngModel',
        link: function(scope, elem, attrs, ctrl) {
            if (!ctrl) return;

            ctrl.$formatters.push(function(val) {
                if (val === null ) return null;

                var valType = typeof val;
                switch(valType) {
                    case "object":
                        try {
                            var v = angular.toJson(val, true);
                            ctrl.$setValidity('dynamicInput', true);
                            return v;
                        } catch(e) {
                            ctrl.$setValidity('dynamicInput', false);
                            return val;
                        }
                    default:
                        ctrl.$setValidity('dynamicInput', true);
                        return val;
                }
            });

            ctrl.$parsers.unshift(function(val) {
                var valType = typeof ctrl.$modelValue;
                switch(valType) {
                    case "object":
                        try {
                            var v = angular.fromJson(val);
                            ctrl.$setValidity('dynamicInput', true);
                            return v;
                        } catch(e) {
                            ctrl.$setValidity('dynamicInput', false);
                            return ctrl.$modelValue;
                        }
                    default:
                        ctrl.$setValidity('dynamicInput', true);
                        return ctrl.$modelValue;
                        break;
                }
            });
            
            scope.$watch(function(){return ctrl.$modelValue;}, function(n,o) {
                if (n == null && n == o) return;
                $(elem).elastic();
            });
        }
    };
}])
.directive('versionTimeseriesChart', [function() {
    return {
        restrict: 'A',
        require: '?ngModel',
        link: function (scope, elem, attr, ctrl) {
            if (!ctrl) return;


            var makeChart = function(data)  {
                console.log(ctrl.$modelValue);
                var chart = c3.generate({
                    bindto: elem[0],
                    data: {
                        x: 'x',
                        columns: data,
                        colors: {
                            Versions: '#F6B71C'
                        }
                    },
                    axis: {
                        x: {
                            type: 'timeseries',
                            tick: {
                                format: '%m-%d %H:%M:%S',
                                count: 6
                            }
                        },
                        y: {
                            show: false
                        }
                    },
                    tooltip: {
                        format: {
                            name: function(name, ratio, id, index) { return 'Version'; },
                            value: function (value, ratio, id, index) { return ctrl.$modelValue[(ctrl.$modelValue.length-index)-1].version; }
                        }
                    }
                });

            }

            var extractData = function(d) {
                var xs = [], ys= ["Versions"];
                for(var i=0; i< d.length;i++) {
                    // reverse version data
                    xs.unshift(new Date(d[i].timestamp));
                    ys.push(1);
                }
                xs.unshift("x");
                return [xs, ys];
            }

            scope.$watch(function(){return ctrl.$modelValue;}, function(n,o) {
                makeChart(extractData(n));
            });

        }
    };
}])
.controller('assetController', [
    '$scope', '$location', '$routeParams', 'AssetService', 'Configuration', '$timeout',
    function($scope, $location, $routeParams, AssetService, Configuration, $timeout) {

        var _originalAsset;

        $scope.enforcedFields = Configuration.asset.enforced_fields;
        
        $scope.asset = {};

        $scope.newFieldName = "";
        $scope.newFieldType = "String";

        $scope.fieldsToDelete = [];

        var getResource = function() {
            AssetService.get($routeParams.asset_type, $routeParams.asset)
            .success(function(rslt) {
            
                $scope.asset = rslt;
                _originalAsset = angular.copy(rslt);
            
            }).error(function(err) {
            
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Get failed: ' + err
                });
            
            });
        }

        $scope.addNewField = function() {
            switch($scope.newFieldType) {
                case "Number":
                    $scope.asset.data[$scope.newFieldName] = 0;
                    break;
                case "Object":
                    $scope.asset.data[$scope.newFieldName] = {};
                    break;
                case "String":
                    $scope.asset.data[$scope.newFieldName] = "";
                    break;
            }
            
        
            $scope.newFieldName = "";
            $('#add-field-modal').modal('hide');
        }

        $scope.isFieldDeletable = function(field) {
            return ($scope.enforcedFields[field]==undefined) && 
                (field != "updated_by") && (field != "created_by") && (field != "created_on");
        }

        $scope.isFieldValueObject = function(val) {
            return typeof val === "object";
        }

        $scope.deleteField = function(name) {
            $scope.fieldsToDelete.push(name);
        }

        $scope.undeleteField = function(name) {
            var idx = $scope.fieldsToDelete.indexOf(name);
            if (idx >= 0) $scope.fieldsToDelete.splice(idx, 1);
        }

        $scope.fieldSetToDelete = function(f) {
            for (var i=0; i<$scope.fieldsToDelete.length; i++) {
                if (f == $scope.fieldsToDelete[i]) return true;
            }
            return false;
        }

        $scope.updateAsset = function() {
            if ( angular.equals(_originalAsset, $scope.asset) && $scope.fieldsToDelete.length < 1) {
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'No changes to save!'
                });
            } else {
                AssetService.updateAssetDetails($scope.asset.type, $scope.asset.id, $scope.asset.data, $scope.fieldsToDelete)
                .success(function(rslt) {
          
                    $scope.showUserNotification({
                        status: 'success',
                        data: rslt.id+ ' updated!'
                    });

                    getResource();

                }).error(function(e) {
                    $scope.showUserNotification({
                        status: 'danger',
                        data: 'Update failed: ' + e
                    });
                    getResource();
                });
            }
        }

        $scope.deleteAsset = function() {
            AssetService.deleteAsset($scope.asset.type, $scope.asset.id)
            .success(function(rslt) {
                $('#delete-asset-modal').modal('hide');
                $timeout(function () { $location.url("/"+$scope.asset.type); }, 1000);
            }).error(function(err) {
                
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Delete failed: ' + err
                });
            });
        }

        var init = function() {
        
            getResource();

            //$timeout(function() { $("[data-toggle='tooltip']").tooltip(); }, 1000);
        }
        init();
    }
])
.controller('assetVersionsController', ['$scope', '$routeParams', 'AssetService', 
    function($scope, $routeParams, AssetService) {

        $scope.versions = [];
        $scope.asset = {
            type: $routeParams.asset_type,
            id: $routeParams.asset
        };

        AssetService.getDiffs($routeParams.asset_type, $routeParams.asset)
        .success(function(rslt) {
            $scope.versions = rslt;
            console.log('Versions:', $scope.versions.length);
        }).error(function(err) {
            
            $scope.showUserNotification({
                status: 'danger',
                data: 'Get failed: ' + err
            });

        });
    }
]);