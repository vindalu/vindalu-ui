'use strict';

angular.module('system.status',[])
.factory('ESSClusterHealth', ['$http', 'Configuration', function($http, Configuration) {

    var getHealth = function() {
        return $http.get(Configuration.raw_endpoint + '/_cluster/health');
    }

    var getState = function() {
        return $http.get(Configuration.raw_endpoint + '/_cluster/state');   
    }

    return {
        getHealth: getHealth,
        getState: getState
    };
}])
.directive('clusterHealth', [function() {
    return {
        restrict: 'A',
        scope: {
            cluster: '='
        },
        templateUrl: 'app/status/cluster-health.html',
        link: function(scope, elem, attrs) {

            function init() {}

            init();
        }
    }
}])
.controller('statusController', ['$scope', 'ESSClusterHealth', 'Configuration',
    function($scope, ESSClusterHealth, Configuration) {
        // health
        // state
        // nodes : our assembled set
        //
        $scope.cluster = {};

        var getNodeAddrs = function() {
            // Get address of nodes from ess cluster health call
            var nodeNames = [];
            for(var k in $scope.cluster.nodes) {
                nodeNames.push(k);
            }
            return nodeNames;
        }

        var getNodeConfig = function(nodename) {
            $.ajax({
                url:'http://'+nodename+'/config',
                method: 'GET'
            }).always(function(obj, status, xhr) {
                $scope.$apply(function() {
                    if (status == 'error') {
                        $scope.cluster.nodes[nodename] = {};
                        return;
                    }
                    try {
                        if (obj.version && obj.version !== null)  {
                            $scope.cluster.nodes[nodename] = obj;
                        } else {
                            $scope.cluster.nodes[nodename] = {};
                        }
                    } catch(e) {
                        $scope.cluster.nodes[nodename] = {};
                    }
                });
            });
        }

        var getNodeMap = function() {
            var nodes = {};
            for(var k in $scope.cluster.state.nodes) {
                var addr = $scope.cluster.state.nodes[k].transport_address.split("/")[1].split(":")[0];
                nodes[addr] = $scope.cluster.state.nodes[k];
                $scope.cluster.state.nodes[k].ip_addr = addr;
            }
            return nodes;
        }

        var assignConfigs = function(cfgs) {
            console.log($scope.cluster.nodes);
            for (var k in cfgs) {
                if ($scope.cluster.nodes[k]) 
                    $scope.cluster.nodes[k].config = cfgs[k];
                else
                    console.log('Node not found in cluster nodes:', k);
            }
        }

        var getClusterState = function() {
            // Get cluster state
            ESSClusterHealth.getState()
            .success(function(rslt) {
                
                $scope.cluster.state = rslt;
                $scope.cluster.nodes = getNodeMap();

                // Get cluster member configs
                var nodeNames = getNodeAddrs();
                if (nodeNames.length > 1) {
                    for(var j=0; j<nodeNames.length; j++) {
                        getNodeConfig(nodeNames[j]);
                    }
                } else {
                    for (var k in $scope.cluster.nodes) {
                        $scope.cluster.nodes[k] = Configuration;
                        break;
                    }
                }
            }).error(function(err) {
                console.log(err);
            });
        }

        var init = function() {
            // Get cluster health
            ESSClusterHealth.getHealth()
            .success(function(rslt) {
                $scope.cluster.health = rslt;
            }).error(function(err) {
                console.log(err);
            });
            
            getClusterState();
        }

        init();
    }
])
.filter('transportIp', function() {
    return function(transport_address) {
        return transport_address.split("/")[1].replace(/]$/, "");
    }
});