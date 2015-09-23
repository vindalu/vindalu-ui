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

        var updateAssetDetails = function(assetType, assetId, assetData) {
            return $http({
                url: Configuration.api_prefix + "/" + assetType + '/' + assetId,
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
.controller('assetController', [
    '$scope', '$location', '$routeParams', 'AssetService', 'Configuration', '$timeout',
    function($scope, $location, $routeParams, AssetService, Configuration, $timeout) {

        var _originalAsset;

        $scope.enforcedFields = Configuration.asset.enforced_fields;
        
        $scope.asset = {};

        $scope.newFieldName = "";
        $scope.newFieldType = "String";


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

        $scope.removeField = function(name) {
            delete $scope.asset.data[name];
        }

        $scope.updateAsset = function() {
            if ( angular.equals(_originalAsset, $scope.asset) ) {
                $scope.showUserNotification({
                    status: 'danger',
                    data: 'No changes to save!'
                });
            } else {
                AssetService.updateAssetDetails($scope.asset.type, $scope.asset.id, $scope.asset.data)
                .success(function(rslt) {
          
                    $scope.showUserNotification({
                        status: 'success',
                        data: rslt.id+ ' updated!'
                    });

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

            $timeout(function() { $("[data-toggle='tooltip']").tooltip(); }, 1000);
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