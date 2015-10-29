'use strict';

angular.module('app.root', [])
.directive('donutChart', [function() {
    return {
        restrict: 'A',
        link: function(scope, elem, attr) {
            /*
             * Allow automatic rendering when `currDataset` changes.
             *
             */
            var formatToDonutC3 = function(list) {
                var fBuckets = new Array(list.length);
                for (var i =0; i < list.length; i++) {
                    fBuckets[i] = [ list[i].name, list[i].count ];
                }
                return fBuckets
            }

            var makeDonutChart = function(chartData) {
                var list = formatToDonutC3(chartData);
                var donutChart = c3.generate({
                    bindto: elem[0],
                    data: {
                        columns: list,
                        type : 'donut'
                    },
                    donut: {
                        title: "Distribution"
                    },
                    color: { pattern: scope.colorPatterns }
                });
            }

            var init = function() {
                scope.$watch(function() {return scope.currDataset;}, function(val) {
                    if (val.length < 1) return;
                    makeDonutChart(val);
                });
            }

            init();
        }
    }
}])
.controller('rootController', ['$scope', 'AssetTypeService',
    function($scope, AssetTypeService) {
        
        $scope.currDataset = [];
        
        $scope.colorPatterns = DEFAULT_CHART_COLOR_PATTERNS;

        var refreshAssetTypeList = function() {

            AssetTypeService.list().success(function(rslt) {
                
                if (rslt.length > 0) $scope.currDataset = rslt;
                else console.warn("No data!");
            
            }).error(function(err) { console.log(err); });
        }

        var init = function() {
            refreshAssetTypeList()
        }

        init();
    }
]);