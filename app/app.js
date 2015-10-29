
var app = angular.module('app', [
	'ngRoute',
    'ngResource',
    'login',
    'app.root',
    'asset',
    'asset.type',
    'system.status'
]);

(function() {
	// Bootstrap the app with the config fetched via http //
	var configConstant = "Configuration";
	var configUrl      = "/config";

    function fetchAndInjectConfig() {
        var initInjector = angular.injector(["ng"]);
        var $http = initInjector.get("$http");

        return $http.get(configUrl).then(function(response) {
            app.constant(configConstant, response.data);
        }, function(errorResponse) {
            // Handle error case
            console.log(errorResponse);
        });
    }

    function bootstrapApplication() {
        angular.element(document).ready(function() {
            angular.bootstrap(document, ["app"]);
        });
    }

    fetchAndInjectConfig().then(bootstrapApplication);
    
}());

app.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.when('/login', {
			templateUrl: 'app/login/login.html',
			controller: 'loginController'
		}).when('/status', {
            templateUrl: 'app/status/status.html',
            controller: 'statusController'
        }).when('/:asset_type', {
            templateUrl: 'app/assettype/asset-type.html',
            controller: 'assetTypeController'
        }).when('/:asset_type/:asset', {
            templateUrl: 'app/asset/asset.html',
            controller: 'assetController'
        }).when('/:asset_type/:asset/versions', {
            templateUrl: 'app/asset/asset-versions.html',
            controller: 'assetVersionsController'
        }).when('/:asset_type/:asset/:version', {
            templateUrl: 'app/asset/asset.html',
            controller: 'assetController'
        }).when('/', {
            templateUrl: 'app/root/root.html',
            controller: 'rootController'
        }).otherwise({
			redirectTo: '/'
		});
	}
]);

