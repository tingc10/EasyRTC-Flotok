(function(){
  var socket = io.connect('http://162.209.63.24');
  var app = angular.module('photoStream', []);
  var imgContainer = document.getElementById('img-container');
  
  app.controller('PhotoController', ['$http', '$timeout',function($http, $timeout){
    var loader = this;
    loader.photos = [];
    loader.deleteId = '';
    loader.toastMessage = '';
    loader.deleteImage = function(id){
      // 
      loader.deleteId = id;
    };
    socket.on('newImage', function(imageId){
      $http({
        method: 'GET',
        url: '/db/files/' + imageId + '/json',
        headers: {
          Accept : "application/json",
          'Content-Type': "application/json"
        }
      }).success(function(data){
        // console.log(data);
        loader.photos.push(data);
      }).error(function(data){
        console.log('new image could not be loaded', error);
      });
    });
    loader.confirmDelete = function(shouldDelete){
      var tmpId = loader.deleteId;
      loader.deleteId = '';
      if(shouldDelete){
        loader.toastMessage = "Deleting Photo...";
        $http({
          method: 'DELETE',
          url: '/db/files/' + tmpId
        }).success(function(){
          loader.toastMessage = "Photo Deleted";
          $timeout(function(){
            loader.toastMessage = '';
            var deletedPhoto = document.getElementById(tmpId);
            imgContainer.removeChild(deletedPhoto);
          }, 1000);
        }).error(function(data){
          loader.toastMessage = "Error Deleting Photo";
          console.log(data);
          $timeout(function(){
            loader.toastMessage = '';
          }, 1000);
        });
      }
      

    }
    $http({
      method: 'GET',
      url: '/db/files',
      headers: {
        Accept : "application/json",
        'Content-Type': "application/json"
      }
    }).success(function(data){
      // console.log(data);
      loader.photos = data;
    }).error(function(data){
      alert("Sorry! Something went wrong, could not load images...");
    });
    
  }]);
  // function getImage(id, creation){
  //   var imageWrapper = document.createElement('div');
  //   var creationLabel = document.createElement('div');
  //   var reformatCreation = moment(creation).format('MMMM Do YYYY, h:mm:ss a');
  //   $(creationLabel).addClass('image-label').html(reformatCreation);
    
  //   var img = $(document.createElement('img')).attr('src', '/db/files/'+id).load(function() {
  //       if (!this.complete 
  //           || typeof this.naturalWidth == "undefined" 
  //           || this.naturalWidth == 0 ){
  //         alert('broken image!');
  //       } else {
  //         $(imageWrapper).append(img);
  //         $("#img-container").prepend(imageWrapper);
  //         $(imageWrapper).addClass('image-wrapper').append(creationLabel);

  //       }
  //   });
  // };
})();