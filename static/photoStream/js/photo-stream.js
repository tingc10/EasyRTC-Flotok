function getImage(id, creation){
  var imageWrapper = document.createElement('div');
  var creationLabel = document.createElement('div');
  var reformatCreation = moment(creation).format('MMMM Do YYYY, h:mm:ss a');
  $(creationLabel).addClass('image-label').html(reformatCreation);
  
  var img = $(document.createElement('img')).attr('src', '/db/files/'+id).load(function() {
      if (!this.complete 
          || typeof this.naturalWidth == "undefined" 
          || this.naturalWidth == 0 ){
        alert('broken image!');
      } else {
        $(imageWrapper).append(img);
        $("#img-container").prepend(imageWrapper);
        $(imageWrapper).addClass('image-wrapper').append(creationLabel);

      }
  });
};

$(function(){
  var url = "/db/files";
  $.ajax({
    type : "GET",
    url: url,
    headers: { 
      Accept : "application/json",
      "Content-Type": "application/json"
    },
    success: function(response){
      for(var i = 0; i < response.length; i++){
        var obj = response[i];
        getImage(obj._id, obj.created_at);
      }
    },
    error: function(error) {
       console.log("an error occured on get");
    }
    
  });
});