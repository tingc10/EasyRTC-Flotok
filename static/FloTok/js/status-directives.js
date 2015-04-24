// STATUS DIRECTIVES

angular.module('VirtualOffice')
.directive('statusDock', ["NetworkData", function(NetworkData){
	return {
		restrict: 'E',
		templateUrl: './directives/status-dock.html',
		link: function(scope, element, attrs){
			var keepExpanded;
			scope.onlineStatus = "available";

			scope.toggleStatus = function(){
				if(scope.onlineStatus == "available"){
					scope.onlineStatus = "do not disturb";
				} else {
					scope.onlineStatus = "available";
				}
				scope.$broadcast('toggleDoNotDisturb');
			};
			scope.getInitial = function(displayName){
				var matches = displayName.match(/\b(\w)/g);
	    	var acronym = matches.join('');
	    	return acronym;
			};
			var expandDock = function(expand){
				if(expand){
					TweenMax.set(element,{width:"25vmin"});
					scope.showMeta = true;
				} else {
					TweenMax.set(element,{width:"8vmin"});
					scope.showMeta = false;
				}
			};
			scope.showMeta = false;
			element.bind("mouseenter", function(){
				scope.$apply(function(){
					expandDock(true);
				});
			})
			.bind("mouseleave", function(){
				scope.$apply(function(){	
					expandDock(false);
				});
			
			});
			scope.$on("expandDock", function(e, expand){
				expandDock(expand);
			});
			/****************** ANGULAR WATCH ****************/
			// scope.$watch(function(){
			// 	return NetworkData.peerLength;
			// }, function(newValue, oldValue){
			// 		if(oldValue == 0 && newValue > 0){
			// 			TweenMax.set(element, {width: '8vmin'});
			// 		} else if(oldValue > 0 && newValue == 0){
			// 			TweenMax.set(element, {width: 0});
			// 		}
			// 	}
			// );
		}
	}
	}])
	.directive('usersConnected', function($rootScope, $interval){
	return {
		restrict: 'A',
		scope: {
			peer: "="
		},
		link: function(scope, element, attrs){
			var hoverStart = 0;
			var elapsed = 0;
			var pinned = false;
			var interval = null;
			var determineStatusLabel = function(hover){
				if(hover){
					switch(scope.peer.callStatus){
						case callStatus.NONE:
							scope.peer.callStatusLabel = "START CHAT";
							break;
						case callStatus.CALLTO:
							scope.peer.callStatusLabel = 'END CHAT';
							break;
						case callStatus.CALLFROM:
							scope.peer.callStatusLabel = 'JOIN CHAT';
							break;
						case callStatus.TWOWAY:
							scope.peer.callStatusLabel = 'END CHAT';
							break;
					}
				} else {
					switch(scope.peer.callStatus){
						case callStatus.NONE:
							scope.peer.callStatusLabel = scope.peer.displayName;
							break;
						case callStatus.CALLTO:
							scope.peer.callStatusLabel = 'OUTGOING';
							scope.$emit("expandDock", true);
							break;
						case callStatus.CALLFROM:
							scope.peer.callStatusLabel = 'INCOMING';
							scope.$emit("expandDock", true);
							break;
						case callStatus.TWOWAY:
							scope.peer.callStatusLabel = 'CONNECTED';
							scope.$emit("expandDock", true);
							break;
					}
				}
			};
			scope.$watch(function(){
				return scope.peer.callStatus;
			},function(){
				determineStatusLabel(false);
			});
			element.bind('mouseenter', function(){
				scope.$apply(function(){
					$rootScope.$emit(scope.peer.id+"checkChannel");
					hoverStart = new Date().getTime();
					determineStatusLabel(true);
					elapsed = 0;
					interval = $interval(function(){
						if(!pinned){
							// elapsed should be in miliseconds
							elapsed = (new Date().getTime()) - hoverStart;
							if(elapsed > 1000){
								$rootScope.$broadcast(scope.peer.id+'pinBubble');
								elapsed = 0;
								pinned = true;
								$interval.cancel(interval);
							}
						}
					}, 50);
				});
			})
			.bind('mouseleave', function(){
				scope.$apply(function(){
					determineStatusLabel(false);
					if(pinned){
						setTimeout(function(){
							scope.$apply(function(){
								$rootScope.$broadcast(scope.peer.id+'unpinBubble');
							});
						}, 1500);
					}
					$interval.cancel(interval);
					pinned = false;
					elapsed = 0;
				});
			})
			.bind('click', function(){
				$interval.cancel(interval);
				$rootScope.$broadcast(scope.peer.id+'performCall');
				
			});
		}
	}
	})
	.directive('groupCall',["NetworkData", "$interval", "$rootScope", function(NetworkData, $interval, $rootScope){
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			var hoverStart = 0;
			var elapsed = 0;
			var interval = null;
			var timeup = false;
			scope.shouldShow = true;
			var determineStatusLabel = function(hover){
				if(hover){
					if(NetworkData.transmitAll){
						scope.bullhornMessage = "End All";
					} else {
						scope.bullhornMessage = "Start All";

					}
				} else {
					if(NetworkData.transmitAll){	
						scope.bullhornMessage = "Contacting All";
					} else {
						scope.bullhornMessage = "Contact All";
						
					}
				}
			};

			element.bind('mouseenter', function(){
				// Pin all people in room after timeup
				hoverStart = new Date().getTime();
				elapsed = 0;
				determineStatusLabel(true);
				interval = $interval(function(){
					if(!timeup){
						// elapsed should be in miliseconds
						elapsed = (new Date().getTime()) - hoverStart;
						if(elapsed > 1000){
							for(var peer in scope.allPeers){
								$rootScope.$broadcast(peer+'pinBubble');
							}
							elapsed = 0;
							timeup = true;
							$interval.cancel(interval);
						}
					}
				}, 50);
			})
			.bind('mouseleave', function(){
				// Unpin all people who aren't connected
				if(timeup){
					
					setTimeout(function(){
						scope.$apply(function(){
							for(var peer in scope.allPeers){
								$rootScope.$broadcast(peer+'unpinBubble');
							}
						});
					}, 1500);
				}
				determineStatusLabel(false);
				if(interval != null)
					$interval.cancel(interval);
				timeup = false;
				elapsed = 0;
			})
			.bind('click', function(){
				$interval.cancel(interval);
				NetworkData.transmitAll = !NetworkData.transmitAll;
				for(var peer in scope.allPeers){
					$rootScope.$broadcast(peer+'forceCall', NetworkData.transmitAll, true);
				}
			});

			scope.$watch(function(){
				return NetworkData.transmitAll;
			}, function(newValue, oldValue){
				scope.transmitAll = newValue;
				determineStatusLabel(false);
			});
			
			scope.$watch(function(){
				return NetworkData.peerLength;
			}, function(newValue, oldValue){
				if(newValue > 0){
					scope.shouldShow = true; 
				} else {
					scope.shouldShow = false;
				}
			}, true);
		}
	}
}]);

