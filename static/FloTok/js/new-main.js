
(function(){
	
	/************** ANGULAR SETUP *************/
	angular.module('VirtualOffice')	
	.directive('getUsername', function($rootScope, $timeout){
		return {
			restrict: 'E',
			scope: {
				displayName : "=",
				roomName : '='
			},
			templateUrl: './directives/get-username.html',
			link: function(scope, element, attrs){
				element[0].querySelector('#username-input').focus();
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
									scope.$apply(function(){
										if(scope.roomName == ""){
											scope.roomName = "default";
										}
										element.remove();
										$rootScope.$broadcast('initStream');

									});
									
								}
							});
						}
					}
				});
			}
		}
	})
	.directive('imageLoaded', function(){
		return {
			restrict: 'A',
			link: function(scope, element, attrs){
				element.bind('load', function(){
					console.log('image loaded');
					TweenMax.to(element, 1, {opacity: 1});
				});
			}
		}
	})
	.directive('hideRoomContainer', function(){
		return {
			restrict: 'A',
			link: function(scope, element, attrs){
				var animate = new TimelineMax({paused: true});
				var hiding = true;
				var roomDimensions = {
					x: 0,
					y: 0,
					width: 0,
					height: 0
				};
				var setRoomDimensions = function(){
					roomDimensions.x = element[0].offsetLeft;
					roomDimensions.y = element[0].offsetTop;
					roomDimensions.width = element[0].offsetWidth;
					roomDimensions.height = element[0].offsetHeight;
				};
				scope.$on('hideRoom', function(e, hide){
					animate.progress(1).clear().eventCallback("onComplete", null);
					hiding = hide;
					if(hide){

						animate.to(element, .5, {opacity: 0})
						.set(element, {display: "none"});
					} else {
						animate.set(element, {display:"block"})
						.to(element, .5, {opacity: 1});
						setRoomDimensions();
					}
					animate.play();
				});
				window.addEventListener('resize', function(){
					if(!hiding){
						roomDimensions.x = element[0].offsetLeft;
						roomDimensions.y = element[0].offsetTop;
						roomDimensions.width = element[0].offsetWidth;
						roomDimensions.height = element[0].offsetHeight;
					}
				});
				scope.$on('checkDragDrop', function(e, eventData, id){
					if(hiding) return;
					var mouseX = eventData.pageX,
							mouseY = eventData.pageY;
					if(mouseX >= roomDimensions.x && mouseX <= roomDimensions.x+roomDimensions.width){
						if(mouseY >= roomDimensions.y && mouseY <= roomDimensions.y+roomDimensions.height){
							scope.$broadcast(id+'objectOverRoom', true);
							return;
						}
					}
						
					scope.$broadcast(id+'objectOverRoom', false);
					
				});
			}
		}
	})
	// .directive('drawVideo', ["$rootScope", function($rootScope){
	// 	return {
	// 		restrict: 'A',
	// 		link: function(scope, element, attrs){
				
	// 		}
	// 	}
	// }])
	.directive('videoDisplay', ['$rootScope', "$timeout", "NetworkData", function($rootScope, $timeout, NetworkData){
		return {
			restrict: 'E',
			templateUrl: './directives/video-display.html',
			scope: {
				canvasId: '@',
				callStatus: '='
			},
			link: function(scope, element, attrs){
				scope.snapshots = [];
				var $canvas = element.find('canvas');
				var cw = 640, ch = 480;
				var context = $canvas[0].getContext('2d');
				var activeSpeakerId = '';
				
				scope.video = null;
				scope.displayName = '';
				scope.transmissionStatus = '';
				scope.acceptMessage = '';
				scope.declineMessage = '';


				$canvas[0].width = cw;
				$canvas[0].height = ch;
				var setVideo = function(elt){
					scope.video = elt;
					
				};
				var play = function(){
					if(scope.video != null){
						context.drawImage(scope.video, 0, 0, cw, ch);
						requestAnimFrame(function(){
							play();
						});
					}
				};
				
				$timeout(function(){
					// fill canvas with first snapshot
					$rootScope.$emit("getSnapshot:"+scope.canvasId);
				});

				if(scope.canvasId != "active-speaker"){
					// participants listeners
					scope.$watch(function(){
						return scope.callStatus;
					}, function(newValue){
						// set the current transmission status
						switch(scope.callStatus){
							case callStatus.CALLTO:
								scope.transmissionStatus = "OUTGOING";
								scope.acceptMessage = '';
								scope.declineMessage = 'DISCONNECT';
								break;
							case callStatus.CALLFROM:
								scope.transmissionStatus = "INCOMING";
								scope.acceptMessage = 'Accept';
								scope.declineMessage = 'Decline';
								break;
							case callStatus.TWOWAY:
								scope.transmissionStatus = "CONNECTED";
								scope.acceptMessage = '';
								scope.declineMessage = 'DISCONNECT';
								$timeout(function(){
									scope.transmissionStatus = '';
								}, 1000);
								break;
							default:
								break;
						}
						if(newValue == callStatus.CALLFROM ||
								newValue == callStatus.TWOWAY){
							$rootScope.$emit("getVideo:"+scope.canvasId);
						} else {
							scope.video = null;
						}
					});
					scope.displayName = easyrtc.idToName(scope.canvasId);
				} else {
					// events only for active-speaker canvas
					scope.$watch(function(){
						return scope.video;
					}, function(videoAttached){
						if(videoAttached != null){
							TweenMax.set(element, {opacity:1});

						} else {
							TweenMax.set(element, {opacity:0});
							context.clearRect(0,0,cw,ch);
						}
					});
					scope.declineMessage = "DISCONNECT";
				}
				element.bind('mouseenter', function(){
					var tmp = scope.canvasId;
					if(scope.canvasId == 'active-speaker'){
						tmp = activeSpeakerId;
					}
					easyrtc.sendPeerMessage(tmp, 'check_channel', null,
						function() {
							// channel works, proceed as intended...
						},
						function(){
							$timeout(function(){
								if(NetworkData.interactingPeers[tmp])
									delete NetworkData.interactingPeers[tmp];
							});
						}
					);
				});
				scope.acceptCall = function(){
					scope.$emit('informRoomAboutTransmition', scope.canvasId, true);
					$rootScope.$broadcast(scope.canvasId+'forceCall', true, false);
				};

				scope.declineCall = function(){
					if(scope.canvasId == "active-speaker"){
						if(scope.video != null)
							scope.$emit('informRoomAboutTransmition', activeSpeakerId, false);
							$rootScope.$broadcast(activeSpeakerId+'forceCall', false, false);
					} else {
						scope.$emit('informRoomAboutTransmition', scope.canvasId, false);
						$rootScope.$broadcast(scope.canvasId+'forceCall', false, false);
					}

				};

				$rootScope.$on('setVideo:'+scope.canvasId, function(e, element, id){
					// scope.$apply(function(){
						// TweenMax.set(element, )
						$timeout(function(){
							setVideo(element);
							play();
							if(scope.canvasId == "active-speaker"){
								activeSpeakerId = id;
								scope.displayName = easyrtc.idToName(activeSpeakerId);
								
							}
						});
							
					// });
				});
				$rootScope.$on('stopPlaying:'+scope.canvasId, function(){
					scope.video = null;
					activeSpeakerId = '';
				});
				$rootScope.$on('appendSnapshot:'+scope.canvasId, function(e, snapshot){
					console.log('appending snapshot');
					scope.snapshots.push(snapshot);
				});
				

			}
		}
	}])
	.directive('showParticipants', function(){
		return{
			restrict: "A",
			link: function(scope, element, attrs){
				var animate = new TimelineMax({pause: 0});
				scope.$on('toggleParticipantVisibility', function(e, show){
					animate.progress(1).clear().eventCallback("onComplete", null);
					if(show){
						animate.set(element, {display:"block"})
						.to(element, .5, {opacity:1});
					} else {
						animate.to(element, .5, {opacity:0})
						.set(element, {display: "none"});
					}
				});
			}
		}
	})
	.controller('StreamController', function($timeout, $interval, $scope, $rootScope, NetworkData){
		// TODO: Parent Controller
		$scope.myDisplayName = '';
		$scope.roomName = "";
		$scope.allPeers = NetworkData.allPeers;
		$scope.interactingPeers = NetworkData.interactingPeers;
		$scope.showRoomContainer = false;
		$scope.roomMessage = '';
		var preRoomListenerEvents = [];		// takes an array of functions that need to run after peer is setup
		// do not create users when 
		var knownInvalidIds = [];
		// var runningIntervals = [];
		var snapshotPromise = null;
		var iceConfigPromise = null;
		var serverConnected = false;
		var localStreamEnded = false;
		var localStreamWatcher = null;
		var msgClearInterval = null;
		
		var bootUsers = function(){
    	// log out anyone who is no longer in the room
    	// called after all callbacks are complete
			
    	// reset the peerlength
    	
			var tmp;
    	console.log('REMOVING USERS FROM ROOM...');
	    for(var easyrtcid in NetworkData.allPeers){		      
	      tmp = NetworkData.allPeers[easyrtcid];
	      if(!tmp.stillInRoom){
	        console.log(tmp.displayName + " has left the room");
	        $scope.$broadcast(tmp.id+"leaveRoom");
	        
	      } else {
	        // must reset the tmp's stillInRoom flag
	        tmp.stillInRoom = false;
	      }
	    }

	    NetworkData.peerLength = 0;
    	for(var id in NetworkData.allPeers){
    		NetworkData.peerLength++;
    	}
	  };

	  var checkUserChannel = function(id, callbacksComplete, totalPeers){
      easyrtc.sendPeerMessage(id, 'check_channel', null,
        function(msgType, msgBody) {
        	
          // console.log(id + " channel work");
        	if((user = NetworkData.allPeers[id]) === undefined){
		      	NetworkData.addPeer(id);
		      } else {
		        user.stillInRoom = true;
		      }
		      $scope.$apply(function(){
		      	callbacksComplete.value++;
		      	if(callbacksComplete.value == totalPeers){
		      		callbacksComplete = null;
		      		bootUsers();
		      	}
		      });
		      
        },
        function(errorCode, errorText) {
           
          console.log(id + "'s channel failed " + errorText);
          $scope.$apply(function(){
		      	callbacksComplete.value++;
		      	if(callbacksComplete.value == totalPeers){
		      		callbacksComplete = null;
		      		bootUsers();
		      	}
		      });
        }
      );

    };

		var startSnapshotInterval = function(){
			snapshotPromise = $interval(function(){
        // TODO: take snapshot and check room occupancy to make sure it aligns with allPeers array
        $scope.$broadcast('takeSnapshot');
      }, NetworkData.snapshotInterval*1000);
		};

		

		var killIntervals = function(){
			// TODO: cancels all actively running intervals
			// while(runningIntervals.length > 0){
			// 	console.log("killing an interval...");
			// 	$interval.cancel(runningIntervals.shift());
			// }
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			if(iceConfigPromise != null){
				$interval.cancel(iceConfigPromise);
				iceConfigPromise = null;
			}
		};
		

		var roomListener = function(roomName, otherPeers) {
	    // TODO: callback for any changes to the number of occupants in room
		  $scope.$apply(function(){
		    var totalPeers = 0;
		    var callbacksComplete = {
		    	value:0
		    };
		    var user;
		    var easyrtcid;
		    
			  for(easyrtcid in otherPeers){
			  	// do a quick count, this function can't be combined with the bottom loop
			  	// because the callbacks rely on totalPeers number which may change when
			  	// callback returns
			  	totalPeers++;
			  }
		    for(easyrtcid in otherPeers) {
		      console.log(easyrtcid + " entered the room");
		      var tmp = easyrtcid.valueOf();
		      checkUserChannel(easyrtcid, callbacksComplete, totalPeers);
		      
		    }
		    
		    
	    });
	  };
	  var connectToServer = function(){
	  	var connectSuccess = function(myId) {
		    $scope.$apply(function(){
		      serverConnected = true;
		      $scope.refreshMessage = "Refresh";
		      $scope.$broadcast("expandDock", false);
		      console.log("My easyrtcid is " + myId);
		      // begin sending snapshots at 
		      
		      killIntervals();
		      // only create snapshot interval is haltInterval is false
		      if(!NetworkData.haltInterval){
			      startSnapshotInterval();
			    }
		      // Get fresh ice config every 5 minutes
		      iceConfigPromise = $interval(function(){
		      	if(serverConnected){
			      	easyrtc.getFreshIceConfig();
			      	checkRoomLength();
			      }
		      }, 300000);

		     	if(localStreamWatcher == null){
			      localStreamWatcher = $scope.$watch(function(){
							return easyrtc.getLocalStream().getVideoTracks()[0].readyState;
						}, function(newValue, oldValue){
							if(newValue == "ended"){
								disconnectFromServer();
								$scope.$broadcast('clearSelfStream');
								localStreamEnded = true;
								alert('Please reinitialize your camera');
								// deregister watch
								localStreamWatcher();
								localStreamWatcher = null;
							}
						});
					}
		    });
	    };
	    var connectFailure = function(errMsg){
	      console.log("Connection Error: " + errMsg);
	      // If connection failed, try to reconnect to server after a 5 seconds
	      $timeout(function(){
	      	console.log('Server reconnect failed, reconnecting in 5 seconds...');
	      	connectToServer();
	      }, 5000);
	    };
	    easyrtc.connect(
      	$scope.roomName, 
      	connectSuccess, 
      	connectFailure
      );
	  };
	  var disconnectFromServer = function(){
	  	// TODO: remove intervals then disconnect
	  	
	  	easyrtc.disconnect();
	  	
	  };
	  $scope.refreshConnection = function(){
	  	// TODO: refreshes the current connection by disconnecting then reconnecting
	  	//				it will also reinitialize local stream
	  	$scope.refreshMessage = "In Progress";
	  	disconnectFromServer();
	  	$timeout(connectToServer, 1000);

	  	
	  };
	  var checkRoomLength = function(){
	    // $scope.$apply(function(){
		    var realRoomList = easyrtc.getRoomOccupantsAsArray($scope.roomName);
		    var completedCallbacks = {
		    	value:0
		    };
		    if(realRoomList == null){
		    	console.log("Error checking room length: room length is null.", realRoomList);
		    	return;
		    }
		    var numPeers= realRoomList.length - 1;
		    NetworkData.peerLength = 0;
	    	for(var id in NetworkData.allPeers){
	    		NetworkData.peerLength++;
	    	}
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
			    	checkUserChannel(id, completedCallbacks, numPeers);
		    	}
		    	// no peers to check, numPeers == 0, then just call bootUser
		    	if(completedCallbacks.value == numPeers)
			    	bootUsers();
		    }
		  // });
	  };

	  var notifyParticipantsInRoom = function(){
	  	//TODO: If other users are already connected to your room,
	  	//			let them see people who you are contacting or those contacting you
	  	
	  };
	  var getConnectedParticipants = function(){
	  	// TODOD: return the participants who are connected to you in the room
	  	var participantArray = [];
	  	for(var tmp in NetworkData.interactingPeers){
	  		if(NetworkData.interactingPeers[tmp].callStatus == callStatus.TWOWAY)
		  		participantArray.push(tmp);
	  	}
	  	return participantArray;
	  };
	  $scope.closeRoom = function(){
	  	for(var peer in NetworkData.allPeers){
				$scope.$broadcast(peer+'forceCall', false, true);
			}
	  }
	  /*********************** ANGULAR LISTENERS ************************/
	  $scope.$watch(function(){
			return NetworkData.initializationComplete;
		}, function(newValue){
			if(newValue){
				while(preRoomListenerEvents.length > 0){
					var tmpFn = preRoomListenerEvents.shift();
					tmpFn();
				}
			}
		});
		$scope.$watch(function(){
			return NetworkData.snapshotInterval;
		}, function(){
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			if(!NetworkData.haltInterval && serverConnected){
				startSnapshotInterval();
			}
		}, true);

		$scope.$watch(function(){
			return NetworkData.haltInterval;
		}, function(newValue, oldValue){
			if(snapshotPromise != null){
				$interval.cancel(snapshotPromise);
				snapshotPromise = null;
			}
			// if haltInterval is false and connected start sending snapshots again
			if(!newValue && serverConnected){
				startSnapshotInterval();
			}
		});

		$scope.$watch(function(){
			return NetworkData.interactingPeers;
		}, function(){
			var count = 0;
			NetworkData.connected = 0;
			var id = null;
			for(var tmp in NetworkData.interactingPeers){
				count++;
				if(NetworkData.interactingPeers[tmp].callStatus == callStatus.TWOWAY){
					NetworkData.connected++;
					id = tmp;

				}
			}
			if(count == 0){
				$scope.$broadcast('hideRoom', true);
				// $scope.showRoomContainer = false;
				$rootScope.$emit('stopPlaying:active-speaker');
			} else {
				$scope.$broadcast('hideRoom', false);

				// $scope.showRoomContainer = true;
				// if only one person in room, set as active speaker (if twoway connected)
				if(NetworkData.connected == 0){
					$rootScope.$emit('stopPlaying:active-speaker');
				} else {
					$rootScope.$emit('setActiveSpeaker:'+id);

				}
				if(NetworkData.connected == 1 && count == 1){
					// hide participants list if only one person is connected
					$scope.$broadcast("toggleParticipantVisibility", false);
				} else {
					$scope.$broadcast("toggleParticipantVisibility", true);

				}
			}

		}, true);

		$scope.$on('initStream', function() {
			// check notification permission and enable if not enabled
	    notifyMe("You will receive a notification when someone is trying to contact you");
	    easyrtc.setRoomOccupantListener(roomListener);
	    
	    
	    // initMediaSource called when user allows camera accessibility
	    easyrtc.initMediaSource(function(){
	      // success callback
	      $scope.$broadcast('initSelfVideo');
	      connectToServer();
	      
	    });
	  });
	  $scope.$on('checkRoomLength', function(){
	  	$scope.$apply(function(){
	  		checkRoomLength();
	  	});
	  	
	  });
	  
	  $scope.$on('informRoomAboutTransmition', function(e, id, turnOn){
			var obj = {
				id: id,
				turnOn : turnOn
			};
			if(NetworkData.connected > 0){
				for(var connectedUser in NetworkData.interactingPeers){
					if(NetworkData.interactingPeers[connectedUser].callStatus == callStatus.TWOWAY){
						easyrtc.sendData(connectedUser, "roomToggleTransmition", obj);
					}
				}
			}

	  });

	  /************************** EASYRTC LISTENERS ************************/
	  easyrtc.setPeerListener(function(easyrtcid, msgType, msgData, targeting){
	    // IMPORTANT: peer listener will begin getting data even before room listener is called
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

		      case "activateRoom":
		      	// "first time" probe, activates targeted users and calls whoever is connected to that room
		      	if(NetworkData.connected > 0){
		        	var tmp = getConnectedParticipants();
		        	easyrtc.sendPeerMessage(easyrtcid, "activateOthersInRoom", tmp, 
		        		function(){
		        			// success...
		        		},
		        		function(){
		        			console.log("ERROR: could not notify other connected users")
		        		}
		        	);
		        }
		        NetworkData.allPeers[easyrtcid].toggleAudioStream(true);
		        NetworkData.allPeers[easyrtcid].evalCallState($scope);
		        break;
		      case "roomToggleTransmition":
		      	// when a user connected to more than one other user calls another person,
		      	// a 'toggleTransmition' method is propagated to all other connected users
		      	$scope.$broadcast(msgData.id+"forceCall", msgData.turnOn, false);
		      	break;
		      case "newSnapshot":
		        
		        if(!document[hidden]){
		          try{
		            if(msgData != null && msgData != undefined){
			            // NetworkData.allPeers[easyrtcid].snapshots.push(msgData);
			            $scope.$broadcast(easyrtcid+"newSnapshot", msgData);
			          }
		          } catch(err){
		            console.log(err);
		          }
		        }
		        break;
		      case "callWhenReady":
		      	// used for call all if someone is trying to call everyone in the room
		      	
		      	if(!NetworkData.initializationComplete){
		      		preRoomListenerEvents.push(function(){
			      		easyrtc.sendData(easyrtcid, "readyForCall");
			      	});
		      	} else {
		      		easyrtc.sendData(easyrtcid, "readyForCall");
		      	}
		      	break;
		      case "getCurrentSnapshot":
		      	// sends current snapshot to user requesting first snapshot
		      	if(!NetworkData.initializationComplete){
		      		preRoomListenerEvents.push(function(){
			      		$scope.$broadcast('sendCurrentSnapshot', easyrtcid);
			      	});
		      	} else {
		      		$scope.$broadcast('sendCurrentSnapshot', easyrtcid);
		      	}
		      	
		      	break;
		      case "readyForCall":
		      	NetworkData.allPeers[easyrtcid].toggleTransmition(true, $scope, true);
		      	break;
		      case "groupUpdate":
		        // network.updateGroups(msgData);
		        break;
		      case "actively-speaking":
		      	$rootScope.$emit('setActiveSpeaker:'+easyrtcid);
		      	break;
		      case "activateOthersInRoom":
		      	// reveals all users connected to peer you are trying to contact
	      		if(msgClearInterval != null){
		      		$timeout.cancel(msgClearInterval);
		      	}
		      	$scope.roomMessage = "Pinging others connected with " + NetworkData.allPeers[easyrtcid].displayName;
		      	msgClearInterval = $timeout(function(){
		      		$scope.roomMessage = '';
		      		msgClearInterval = null;
		      	}, 3000);

		      	for(var i = 0; i < msgData.length; i++){
		      		$scope.$broadcast(msgData[i]+"forceCall", true, true);
		      	}
		      	break;
		      case "setDoNotDisturb":
		      	$scope.$broadcast(easyrtcid+"setDoNotDisturb", msgData);
		      	break;
		      case "getAvailability":
		      	$scope.$broadcast('sendAvailability', easyrtcid);
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
	    $timeout(function(){
	    	$scope.$broadcast(callerEasyrtcid+"streamClosed");
	    	
	    });
	  });
	  easyrtc.setDisconnectListener(function(){
	  	// TODO: callback for when server gets disconnected
		  $scope.$apply(function(){
		  	killIntervals();
		  	serverConnected = false;

		  	// do not run reconnection if user's video gets ended
		  	if(!localStreamEnded){
		  		console.log("Server disconnected");
		  	}
	  	});
	  });
	  /******************** BROWSER EVENTS **********************/
	  window.onfocus = function(){
	  	// TODO: reinitialize local stream and connect to server
	  	$scope.$apply(function(){
	  		console.log('Checking local stream')
	  		if(localStreamEnded && !serverConnected){
	  			console.log('...local stream was ended, reinitializing');
	  			localStreamEnded = false;
	  			$scope.$emit('initStream');
	  		}
	  	});
	  };
	  
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