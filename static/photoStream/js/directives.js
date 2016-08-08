angular.module('photoStream.directives', [])
.directive('addTag', ["$http", function($http){
	return {
		restrict:"E",
		scope: {
			imgId: "@"
		},
		template:"<input type='text' ng-model='tagName' placeholder='Tag Name' /><button ng-click='addTag()'>Add Tag</button>",
		link: function(scope, elemenet, attrs){
			
			scope.addTag = function(){
				$http({
					method: "PUT",
					headers: {
			      "Content-Type": "application/json"
			    },
					url: "/db/files/" + scope.imgId,
					data: {newTag:scope.tagName}
				})
				.success(function(data){
					console.log("yay tag created");
				})
				.error(function(data){
					console.log("boo tag failed to upload")
				});
			};
		}
	};
}]);