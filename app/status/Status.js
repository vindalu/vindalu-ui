'use strict';

angular.module('system.status',[])
.factory('ESSClusterHealth', ['$http', 'Configuration', function($http, Configuration) {

    var getHealth = function() {
        return $http.get(Configuration.raw_endpoint + '/_cluster/health');
    }

    var getState = function() {
        return $http.get(Configuration.raw_endpoint + '/_cluster/state');   
    }

    var getClusterStatus = function() {
        return $http.get('/status');   
    }

    return {
        getHealth: getHealth,
        getState: getState,
        getClusterStatus: getClusterStatus
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
            //console.log($scope.cluster.nodes);
            // Get address of nodes from ess cluster health call
            var nodeAddrs = [];
            for(var k in $scope.cluster.nodes) {
                var ip = getIpFromTransportAddr($scope.cluster.nodes[k].transport_address);
                nodeAddrs.push(ip);
            }
            return nodeAddrs;
        }

        var fetchNodeConfig = function(nodename) {
            $.ajax({
                url:'http://'+nodename+'/config',
                method: 'GET'
            }).always(function(obj, status, xhr) {
                $scope.$apply(function() {
                    if (status == 'error') {
                        //$scope.cluster.nodes[nodename] = {};
                        return;
                    }
                    try {
                        if (obj.version && obj.version !== null)  {
                            for (var k in $scope.cluster.nodes) {
                                if (nodename == getIpFromTransportAddr($scope.cluster.nodes[k].transport_address)) {
                                    $scope.cluster.nodes[k].config = obj;    
                                }
                            }

                        //} else {
                        //    $scope.cluster.nodes[nodename] = {};
                        }
                    } catch(e) {
                        //$scope.cluster.nodes[nodename] = {};
                    }
                });
            });
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

        var getClusterInfo = function() {
            // Get cluster state
            //ESSClusterHealth.getState()
            ESSClusterHealth.getClusterStatus()
            .success(function(rslt) {
                $scope.cluster = rslt;
                // Get cluster member configs
                var nodeAddrs = getNodeAddrs();

                if (nodeAddrs.length > 1) {
                    for (var j=0; j < nodeAddrs.length; j++) {
                        fetchNodeConfig(nodeAddrs[j]);
                    }
                } else {
                    for (var k in $scope.cluster.nodes) {
                        $scope.cluster.nodes[k].config = Configuration;
                        break;
                    }
                }
                //console.log($scope.cluster);
            }).error(function(err) {
                console.log(err);
            });
        }

        var init = function() {
            // Get cluster health
            getClusterInfo();
            
        }

        init();
    }
])
.filter('transportAddress', function() {
    return function(transport_address) {
        if (transport_address)
            return transport_address.split("/")[1].replace(/]$/, "");
        else
            return "";
    }
});

// Helper functions //
// Get ip address from ess transport address
var getIpFromTransportAddr = function(transport_address) {
        return transport_address.split("/")[1].replace(/]$/, "").split(":")[0];
}