// STATUS DIRECTIVES

angular.module('VirtualOffice')
.directive('statusDock', ["NetworkData", function(NetworkData){
	return {
		restrict: 'E',
		templateUrl: './directives/status-dock.html',
		link: function(scope, element, attrs){
			var keepExpanded
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
			scope.$watch(function(){
				return NetworkData.peerLength;
			}, function(newValue, oldValue){
					if(oldValue == 0 && newValue > 0){
						TweenMax.set(element, {width: '8vmin'});
					} else if(oldValue > 0 && newValue == 0){
						TweenMax.set(element, {width: 0});
					}
				}
			);
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
						$rootScope.$broadcast(scope.peer.id+'unpinBubble');
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
			element.bind('mouseenter', function(){
				// Pin all people in room after timeup
				hoverStart = new Date().getTime();
				elapsed = 0;
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
					for(var peer in scope.allPeers){
						$rootScope.$broadcast(peer+'unpinBubble');
					}
				}
				$interval.cancel(interval);
				timeup = false;
				elapsed = 0;
			})
			.bind('click', function(){
				$interval.cancel(interval);
				NetworkData.transmitAll = !NetworkData.transmitAll;
				for(var peer in scope.allPeers){
					$rootScope.$broadcast(peer+'forceCall', NetworkData.transmitAll);
				}
			});
		}
	}
}]);


// .controller('FauxBubbleController', function($timeout, $scope, NetworkData){
		


		
		// NetworkData.registerObserverCallback(updateUsers);
		// $scope.getInitial = function(displayName){
		// 	var matches = displayName.match(/\b(\w)/g);
  //   	var acronym = matches.join('');
  //   	return acronym;
		// };
		// $scope.pinAndHold = function(collection){
		// 	// TODO: Click event, centers object and calls
		// 	//				if selecting collection for group then different
		// 	var type = collection.constructor.name;
		// 	var shouldPin = function(user){
		// 		// if user is no longer floating already, then don't run function
		// 		if(!user.bubble.shouldFloat) return;
		// 		if(user.callStatus == 0){
		// 			// only need to call halt float if it's been moving
		// 			user.haltFloat(true);
		// 			collapseExpandAtCenter(user.bubble.element, null, null);
		// 		}
		// 	};
		// 	if(type == "User"){
		// 		// if no call going on pin to center (otherwise it should already be pinned)
		// 		shouldPin(collection);
		// 	} else {
		// 		for(var id in collection.users){
		// 			if(id == easyrtc.myEasyrtcid) continue;
		// 			shouldPin($scope.peers[id]);
		// 		}
		// 	}
		// };
		// $scope.pauseThenEval = function(collection){
		// 	// TODO: releases the bubble after a certain amount of time
		// 	var type = collection.constructor.name;
		// 	var callTimeout;
		// 	if(type == "User"){
		// 		callTimeout = function(){
		// 			collection.evalCallState();
		// 		};
				
		// 	} else {
		// 		// object is a group object
		// 		callTimeout = function(){
		// 			for(var id in collection.users){
		// 				if(id == easyrtc.myEasyrtcid) continue;
		// 				$scope.peers[id].evalCallState();
		// 			}
		// 		};
		// 	}
		// 	$timeout(callTimeout, 1);
		// };
		// $scope.createGroup = function(){
		// 	// TODO: changes the functionality of click to be
		// 	if(NetworkData.selectingGroup == null){
		// 		var group = new Group(easyrtc.myEasyrtcid, true);
		// 		NetworkData.allGroups[group.getGroupID()] = group;
		// 		NetworkData.selectingGroup = group.getGroupID();
		// 	}
		// };
		// $scope.determineClick = function(collection){
		// 	// TODO: determine if user is being selected or if a call is being made
		// 	var type = collection.constructor.name;
		// 	if(type == "User"){
		// 		// if toggling user selection for group, dont make a call
		// 		if(NetworkData.toggleUserSelection(collection.id)){
		// 			return;
		// 		}
		// 		collection.toggleTransmition();
		// 	} else {
		// 		// click action on group only works if not in group selection mode
		// 		if(NetworkData.selectingGroup == null){
		// 			for(var id in collection.users){
		// 				if(id == easyrtc.myEasyrtcid) continue;
		// 				$scope.peers[id].toggleTransmition();
		// 			}
		// 		}
		// 	}
		// };
		// $scope.pullUpAll = function(){
		// 	for(var id in $scope.peers){
		// 		var user = $scope.peers[id];
		// 		if(!user.bubble.shouldFloat) continue;
		// 		if(user.callStatus == 0){
		// 			user.haltFloat(true);
		// 			collapseExpandAtCenter(user.bubble.element, null, null);
		// 		}
		// 	}
		// };
		// $scope.pauseAllEval = function(){
		// 	var callTimeout = function(){
		// 		for(var id in $scope.peers){
		// 			var user = $scope.peers[id];
		// 			user.evalCallState();
		// 		}
		// 	};
		// 	$timeout(callTimeout, 1);
		// };
		// $scope.toggleTransmitAll = function(){
		// 	// don't enable calling of all if in selecting group mode
		// 	if(NetworkData.selectingGroup != null) return;
		// 	for(var id in $scope.peers){
		// 		var user = $scope.peers[id];
		// 		user.toggleTransmition();
		// 	}
		// };	
		
	// })