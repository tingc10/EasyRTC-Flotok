// SUMMARY: Definition for Group Class
// DEPENDENCY: easyrtc-network
function Group(easyrtcid, isPrivate){
	this.owner = easyrtcid;
	this.users = {};					// the users in the group, value stored is whether or not they are connected to group
	this.users[easyrtcid] = false;		// add owner to group and set connected bool to false
	this.live = false;
	this.privacy = isPrivate;
	this.createTime = new Date();
	this.count = 1;
};
var selectingGroup = null;



Group.prototype.addToGroup = function(easyrtcid) {
	// TODO: Add the user to the current group
	//		 if the group is already live, then broadcast to room
	this.users[easyrtcid] = false;
	this.count++;
};

Group.prototype.removeFromGroup = function(easyrtcid){
	// TODO: Remove user from current group by deleting property
	delete this.users[easyrtcid];
	this.count--;
};

Group.prototype.getGroupID = function(){
	// TODO: return the group ID which is the concatenation of the ownerID and the creationtime
	
	return this.owner+this.createTime;

};

// Group.prototype.toggleGroupStream = function(turnOn){
// 	// TODO: check the users in the group and enable audio on all users
// 	// in the group
// 	// var groupID = this.owner+this.createTime;
// 	for(easyrtcid in this.users){
// 		// easyrtc.sendData(easyrtcid, "newSnapshot", data);

// 	}
// };



