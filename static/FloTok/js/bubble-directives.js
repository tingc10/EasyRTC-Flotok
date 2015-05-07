// BUBBLE DIRECTIVES
angular.module('VirtualOffice')
.directive('selfBubble',['NetworkData', function(NetworkData){
	// TODO: directive defining own video container
	return {
		restrict: 'E',
		templateUrl: './directives/self-bubble.html',
		scope: {},
		link: function(scope, element, attrs){
			var videoContainer = element[0].querySelector('.video-container');
			var statusIndicator = element[0].querySelector('.status-indicator');
			var $video = element.find('video');		// jquery lite
			var speechEvents = null;
			var snapshotCanvas = element[0].querySelector("#snapshot");
			var speaking = false;		// helps determine active speaker
			var animation = new TimelineMax({paused: true});
			scope.bubble = new Bubble(element);
			scope.hover = false;
			scope.haltInterval = false;
			scope.snapshotInterval = 10;
			scope.doNotDisturb = globalDoNotDisturb;
			scope.muteMicrophone = false;
			var changeSelfView = function(connected){

				var position = statusIndicator.style.position;
				animation.progress(1).clear().eventCallback("onComplete", null);
				if(connected){
					
					animation.to(videoContainer, .5, {width: 0, height: 0, margin: '20vmin', ease: Power3.easeInOut})
					.set(statusIndicator, {left:'11vmin', top: "16vmin"})
					.to(videoContainer, .5, {width: '30vmin', height: '30vmin', margin:0, borderRadius:'1vmin', ease: Back.easeInOut})
					.to(videoContainer, .5, {width:'10vmin', height: '10vmin'}, '+=2');	// delay two seconds after
				} else {
					
					animation.to(videoContainer, .5, {width: 0, height: 0})
					.set(videoContainer, {margin: '20vmin'})
					.set(statusIndicator, {left: 0, top: 0})
					.set(videoContainer, {borderRadius:'50%'})
					.to(videoContainer, .5, {width: '40vmin', height: '40vmin', margin:0, ease: Back.easeInOut});
				}
				animation.play();
			};
			scope.toggleMicrophone = function(){
				// invoked my ng-click (no apply necessary)
				scope.muteMicrophone = !scope.muteMicrophone;
				var localStream = easyrtc.getLocalStream();
				var audioTrack = localStream.getAudioTracks()[0];
				audioTrack.enabled = !scope.muteMicrophone;
				
			};
			scope.takeSnapshot = function(){
				scope.$broadcast('takeSnapshot');
			};

			scope.$watch(function(){
				return scope.snapshotInterval;
			}, function(){
				console.log("value changed:" + scope.snapshotInterval);
				if(scope.snapshotInterval >= 5){
					console.log('changing scope interval');
					NetworkData.snapshotInterval = scope.snapshotInterval;
				}
			});
			scope.$watch(function(){
				return globalDoNotDisturb;
			}, function(){
				scope.doNotDisturb = globalDoNotDisturb;
			});
			scope.$watch(function(){
				return scope.haltInterval;
			}, function(){

				NetworkData.haltInterval = scope.haltInterval;
			});

			$(statusIndicator).draggable({
				scroll : false
			});

			
			element.bind('mouseenter', function(){
				scope.$apply(function(){
					scope.hover = true;
					// "in room" mouse events
					if(NetworkData.outgoing > 0){
						TweenMax.to(videoContainer, .5, {width: '30vmin', height: '30vmin', ease: Back.easeInOut});
					}
				});
			})
			.bind('mouseleave', function(){
				scope.$apply(function(){
					scope.hover = false;
					if(NetworkData.outgoing > 0){
						TweenMax.to(videoContainer, .5, {width: '10vmin', height: '10vmin', ease: Back.easeInOut});
					}
				});
			});
			scope.$on('takeSnapshot', function(){
			  // set snapshot canvas width and height to the same as the video element
			  snapshotCanvas.width = 640;
			  snapshotCanvas.height = 480;
			  var snapshotContext = snapshotCanvas.getContext("2d");
			  
			  snapshotContext.drawImage($video[0], 0, 0, snapshotCanvas.width, snapshotCanvas.height);
			  // broadcast to everyone who is in the room

			  if(NetworkData.peerLength > 0){
			    var data = snapshotCanvas.toDataURL();
			    NetworkData.broadcastObject(data, "newSnapshot");
			  }
			  
			});
			scope.$watch(function(){
				return videoContainer.offsetHeight;
			}, function(newValue, oldValue){
				videoOffsetHeight = newValue;
			});

			scope.$watch(function(){
				return NetworkData.outgoing;
			}, function(newValue, oldValue){
				if(newValue == 1 && oldValue == 0){
					
					changeSelfView(true);
				} else if(newValue == 0 && NetworkData.initializationComplete) {
					changeSelfView(false);
				}
			});

			scope.$on('initSelfVideo', function(){
				scope.$apply(function(){
					var localStream = easyrtc.getLocalStream();
					easyrtc.setVideoObjectSrc($video[0], localStream);
					// hark determines active speaker
					if(speechEvents == null){
						speechEvents = hark(localStream, {});
						speechEvents.on('speaking', function(){
							scope.$apply(function(){
								speaking = true;
								// console.log('start speaking');
								setTimeout(function(){
									scope.$apply(function(){
										if(speaking){
											console.log('actively speaking');
											for(var id in NetworkData.interactingPeers){
												if(NetworkData.interactingPeers[id].callStatus == callStatus.TWOWAY){
													easyrtc.sendPeerMessage(id, 'actively-speaking',null,
														function(){
															// success
														},
														function(errorText, errorCode){
															console.log(errorText+ ": " + errorCode);
														}
													);
												}
											}
										}
									});
									

								}, 1500);
							});
						});
						speechEvents.on('stopped_speaking', function(){
							scope.$apply(function(){
								speaking = false;
								// console.log('stopped speaking');
							});
							
						});
					}
					
					var takeSnapshot = function(){
						scope.$apply(function(){
							scope.$broadcast('takeSnapshot');
						});
					};
      		scope.bubble.expandAt(0, 0, takeSnapshot, null);
      		scope.bubble.playAnimationQueue();
      		
      		NetworkData.initializationComplete = true;
      	});
			});
			scope.$on('clearSelfStream', function(){
				// UNDER A $WATCH, therefore $apply is already running
				// scope.$apply(function(){
					easyrtc.clearMediaStream($video[0]);
				// });
			});
			scope.$on('setDisplayName', function(e, displayName){
				var nameDOM = element[0].querySelector('.display-name');
				nameDOM.innerHTML = displayName;
			});
			scope.$on('sendCurrentSnapshot', function(e, userRequesting){
				var data = snapshotCanvas.toDataURL();
				console.log('sending new user first snapshot');
				easyrtc.sendData(userRequesting, "newSnapshot", data);
			});

			scope.$on('toggleDoNotDisturb', function(){
				globalDoNotDisturb = !globalDoNotDisturb;
				NetworkData.broadcastObject(globalDoNotDisturb, "setDoNotDisturb");

				if(globalDoNotDisturb){
					scope.haltInterval = true;
				} else {
					scope.haltInterval = false;
				}
			});
			scope.$on('sendAvailability', function(e, id){
				easyrtc.sendData(id, "setDoNotDisturb", globalDoNotDisturb);

			});
			

		}
	};
}])
.directive('peerBubble', ['NetworkData', '$timeout', "$rootScope", function(NetworkData, $timeout, $rootScope){
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
					selectEvent = false,
					$video = element.find('video'),
					outgoingToUser = false;
			scope.snapshots = [];
			scope.callStatusLabel = '';
			scope.doNotDisturb = false;
			// preventCall is used to prevent a user from calling someone back if they
			// click the end call at the same time
			scope.preventCall = false;

			scope.callActionLabel;
			scope.$watch(function(){
				return scope.peer.callStatus;
			}, function(){
				switch(scope.peer.callStatus){
					case callStatus.NONE:
						if(scope.doNotDisturb){
							scope.callActionLabel = "NOTIFY USER";
						} else {
							scope.callActionLabel = "START CHAT";

						}
						break;
					case callStatus.CALLFROM:
						scope.callActionLabel = "JOIN CHAT";

						break;
					case callStatus.CALLTO:
					case callStatus.TWOWAY:

						scope.callActionLabel = "END CHAT";
						
						break;
				}
				
			});

			scope.$watch(function(){
				return scope.snapshots.length;
			}, function(newValue, oldValue){
				// if there are no snapshots,
				if(newValue == 0){
					easyrtc.sendData(scope.peer.id, 'getCurrentSnapshot', easyrtc.myEasyrtcid);
				}
			});

			var checkChannel = function(){
				// TODO: check connection of user and boot the user if necessary
				easyrtc.sendPeerMessage(scope.peer.id, 'check_channel', null,
					function() {
						// channel works, proceed as intended...
					},
					function(){
						console.log('Channel Error, checking roomlength');
						scope.$emit('checkRoomLength');
					}
				);
			};
			var performCall = function(){
				// TODO: toggle transmition decided based on current callStatus
				
				// obj stores information to send to other people in the room to help them determine manner
				// of transmission
				if(scope.peer.callStatus == callStatus.NONE ||
						scope.peer.callStatus == callStatus.CALLFROM){
					
					scope.$emit('informRoomAboutTransmition', scope.peer.id, true);
					scope.peer.toggleTransmition(true, scope, false);

				} else {
					scope.$emit('informRoomAboutTransmition', scope.peer.id, false);
					scope.peer.toggleTransmition(false, scope, false);
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
							drag: function(e){
								scope.$emit('checkDragDrop', e, scope.peer.id);
								if(isDragging) return;	// only need to set once
								scope.$apply(function(){
									scope.callActionLabel = '';
									isDragging = true;
									callEvent = selectEvent = false;
								});
								
							},
							stop: function(){
								scope.$apply(function(){
									isDragging = false;
								});
								
							}
						});
						// requests an initial snapshot for the user
						easyrtc.sendData(scope.peer.id, 'getCurrentSnapshot', easyrtc.myEasyrtcid);
						easyrtc.sendData(scope.peer.id, "getAvailability");
						if(NetworkData.transmitAll){
							easyrtc.sendData(scope.peer.id, 'callWhenReady', easyrtc.myEasyrtcid);
						}
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
					checkChannel();
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
					if(!scope.preventCall){
						callEvent = true;
					}
					TweenMax.set(statusIndicator, {zIndex:'10'});
				});
			
			}).bind('mouseup', function(){
				// no apply wrap needed here as toggleTransmition will end with apply
				scope.$apply(function(){
					if(callEvent || scope.callActionLabel == "ADD TO ROOM"){
						performCall();
					} else if(selectEvent){

					}
					// reset callActionLabel
					scope.callActionLabel = "START CHAT";

					TweenMax.set(statusIndicator, {zIndex:'3'});
					callEvent = selectEvent = false;
				});
					
			});
			/**************** ANGULAR EVENTS ******************/
			scope.$on('$destroy', function(){
				scope.bubble.resetAnimationQueue();
				scope.bubble.collapse();
				scope.bubble.playAnimationQueue();
				$(statusIndicator).draggable('destroy');
			});
			scope.$on(scope.peer.id+'newSnapshot', function(e, snapshot){
				
				if(scope.peer.callStatus == callStatus.CALLTO){
					// push snapshot to canvas
					$rootScope.$emit("appendSnapshot:"+scope.peer.id, snapshot);
				} else {
					// push snapshot to bubble
					scope.snapshots.push(snapshot);
				}
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
					scope.preventCall = true;
					
					$timeout(function(){
						scope.preventCall = false;
					}, 1000);
			    scope.peer.callStatus = callStatus.NONE;
			    scope.peer.evalCallState(scope);
			    easyrtc.clearMediaStream($video[0]);
				// });
			});
			scope.$on(scope.peer.id+"setDoNotDisturb", function(e, setBusy){
				$timeout(function(){
					scope.doNotDisturb = setBusy;
					if(scope.doNotDisturb){
						scope.callActionLabel = "NOTIFY USER";
					} else {
						scope.callActionLabel = "START CHAT";
					}
				});	
				
			})

			var updateRoomView = function(){
				// TODO: update the view for the room and render relevant canvases
				
				// handle whether or not to move personal view "inside room"
				if(scope.peer.callStatus == callStatus.TWOWAY ||
						scope.peer.callStatus == callStatus.CALLTO){
					if(outgoingToUser == false){
						outgoingToUser = true;
						NetworkData.outgoing++;
					}
				} else {
					if(outgoingToUser == true){
						NetworkData.outgoing--;
						outgoingToUser = false;
					}
				}
				// update NetworkData.interactingPeers object
				if(scope.peer.callStatus == callStatus.NONE){
					if(NetworkData.interactingPeers[scope.peer.id] != undefined){
						// remove canvas directive (video-display)
						delete NetworkData.interactingPeers[scope.peer.id];
					}
				} else {
					// create canvar directive or update info
					if(NetworkData.interactingPeers[scope.peer.id] == undefined){
						NetworkData.interactingPeers[scope.peer.id] = {
							id: scope.peer.id,
							callStatus : scope.peer.callStatus
						};
					} else {
						NetworkData.interactingPeers[scope.peer.id].callStatus = scope.peer.callStatus;
					}
				}


			};

			scope.$on(scope.peer.id+"newCallState", function(e, animation){
				// TODO: this function is the endpoint for all calls whether it's initiated
				//				by cliet or by peer
				//evalCallState should be wrapped by $apply already
				
				
				updateRoomView();

				scope.bubble.resetAnimationQueue();
				if(animation == "none"){
					// remove animations then unpin
					scope.bubble.addToAnimationQueue(animation);
					// // halt float inside togglePin as a callback
					// scope.bubble.togglePin(false, scope);	

					scope.bubble.expandAt(scope.bubble.x, scope.bubble.y);

				} else {
					// // stop floating, pin, then display animation
					// if(scope.bubble.shouldFloat){
					// 	scope.bubble.haltFloat(true);
					// }
					// scope.bubble.togglePin(true);
					// if(animation != "twoway"){
					// 	// if animation not two way, must reset to original bubble shape
					// 	scope.bubble.addToAnimationQueue();
					// }
					// scope.bubble.addToAnimationQueue(animation);

					scope.bubble.collapse();
					scope.bubble.haltFloat(false);
				}
				scope.bubble.playAnimationQueue();
			});
			scope.$on(scope.peer.id+"leaveRoom", function(){
				// TODO: animates bubble collapse right before DOM is removed
				var removeCallback = function(){
					// scope.$apply(function(){
					NetworkData.removePeer(scope.peer.id);
					// });
				};
				scope.bubble.resetAnimationQueue();
				scope.bubble.collapse(removeCallback);
				scope.bubble.playAnimationQueue();
			});
			scope.$on(scope.peer.id+"objectOverRoom", function(e, isOnTop){
				scope.$apply(function(){
					if(isOnTop){
						scope.callActionLabel = "ADD TO ROOM";
					} else {
						scope.callActionLabel = "";
					}
				});
			
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
					// scope.bubble.resetAnimationQueue();
					// scope.bubble.togglePin(false, scope);
					// scope.bubble.playAnimationQueue();
					scope.bubble.togglePin(false);
					var x = scope.bubble.statusIndicator.style.left;
					var y = scope.bubble.statusIndicator.style.top;
					scope.bubble.haltFloat(false, x, y);
				}
			});
			scope.$on(scope.peer.id+"performCall", function(){
				// performCall is a toggle call
				performCall();
			});
			scope.$on(scope.peer.id+"forceCall", function(e, turnOn, automatic){
				scope.peer.toggleTransmition(turnOn, scope, automatic);
			});
			$rootScope.$on(scope.peer.id+'checkChannel',function(){
				// invoked by status bar
				checkChannel();
			});
			/******************* CANVAS ROOTSCOPE EVENT LISTENERS ******************/
			$rootScope.$on("getSnapshot:"+scope.peer.id, function(){
				var snapshot = scope.snapshots[0];
				if(snapshot == null){
					console.log('Error: Problem retrieving snapshot from array');
				} else {
					$rootScope.$emit("appendSnapshot:"+scope.peer.id, snapshot);
				}
				
			});
			$rootScope.$on("getVideo:"+scope.peer.id, function(){
				$rootScope.$emit("setVideo:"+scope.peer.id, $video[0]);
			});
			$rootScope.$on('setActiveSpeaker:'+scope.peer.id, function(){
				if(scope.peer.callStatus == callStatus.TWOWAY){
					$rootScope.$emit('setVideo:active-speaker', $video[0], scope.peer.id);
				}
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
    	var newFade = new TweenMax.to(element,2, {opacity:1, ease: Power3.easeIn});
    	var animationComplete = function(){
      	scope.$apply(function(){
      	// 	//pop off
	      	while(scope.snapshots.length > 1){
	      		scope.snapshots.shift();
	      	}
	      	newFade.eventCallback('onComplete', null);
	      	newFade = null;
      	});
      	// scope.$emit('snapshotLoaded');
      };
      newFade.eventCallback("onComplete", animationComplete);
    }
  } 
})
.directive('inputCheck', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			element.bind('focusout',function(){
				scope.$apply(function(){
					if(element[0].value < 5 || isNaN(element[0].value)){
						element[0].value = 5;
						scope.snapshotInterval = 5;
					}
				});
			});
		}
	}
});
