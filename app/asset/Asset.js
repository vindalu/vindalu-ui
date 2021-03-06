angular.module('asset', [])
.factory('AssetService', [
    '$http', 'Configuration', 'Authenticator',
    function($http, Configuration, Authenticator){

        var getAssetDetails = function(assetType, assetId, version) {
            if (version) {
                return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId + '?version=' + version.toString());    
            } else {
                return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId);    
            }
        }

        var getAssetVersions = function(assetType, assetId) {
            return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId + '/versions')
        }

        var getAssetVersionDiffs = function(assetType, assetId) {
            return $http.get(Configuration.api_prefix + "/" + assetType + '/' + assetId + '/versions?diff')
        }

        var createResource = function(vRsrc) {
            return $http({
                url: Configuration.api_prefix + "/" + vRsrc.type + '/' + vRsrc.id,
                method: 'POST',
                headers: Authenticator.getAuthHeader(),
                data: angular.toJson(vRsrc.data)
            });
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

        // Empty resource for UI
        var newResource = function(rsrcType) {
            // Add required fields
            var d = {}, i = 0;
            for(; i< Configuration.asset.required_fields.length; i++) {
                d[Configuration.asset.required_fields[i]] = null;
            }

            // Default enforced fields to first value.
            for(i in Configuration.asset.enforced_fields) {
                if (i in d) {
                    d[i] = Configuration.asset.enforced_fields[i][0];
                }
            }

            return {
                "id" : "new",
                "type": rsrcType,
                "data": d
            }
        }

        return {
            get                : getAssetDetails,
            getVersions        : getAssetVersions,
            getDiffs           : getAssetVersionDiffs,
            updateAssetDetails : updateAssetDetails,
            deleteAsset        : deleteAsset,
            newResource        : newResource,
            createResource     : createResource
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
                        return val;
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
.directive('resourceIdInput', [function() {
    return {
        restrict: 'A',
        require: '?ngModel',
        link: function (scope, elem, attr, ctrl) {
            if (!ctrl) return;

            ctrl.$parsers.unshift(function(val) {

                if (isResourceIdValid(val)) {
                    ctrl.$setValidity('resourceIdInput', true);
                } else {
                    ctrl.$setValidity('resourceIdInput', false);
                }

                return val;
            });
        }
    }
}])
.directive('versionTimeseriesChart', [function() {
    return {
        restrict: 'A',
        require: '?ngModel',
        link: function (scope, elem, attr, ctrl) {
            if (!ctrl) return;

            var makeChart = function(data)  {
                var chart = c3.generate({
                    bindto: elem[0],
                    data: {
                        x: 'x',
                        columns: data,
                        colors: { Versions: '#F6B71C' }
                    },
                    axis: {
                        x: {
                            type: 'timeseries',
                            tick: { format: '%m-%d %H:%M:%S', count: 6 }
                        },
                        y: { show: false }
                    },
                    tooltip: {
                        format: {
                            name: function(name, ratio, id, index) { return 'Version'; },
                            value: function (value, ratio, id, index) { 
                                return ctrl.$modelValue[(ctrl.$modelValue.length-index)-1].version; 
                            }
                        }
                    },
                    legend: { show: false }
                });
            }

            var extractData = function(d) {
                var xs = [], ys= ["Versions"];
                for(var i=0; i< d.length;i++) {
                    // Reverse version data to graph correctly.
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

        $scope.newResourceId = "";
        $scope.autoAssignName = true; // when creating new resources to auto assign name field to id.

        $scope.fieldsToDelete = [];

        var getResource = function(ver) {
            AssetService.get($routeParams.asset_type, $routeParams.asset, ver)
            .success(function(rslt) {
                // Parse version from version id
                if (ver) {
                    var parts = rslt.id.split('.');
                    parts.splice(parts.length-1,1);
                    rslt.id = parts.join('.');
                }

                $scope.asset = rslt;
                _originalAsset = angular.copy(rslt);

            }).error(function(err) {
            
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Get failed: ' + err
                });
            
            });
        }

        var _updateAsset = function() {
             AssetService.updateAssetDetails($scope.asset.type, $scope.asset.id, $scope.asset.data, $scope.fieldsToDelete)
            .success(function(rslt) {
      
                $scope.showUserNotification({
                    status: 'success',
                    data: rslt.id+ ' updated!'
                });
                getResource();

            }).error(function(e) {
                // TODO: check token expiration
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Update failed: ' + e
                });
                getResource();
            });
        }

        var _createAsset = function() {
            // IN Prog
            for(var i=0;i< $scope.fieldsToDelete.length; i++) {
                delete $scope.asset.data[$scope.fieldsToDelete[i]];
            }

             AssetService.createResource($scope.asset)
            .success(function(rslt) {
                
                $scope.showUserNotification({
                    status: 'success',
                    data: rslt.id+ ' created!'
                });
                $location.url('/'+$scope.asset.type+'/'+$scope.asset.id);

            }).error(function(e) {
                // TODO: check token expiration
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Failed to create - ' + $scope.asset.id + ': ' + e
                });
            });
        }

        $scope.canEditResource = function() {
            return ($scope.session != null) && !('version' in $routeParams);
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

        $scope.upsertAsset = function() {
            if ( angular.equals(_originalAsset, $scope.asset) && $scope.fieldsToDelete.length < 1) {
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'No changes to save!'
                });
            } else {
                if ($scope.newResourceId.length == 0) {
                   _updateAsset();
                } else {
                   _createAsset();
                }
            }
        }

        $scope.deleteAsset = function() {
            AssetService.deleteAsset($scope.asset.type, $scope.asset.id)
            .success(function(rslt) {
                $('#delete-asset-modal').modal('hide');
                $timeout(function () { $location.url("/"+$scope.asset.type); }, 1000);
            }).error(function(err) {
                // TODO: check token expiration
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'Delete failed: ' + err
                });
            });
        }

        $scope.setNewResourceId = function() {

            if (isResourceIdValid($scope.newResourceId)) {
                // Do more checking.
                //console.log($scope.newResourceId);
                $scope.asset.id = $scope.newResourceId;
                if ($scope.autoAssignName) {
                    $scope.asset.data.name = $scope.asset.id;
                }
                

                $('#new-rsrc-id-modal').modal('hide');
            }
        }

        var init = function() {
            if ($routeParams.asset == "new") {
                // new resource
                _originalAsset = {};
                $scope.asset = AssetService.newResource($routeParams.asset_type);

                $timeout(function() { 
                    var mdl = $('#new-rsrc-id-modal').modal({keyboard:false, backdrop:'static'});
                    mdl.modal('show');
                }, 500);

            } else {
                getResource($routeParams.version);
            }
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

        var init = function() {
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

        init();
    }
]);