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
	.directive('selfBubble',['NetworkData', function(NetworkData){
		// TODO: directive defining own video container
		return {
			restrict: 'E',
			templateUrl: './directives/self-bubble.html',
			scope: {},
			link: function(scope, element, attrs){
				var videoContainer = element[0].querySelector('.video-container');
				var $video = element.find('video');		// jquery lite
				var snapshotCanvas = element[0].querySelector("#snapshot");
				scope.bubble = new Bubble(element);
				$(element).draggable({
					scroll : false
				});
				scope.$on('takeSnapshot', function(){
				  // set snapshot canvas width and height to the same as the video element
				  snapshotCanvas.width = $video[0].offsetWidth;
				  snapshotCanvas.height = $video[0].offsetHeight;
				  var snapshotContext = snapshotCanvas.getContext("2d");
				  
				  snapshotContext.drawImage($video[0], 0, 0, snapshotCanvas.width, snapshotCanvas.height);
				  // broadcast to everyone who is in the room

				  if(NetworkData.peerLength > 0){
				    var data = snapshotCanvas.toDataURL();
				    NetworkData.broadcastObject(data, "newSnapshot");
				  }
				  
				});
				scope.$on('initSelfVideo', function(){
					scope.$apply(function(){
						easyrtc.setVideoObjectSrc($video[0], easyrtc.getLocalStream());
	      		scope.bubble.expandAt(0, 0, null, null);
	      		scope.bubble.playAnimationQueue();
	      	});
				});
				scope.$on('setDisplayName', function(e, displayName){
					var nameDOM = element[0].querySelector('.display-name');
					nameDOM.innerHTML = displayName;
				});
				scope.$on('sendFirstSnapshot', function(e, userRequesting){
					var data = snapshotCanvas.toDataURL();
					console.log('sending new user first snapshot');
					easyrtc.sendData(userRequesting, "newSnapshot", data);
				});

			}
		};
	}])
	.directive('peerBubble', ['NetworkData', '$timeout', function(NetworkData, $timeout){
		return {
			restrict: 'E',
			scope: {
				peer: '='
			},
			templateUrl: "./directives/peer-bubble.html",
			link: function(scope, element, attrs){
				var videoContainer = element[0].querySelector('.video-container'),
						statusIndicator = element[0].querySelector('.status-indicator'),
						isDragging = false,
						callEvent = false,
						selectEvent = false;
				var $video = element.find('video');
				scope.snapshots = [];
				var performCall = function(){
					// TODO: toggle transmition decided based on current callStatus
					if(scope.peer.callStatus == callStatus.NONE ||
							scope.peer.callStatus == callStatus.CALLFROM){
						scope.peer.toggleTransmition(true, scope);
					} else {
						scope.peer.toggleTransmition(false, scope);
					}
				};

				var initBubble = function(){
					// TODO: initializes bubble and begin the animation
					// user is the User object
					// the timeout is used to run the function after DOM has been rendered
					var callTimeout = function(){
						try{
							scope.bubble = new Bubble(element);
							$(statusIndicator).draggable({
								scroll: false,
								drag: function(){
									isDragging = true;
									callEvent = selectEvent = false;
								},
								stop: function(){
									isDragging = false;
								}
							});
							// requests an initial snapshot for the user
							easyrtc.sendData(scope.peer.id, 'getFirstSnapshot', easyrtc.myEasyrtcid);
							scope.bubble.enterRoom(scope);
						} catch(err){
							console.log("error logging user", user);
						}
					};
					$timeout(callTimeout);
				}();
				/**************** CLICK EVENTS ********************/
				element.bind('mouseover', function(){
					scope.$apply(function(){
						if(scope.bubble.shouldFloat){
							// conditional prevents mouseover from firing multiple times
							scope.bubble.haltFloat(true);
						}
					});
				}).bind('mouseleave', function(){
					scope.$apply(function(){
						if(!scope.bubble.shouldFloat && !isDragging){
							if(scope.peer.callStatus == callStatus.NONE){
								scope.bubble.haltFloat(false);								
							}
						}
					});

				}).bind('mousedown', function(){
					scope.$apply(function(){
						callEvent = true;
					});
				
				}).bind('mouseup', function(){
					// no apply wrap needed here as toggleTransmition will end with apply
					if(callEvent){
						performCall();
					} else if(selectEvent){

					}
					callEvent = selectEvent = false;
				});
				/**************** ANGULAR EVENTS ******************/
				scope.$on('$destroy', function(){
					scope.bubble.resetAnimationQueue();
					scope.bubble.collapse();
					scope.bubble.playAnimationQueue();
					$(statusIndicator).draggable('destroy');
				});
				scope.$on(scope.peer.id+'newSnapshot', function(e, snapShot){
					scope.snapshots.push(snapShot);
				});
				scope.$on(scope.peer.id+'streamAccepted', function(e, stream){
					// scope.$apply(function(){
						// turn off their audio stream
				    var remoteAudioStream = stream.getAudioTracks()[0];
				    remoteAudioStream.enabled = false;
				    // turn off their video stream
				    var remoteVideoStream = stream.getVideoTracks()[0];
				    remoteVideoStream.enabled = false;
				    easyrtc.setVideoObjectSrc($video[0], stream);
				  // });
				});
				scope.$on(scope.peer.id+'streamClosed', function(){
					// apply will show error, on the person closing the stream, just ignore
					// scope.$apply(function(){
				    scope.peer.callStatus = callStatus.NONE;
				    scope.peer.evalCallState(scope);
				    easyrtc.setVideoObjectSrc($video[0], "");
					// });
				});
				scope.$on(scope.peer.id+"newCallState", function(e, animation){
					//evalCallState should be wrapped by $apply already
					scope.bubble.resetAnimationQueue();
					if(animation == "none"){
						// remove animations then unpin
						scope.bubble.addToAnimationQueue(animation);
						// halt float inside togglePin as a callback
						scope.bubble.togglePin(false, scope);	
					} else {
						// stop floating, pin, then display animation
						if(scope.bubble.shouldFloat){
							scope.bubble.haltFloat(true);
						}
						scope.bubble.togglePin(true);
						if(animation != "twoway"){
							// if animation not two way, must reset to original bubble shape
							scope.bubble.addToAnimationQueue();
						}
						scope.bubble.addToAnimationQueue(animation);
					}
					scope.bubble.playAnimationQueue();
				});
				scope.$on(scope.peer.id+"leaveRoom", function(){
					// TODO: animates bubble collapse right before DOM is removed
					var removeCallback = function(){
						scope.$apply(function(){
							NetworkData.removePeer(scope.peer.id);
						});
					};
					scope.bubble.resetAnimationQueue();
					scope.bubble.collapse(removeCallback);
					scope.bubble.playAnimationQueue();
				});
				/***************** FAUX BUBBLE LISTENERS *****************/
				// faux bubble listeners should have $apply wrapped in binding directive
				scope.$on(scope.peer.id+"pinBubble", function(){
					if(!scope.bubble.pinned){
						if(scope.bubble.shouldFloat){
							// conditional prevents mouseover from firing multiple times
							scope.bubble.haltFloat(true);
						}
						scope.bubble.resetAnimationQueue();
						scope.bubble.togglePin(true);
						scope.bubble.playAnimationQueue();
					}
				});
				scope.$on(scope.peer.id+"unpinBubble", function(){
					// only unpin if there is no call going on
					if(scope.bubble.pinned && 
						scope.peer.callStatus == callStatus.NONE){
						scope.bubble.resetAnimationQueue();
						scope.bubble.togglePin(false, scope);
						scope.bubble.playAnimationQueue();
					}
				});
				scope.$on(scope.peer.id+"performCall", function(){
					performCall();
				});
				scope.$on(scope.peer.id+"forceCall", function(e, turnOn){
					scope.peer.toggleTransmition(turnOn, scope);
				});
			},
			controller: function($scope){
				
			}
		};
	}])
	.directive('fadeSnapshot', function(){
	  return {
	    restrict: 'A',
	    link: function(scope, element, attrs) {
	    	var animationComplete = function(){
	      	scope.$apply(function(){
	      	// 	//pop off
		      	if(scope.snapshots.length > 1){
		      			scope.snapshots.shift();
		      	}
	      	});
	      	// scope.$emit('snapshotLoaded');
	      };
	      TweenMax.to(element,2, {opacity:1, ease: Power3.easeIn, onComplete:animationComplete});
	    }
	  } 
	})
	.directive('getUsername', function($rootScope, $timeout){
		return {
			restrict: 'E',
			scope: {
				displayName : "=",
				roomName : '='
			},
			templateUrl: './directives/get-username.html',
			link: function(scope, element, attrs){
				element.bind('keyup', function(e){
					if(e.keyCode == 13){
						if(scope.displayName.length == 0){
							alert('Please enter a username');
						} else {
							easyrtc.setUsername(scope.displayName);
							$rootScope.$broadcast('setDisplayName', scope.displayName);
							TweenMax.to(element, .75, {
								opacity:0, 
								onComplete:function(){
									scope.$apply(function(){element.remove();});
									$rootScope.$broadcast('initCall');
								}
							});
						}
					}
				});
			}
		}
	})
	.directive('statusDock', ["NetworkData", function(NetworkData){
		return {
			restrict: 'E',
			templateUrl: './directives/status-dock.html',
			link: function(scope, element, attrs){
				
				scope.getInitial = function(displayName){
					var matches = displayName.match(/\b(\w)/g);
		    	var acronym = matches.join('');
		    	return acronym;
				};

				scope.showMeta = false;
				element.bind("mouseenter", function(){
					scope.$apply(function(){
						TweenMax.set(element,{width:"25vmin"});
						scope.showMeta = true;
					});
				})
				.bind("mouseleave", function(){
					scope.$apply(function(){	
						TweenMax.set(element,{width:"8vmin"});
						scope.showMeta = true;
					});
				
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
				element.bind('mouseenter', function(){
					scope.$apply(function(){
						hoverStart = new Date().getTime();
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
	.directive('groupCall',function($interval, $rootScope){
		return {
			restrict: 'A',
			link: function(scope, element, attrs){
				var hoverStart = 0;
				var elapsed = 0;
				var interval = null;
				var timeup = false;
				var transmitAll = false;
				element.bind('mouseenter', function(){
					// Pin all people in room after timeup
					hoverStart = new Date().getTime();
					elapsed = 0;
					interval = $interval(function(){
						if(!timeup){
							// elapsed should be in miliseconds
							elapsed = (new Date().getTime()) - hoverStart;
							console.log(elapsed);
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
					transmitAll = !transmitAll;
					for(var peer in scope.allPeers){
						$rootScope.$broadcast(peer+'forceCall', transmitAll);
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
	.controller('StreamController', function($interval, $scope, $rootScope, NetworkData){
		// TODO: Parent Controller
		$scope.myDisplayName = '';
		$scope.roomName = "default";
		$scope.allPeers = NetworkData.allPeers;
		
		var snapshotInterval = 5000;    // new snapshot in ms

		var roomListener = function(roomName, otherPeers) {
	    // TODO: callback for any changes to the number of occupants in room
		  $scope.$apply(function(){
		    var user;
		    var easyrtcid;
		    for(easyrtcid in otherPeers) {
		      console.log(easyrtcid + " entered the room");
		      if((user = NetworkData.allPeers[easyrtcid]) === undefined){
		      	NetworkData.addPeer(easyrtcid);
		      } else {
		        user.stillInRoom = true;
		      }
		    }
		    // log out anyone who is no longer in the room
		    for(easyrtcid in NetworkData.allPeers){		      
		      user = NetworkData.allPeers[easyrtcid];
		      if(!user.stillInRoom){
		        console.log(user.displayName + " has left the room");
		        $scope.$broadcast(user.id+"leaveRoom");
		        
		      } else {
		        // must reset the user's stillInRoom flag
		        user.stillInRoom = false;
		      }
		    }
	    });
	  };
	  var checkRoomLength = function(){
	    var realRoomList = easyrtc.getRoomOccupantsAsArray("default");
	    if((NetworkData.peerLength+1) != realRoomList.length){
	    	console.log("incorrect room length!");
	    	var user;
	    	var id;
	    	for(var i = 0; i < realRoomList.length; i++){
	    		id = realRoomList[i];
	    		if(id == easyrtc.myEasyrtcid) continue;
	    		if((user = NetworkData.allPeers[id]) !== undefined){
		        user.stillInRoom = true;
		      }
	    	}
	    	// log out anyone who is no longer in the room
		    for(easyrtcid in NetworkData.allPeers){		      
		      user = NetworkData.allPeers[easyrtcid];
		      if(!user.stillInRoom){
		        console.log(user.displayName + " has left the room");
		        $scope.$broadcast(user.id+"leaveRoom");
		        
		      } else {
		        // must reset the user's stillInRoom flag
		        user.stillInRoom = false;
		      }
		    }
	    }
	  };
		$scope.$on('initCall', function() {
	    easyrtc.setRoomOccupantListener(roomListener);
	    var connectSuccess = function(myId) {
	      console.log("My easyrtcid is " + myId);
	      // begin sending snapshots at 
	      $interval(function(){
	        // TODO: take snapshot and check room occupancy to make sure it aligns with allPeers array
	        $scope.$broadcast('takeSnapshot');
	        checkRoomLength();
	      }, snapshotInterval);
	    };
	    var connectFailure = function(errMsg){
	      console.log("Connection Error: " + errMsg);
	    };
	    
	    // initMediaSource called when user allows camera accessibility
	    easyrtc.initMediaSource(function(){
	      // success callback
	      $scope.$broadcast('initSelfVideo');
	      easyrtc.connect($scope.roomName, connectSuccess, connectFailure);
	      
	    });
	  });

	  easyrtc.setPeerListener(function(easyrtcid, msgType, msgData, targeting){
	    // JSON.stringify(msgData));
	  	$scope.$apply(function(){
		    switch(msgType){
		      case "activateVoice":
		        NetworkData.allPeers[easyrtcid].toggleAudioStream(true);
		        NetworkData.allPeers[easyrtcid].evalCallState($scope);
		        break;
		      case "stopVoice":
		        NetworkData.allPeers[easyrtcid].toggleAudioStream(false);
		        NetworkData.allPeers[easyrtcid].evalCallState($scope);
		        break;
		      case "newSnapshot":
		        
		        if(!document[hidden]){
		          try{
		            if(msgData != null || msgData != undefined){
			            // NetworkData.allPeers[easyrtcid].snapshots.push(msgData);
			            $scope.$broadcast(easyrtcid+"newSnapshot", msgData);
			          }
		          } catch(err){
		            console.log(err);
		          }
		        }
		        break;
		      case "getFirstSnapshot":
		      	// sends current snapshot to user requesting first snapshot
		      	$scope.$broadcast('sendFirstSnapshot', easyrtcid);
		      	break;
		      case "groupUpdate":
		        // network.updateGroups(msgData);
		        break;
		    }
	    });
	  });
	  easyrtc.setStreamAcceptor(function(callerEasyrtcid, stream) {
	    // TODO: callback when there is a stream connection from callerEasyrtcid
	    $scope.$apply(function(){
	    	$scope.$broadcast(callerEasyrtcid+"streamAccepted", stream);

	    });
	  });
	  easyrtc.setOnStreamClosed( function (callerEasyrtcid) {
	    // TODO: callback for when a connection is closed from callerEasyrtcid
	    $scope.$apply(function(){
	    	$scope.$broadcast(callerEasyrtcid+"streamClosed");

	    });
	  });

	})
	.controller('FauxBubbleController', function($timeout, $scope, NetworkData){
		


		
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
		
	})
	.controller('BubbleController', function($scope, $timeout, NetworkData){
		
		// $scope.callUser = function(peer) {
		// 	// TODO: call user and update callStatus
		// 	// check for drag event first, then see if it is a click event for selection or for call
		// 	if(!peer.pendingCall){
		// 		// cancel callUser if the event was a drag event
		// 		return;
		// 	}
		// 	// if toggling user selection for group, dont make a call
		// 	if(NetworkData.toggleUserSelection(peer.id)){
		// 		return;
		// 	}

		// 	peer.pendingCall = false;		// reset
			
		// 	peer.toggleTransmition();
			
			
		// };


		// $scope.groupConfirm = function(create){
		// 	if(NetworkData.selectingGroup == null){
		// 		console.log('Group Confirm Error: No group ID');
		// 		return;
		// 	}
			
		// 	if(NetworkData.allGroups[NetworkData.selectingGroup].count < 2 && create){
		// 		alert('Please select more people to join your group!');
		// 		return;
		// 	}
		// 	if(create){
		// 		// if create, broadcast the group
		// 		NetworkData.broadcastCurrentGroup();
		// 	} else {
		// 		// if not, remove the group from all groups
		// 		delete NetworkData.allGroups[NetworkData.selectingGroup];
		// 	}
		// 	// reset selecting group flag
		// 	NetworkData.selectingGroup = null;
		// };
	})
	
})();