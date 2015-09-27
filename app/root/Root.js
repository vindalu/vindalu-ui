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
.directive('barChart', [function() {
    return {
        restrict: 'A',
        link: function(scope, elem, attr) {
            /*
             * Allow automatic rendering when `currDataset` changes.
             *
             */
            var formatToBarC3 = function(data) {
                var arr = ['Types'],
                    cats = [];
                
                for (var i =0; i < data.length; i++) {
                    arr.push(data[i].count)
                    cats.push(data[i].name)
                }
                
                return {
                    categories: cats,
                    data: arr
                }
            }

            var makeBarChart = function(chartData) {
                var bdata = formatToBarC3(chartData);
                //console.log(bdata.data);
                var barChart = c3.generate({
                    bindto: elem[0],
                    data: {
                        columns: [ bdata.data ] ,
                        type : 'bar',
                        colors: {
                            Types: '#F6B71C'
                        }
                    },
                    axis: {
                        x: {
                            type: 'category',
                            categories: bdata.categories,
                            tick: {
                                multiline:false,
                                rotate: 75
                            }
                        }
                    },
                    tooltip: {
                        format: {
                            title: function(x) {return null},
                            name: function(name, ratio, id, index) {
                                return bdata.categories[index];
                            }
                        }
                    },
                    legend: { show: false },
                    color: { pattern: scope.colorPatterns }
                });
            }

            var init = function() {
                scope.$watch(function() {return scope.currDataset;}, function(val) {
                    if (val.length < 1) return;
                    makeBarChart(val);
                });
            }

            init();
        }
    }
}])
.controller('rootController', ['$scope', 'AssetTypeService',
    function($scope, AssetTypeService) {
        
        $scope.currDataset = [];
        
        $scope.colorPatterns = [
            '#aec7e8', '#ff7f0e', '#ffbb78', 
            '#2ca02c', '#98df8a', '#d62728', '#ff9896', 
            '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', 
            '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', 
            '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
        ];

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