app.filter('objectLength', function() {
	return function(obj) {
    	return Object.keys(obj).length;
	};
})
.filter('toHumanBytes', function() {
    return function(fileSize) {
        var kb  = fileSize/1024;
        if(kb < 1024) {
            return kb.toFixed(2).toString() +" KB";
        }

        var mb = kb/1024;
        if(mb < 1024) {
            return mb.toFixed(2).toString() +" MB";
        }

        var gb = mb/1024;
        if(gb < 1024) {
            return gb.toFixed(2).toString() +" GB";
        }

        return (gb/1024).toFixed(2).toString()+" TB";
    }
})
.directive('enterSubmit', [function() {
    return {
        restrict: 'A',
        scope: {
            action: '&'
        },
        link: function (scope, elem, attr) {
            $(elem[0]).keypress(function(e) {
                if ( e.which == 13) scope.action();
            });
        }
    };
}])
.directive('barChart', [function() {
    return {
        restrict: 'A',
        scope: {
            dataset: '=',
            colorPatterns: '=',
            chartTitle: '='
        },
        link: function(scope, elem, attr, ctrl) {

            var formatToBarC3 = function(title, data) {
                var arr = [title],
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

            var makeBarChart = function(title, chartData) {
                var bdata = formatToBarC3(title, chartData);
                //console.log(bdata.data);

                var chartOpts = {
                    bindto: elem[0],
                    data: {
                        columns: [ bdata.data ] ,
                        type : 'bar',
                        colors: {}
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
                };

                // Set bar color
                chartOpts.data.colors[title] = '#F6B71C';
                //var barChart = c3.generate(chartOpts);
                c3.generate(chartOpts);
            }

            var init = function() {
                scope.$watch(function() {return scope.dataset;}, function(val) {
                    //console.log('>', scope.dataset, scope.chartTitle, scope.colorPatterns);
                    if (!val || val.length < 1) return;
                    makeBarChart(scope.chartTitle, val);
                });
            }

            init();
        }
    }
}])
.controller('defaultController', [
    '$rootScope', '$location', '$scope', 'Configuration', 'CredCache', 'Authenticator', '$timeout',
    function($rootScope, $location, $scope, Configuration, CredCache, Authenticator, $timeout) {
        /* This is the top level controller (all encompassing) */

        var _timer, alertDisplayTime = 3750;

        $scope.userNotificationData = {};
        // Backend version
        $scope.vindaluVersion = Configuration.version
        // Where to redirect back to after login
        $scope.currUrlPath = "/";
        // Global session object
        $scope.session = CredCache.getCreds();

        $scope.logout = function() {
            Authenticator.logout();
        }

        $scope.$on('$routeChangeSuccess', function(e) {
            $scope.currUrlPath = $location.url();
        });

        $scope.showUserNotification = function(data) {
            if (_timer) $timeout.cancel(_timer);

            $scope.userNotificationData = data;

            $timeout(function() {
                $scope.userNotificationData = {};
            }, alertDisplayTime);
        } 

        $scope.showNotification = function() {
            return Object.keys($scope.userNotificationData).length > 0;
        }
        
        $rootScope.$on('user.authenticated', function(e) {
            $scope.session = CredCache.getCreds();
        });

        $rootScope.$on('user.unauthenticated', function(e) {
            // Manually null as it's cheaper.
            $scope.session = null;    
        });

    }
]);

function isResourceIdValid(id) {
    return (id.search(/[&%;\,\s,\/]/g) < 0)
}

var DEFAULT_CHART_COLOR_PATTERNS = [
    '#aec7e8', '#ff7f0e', '#ffbb78', 
    '#2ca02c', '#98df8a', '#d62728', '#ff9896', 
    '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', 
    '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', 
    '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
];



/* Auto resize text area.  This is just the jquery elastic plugin.  Its copied here for performance reasons. */
(function($){ 
    jQuery.fn.extend({  
        elastic: function() {
        
            //  We will create a div clone of the textarea
            //  by copying these attributes from the textarea to the div.
            var mimics = [
                'paddingTop',
                'paddingRight',
                'paddingBottom',
                'paddingLeft',
                'fontSize',
                'lineHeight',
                'fontFamily',
                'width',
                'fontWeight',
                'border-top-width',
                'border-right-width',
                'border-bottom-width',
                'border-left-width',
                'borderTopStyle',
                'borderTopColor',
                'borderRightStyle',
                'borderRightColor',
                'borderBottomStyle',
                'borderBottomColor',
                'borderLeftStyle',
                'borderLeftColor'
                ];
            
            return this.each( function() {

                // Elastic only works on textareas
                if ( this.type !== 'textarea' ) {
                    return false;
                }
                    
            var $textarea   = jQuery(this),
                $twin       = jQuery('<div />').css({
                    'position'      : 'absolute',
                    'display'       : 'none',
                    'word-wrap'     : 'break-word',
                    'white-space'   :'pre-wrap'
                }),
                lineHeight  = parseInt($textarea.css('line-height'),10) || parseInt($textarea.css('font-size'),'10'),
                minheight   = parseInt($textarea.css('height'),10) || lineHeight*3,
                maxheight   = parseInt($textarea.css('max-height'),10) || Number.MAX_VALUE,
                goalheight  = 0;
                
                // Opera returns max-height of -1 if not set
                if (maxheight < 0) { maxheight = Number.MAX_VALUE; }
                    
                // Append the twin to the DOM
                // We are going to meassure the height of this, not the textarea.
                $twin.appendTo($textarea.parent());
                
                // Copy the essential styles (mimics) from the textarea to the twin
                var i = mimics.length;
                while(i--){
                    $twin.css(mimics[i].toString(),$textarea.css(mimics[i].toString()));
                }
                
                // Updates the width of the twin. (solution for textareas with widths in percent)
                function setTwinWidth(){
                    var curatedWidth = Math.floor(parseInt($textarea.width(),10));
                    if($twin.width() !== curatedWidth){
                        $twin.css({'width': curatedWidth + 'px'});
                        
                        // Update height of textarea
                        update(true);
                    }
                }
                
                // Sets a given height and overflow state on the textarea
                function setHeightAndOverflow(height, overflow){
                
                    var curratedHeight = Math.floor(parseInt(height,10));
                    if($textarea.height() !== curratedHeight){
                        $textarea.css({'height': curratedHeight + 'px','overflow':overflow});
                    }
                }
                
                // This function will update the height of the textarea if necessary 
                function update(forced) {
                    
                    // Get curated content from the textarea.
                    var textareaContent = $textarea.val().replace(/&/g,'&amp;').replace(/ {2}/g, '&nbsp;').replace(/<|>/g, '&gt;').replace(/\n/g, '<br />');
                    
                    // Compare curated content with curated twin.
                    var twinContent = $twin.html().replace(/<br>/ig,'<br />');
                    
                    if(forced || textareaContent+'&nbsp;' !== twinContent){
                    
                        // Add an extra white space so new rows are added when you are at the end of a row.
                        $twin.html(textareaContent+'&nbsp;');
                        
                        // Change textarea height if twin plus the height of one line differs more than 3 pixel from textarea height
                        if(Math.abs($twin.height() + lineHeight - $textarea.height()) > 3){
                            
                            var goalheight = $twin.height()+lineHeight;
                            if(goalheight >= maxheight) {
                                setHeightAndOverflow(maxheight,'auto');
                            } else if(goalheight <= minheight) {
                                setHeightAndOverflow(minheight,'hidden');
                            } else {
                                setHeightAndOverflow(goalheight,'hidden');
                            }
                            
                        }
                        
                    }
                    
                }
                
                // Hide scrollbars
                $textarea.css({'overflow':'hidden'});
                
                // Update textarea size on keyup, change, cut and paste
                $textarea.bind('keyup change cut paste', function(){
                    update(); 
                });
                
                // Update width of twin if browser or textarea is resized (solution for textareas with widths in percent)
                jQuery(window).bind('resize', setTwinWidth);
                $textarea.bind('resize', setTwinWidth);
                $textarea.bind('update', update);
                
                // Compact textarea on blur
                $textarea.bind('blur',function(){
                    if($twin.height() < maxheight){
                        if($twin.height() > minheight) {
                            $textarea.height($twin.height());
                        } else {
                            $textarea.height(minheight);
                        }
                    }
                });
                
                // And this line is to catch the browser paste event
                $textarea.bind('input paste',function(e){ setTimeout( update, 250); });             
                
                // Run update once when elastic is initialized
                update();
                
            });
            
        } 
    }); 
})(jQuery);