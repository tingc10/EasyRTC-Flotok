
(function(){
	
	/************** ANGULAR SETUP *************/
	angular.module('VirtualOffice')
	// .directive('onFinishRender', function ($timeout) {
 //  	return {
 //      restrict: 'A',
 //      link: function (scope, element, attr) {
 //          if (scope.$last === true) {
 //              $timeout(function () {
 //                  scope.$emit('ngRepeatFinished');
 //              });
 //          }
 //      }
 //  	}
 //  })
	.directive('fadeSnapshot', function(){
	  return {
	    restrict: 'A',
	    link: function(scope, element, attrs) {
	    	var user = scope.$parent.peer.bubble;
	    	var popOld = function(){
	      	// console.log(scope.$parent.peer.bubble.snapshots.length);
	      	// 	//pop off

	      	if(scope.$parent !== null && scope.$parent.peer.bubble.snapshots.length > 3){
	      		scope.$parent.peer.bubble.snapshots.shift();
	      		// scope.$apply();
	      	}
	      };
	      TweenMax.to(element,2, {opacity:1, ease: Power3.easeIn, onComplete:popOld});
	    }
	  } 
	})
	.directive('showDock', function(){
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				scope.$watch(function(){
					return scope.peersLength;
				}, function(newValue, oldValue){
					if(oldValue == 0 && newValue > 0){
						TweenMax.set(element, {width: '8vmin'});
					} else if(oldValue > 0 && newValue == 0){
						TweenMax.set(element, {width: 0});

					}
				});
			}
		}
	})
	// .directive('groupCount', function(){
	// 	return {
	// 		restrict: 'A', 
	// 		link: function(scope, element, attrs) {
	// 			scope.$watch(function(){
	// 				return scope.group;
	// 			}, function(){
	// 				var count = 0;
	// 				for(user in scope.group.users){
	// 					count++;
	// 				}
	// 				scope.group.count = count;
	// 			});
	// 		}
	// 	}
	// })
	.controller('FauxBubbleController', function($timeout, $scope, easyrtcNetwork){
		$scope.showMeta = false;
		$scope.peersLength = 0;
		var updateUsers = function(){
			$scope.peers = easyrtcNetwork.allPeers;
			$scope.peersLength = easyrtcNetwork.peersLength;
			$scope.allGroups = easyrtcNetwork.allGroups;
			$scope.$apply();
		};


		$scope.dockSize = function(expandView){
			// TODO: Toggles the dock size between mini and large view
			if($scope.peersLength > 0){
				if(expandView){
					TweenMax.set("#dock",{width:"25vmin"});
					$scope.showMeta = true;
				} else {
					TweenMax.set("#dock",{width:"8vmin"});
					$scope.showMeta = false;
				}
			}
		};
		
		easyrtcNetwork.registerObserverCallback(updateUsers);
		$scope.getInitial = function(displayName){
			var matches = displayName.match(/\b(\w)/g);
    	var acronym = matches.join('');
    	return acronym;
		};
		$scope.pinAndHold = function(collection){
			// TODO: Click event, centers object and calls
			//				if selecting collection for group then different
			var type = collection.constructor.name;
			var shouldPin = function(user){
				// if user is no longer floating already, then don't run function
				if(!user.bubble.shouldFloat) return;
				if(user.callStatus == 0){
					// only need to call halt float if it's been moving
					user.haltFloat(true);
					collapseExpandAtCenter(user.bubble.element, null, null);
				}
			};
			if(type == "User"){
				// if no call going on pin to center (otherwise it should already be pinned)
				shouldPin(collection);
			} else {
				for(var id in collection.users){
					if(id == easyrtc.myEasyrtcid) continue;
					shouldPin($scope.peers[id]);
				}
			}
		};
		$scope.pauseThenEval = function(collection){
			// TODO: releases the bubble after a certain amount of time
			var type = collection.constructor.name;
			var callTimeout;
			if(type == "User"){
				callTimeout = function(){
					collection.evalCallState();
				};
				
			} else {
				// object is a group object
				callTimeout = function(){
					for(var id in collection.users){
						if(id == easyrtc.myEasyrtcid) continue;
						$scope.peers[id].evalCallState();
					}
				};
			}
			$timeout(callTimeout, 1);
		};
		$scope.createGroup = function(){
			// TODO: changes the functionality of click to be
			if(easyrtcNetwork.selectingGroup == null){
				var group = new Group(easyrtc.myEasyrtcid, true);
				easyrtcNetwork.allGroups[group.getGroupID()] = group;
				easyrtcNetwork.selectingGroup = group.getGroupID();
			}
		};
		$scope.determineClick = function(collection){
			// TODO: determine if user is being selected or if a call is being made
			var type = collection.constructor.name;
			if(type == "User"){
				// if toggling user selection for group, dont make a call
				if(easyrtcNetwork.toggleUserSelection(collection.id)){
					return;
				}
				collection.toggleTransmition();
			} else {
				// click action on group only works if not in group selection mode
				if(easyrtcNetwork.selectingGroup == null){
					for(var id in collection.users){
						if(id == easyrtc.myEasyrtcid) continue;
						$scope.peers[id].toggleTransmition();
					}
				}
			}
		};
		$scope.pullUpAll = function(){
			for(var id in $scope.peers){
				var user = $scope.peers[id];
				if(!user.bubble.shouldFloat) continue;
				if(user.callStatus == 0){
					user.haltFloat(true);
					collapseExpandAtCenter(user.bubble.element, null, null);
				}
			}
		};
		$scope.pauseAllEval = function(){
			var callTimeout = function(){
				for(var id in $scope.peers){
					var user = $scope.peers[id];
					user.evalCallState();
				}
			};
			$timeout(callTimeout, 1);
		};
		$scope.toggleTransmitAll = function(){
			// don't enable calling of all if in selecting group mode
			if(easyrtcNetwork.selectingGroup != null) return;
			for(var id in $scope.peers){
				var user = $scope.peers[id];
				user.toggleTransmition();
			}
		};	
		
	})
	.controller('BubbleController', function($scope, $timeout, easyrtcNetwork){
		var updateUsers = function(){
			$scope.peers = easyrtcNetwork.allPeers;
			$scope.allGroups = easyrtcNetwork.allGroups;
			$scope.$apply();
			
		};
		easyrtcNetwork.registerObserverCallback(updateUsers);
		$scope.$watch(function(){
			// TODO: turns on the buttons for confirming group selection
			return easyrtcNetwork.selectingGroup;
		}, function(){
			$scope.selectingGroup = easyrtcNetwork.selectingGroup;
		});

		$scope.callUser = function(peer) {
			// TODO: call user and update callStatus
			// check for drag event first, then see if it is a click event for selection or for call
			if(!peer.pendingCall){
				// cancel callUser if the event was a drag event
				return;
			}
			// if toggling user selection for group, dont make a call
			if(easyrtcNetwork.toggleUserSelection(peer.id)){
				return;
			}

			peer.pendingCall = false;		// reset
			
			peer.toggleTransmition();
			
			
		};

		$scope.initBubble = function(user){
			// TODO: initializes bubble and begin the animation
			// user is the User object
			// the timeout is used to run the function after DOM has been rendered
			var callTimeout = function(){
				try{
					var videoContainer = document.getElementById(user.id).parentNode;
					user.bubble = new Bubble(videoContainer);
					$(videoContainer.parentNode).draggable({
						scroll: false
					});
				user.bubble.enterRoom();
				} catch(err){
					console.log("error logging user", user);
				}
				
			};
			$timeout(callTimeout);
			
		};
		$scope.pendCall = function(peer){
			// TODO: on mouse down event could be to initiate call
			peer.pendingCall = true;
		};
		$scope.cancelCall = function(peer){
			// TODO: if the mouse moves, confirm drag event rather than call event
			if(peer.pendingCall){
				peer.pendingCall = false;
			}
		};
		$scope.groupConfirm = function(create){
			if(easyrtcNetwork.selectingGroup == null){
				console.log('Group Confirm Error: No group ID');
				return;
			}
			
			if(easyrtcNetwork.allGroups[easyrtcNetwork.selectingGroup].count < 2 && create){
				alert('Please select more people to join your group!');
				return;
			}
			if(create){
				// if create, broadcast the group
				easyrtcNetwork.broadcastCurrentGroup();
			} else {
				// if not, remove the group from all groups
				delete easyrtcNetwork.allGroups[easyrtcNetwork.selectingGroup];
			}
			// reset selecting group flag
			easyrtcNetwork.selectingGroup = null;
		};
	})
	.controller('UsernameController', function($scope, easyrtcNetwork){
		
		$scope.username = '';
		$scope.setUsername = function(){
			if($scope.username.length == 0){
				alert('Please enter a username');
				return false;
			} else {
				easyrtc.setUsername($scope.username);
				$(selfContainer).find(".display-name").html($scope.username);
				var usernameContainer = document.getElementById('username-container');
				TweenMax.to(usernameContainer, .75, {opacity:0, onComplete:function(){
					$(usernameContainer).remove();
					easyrtcNetwork.initCall();
				}});
				return true;
			}
		};
	});
	

	
	/************* MOUSE EVENTS HANDLERS *******************/
	
	/************* FUNCTION DOC ON READY *******************/
	$(function(){
		$(selfContainer.parentNode).draggable({
			scroll : false
		});
	});
})();