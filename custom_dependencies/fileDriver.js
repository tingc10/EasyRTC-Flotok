var ObjectID = require('mongodb').ObjectID, 
    fs = require('fs'),
    gm = require('gm'),
    events = require('events'),
    util = require('util'); // fileserver to read and write to disk


FileDriver = function(db) { //2
  events.EventEmitter.call(this);
  this.db = db;
};
util.inherits(FileDriver, events.EventEmitter);

FileDriver.prototype.getCollection = function(callback) {
  // looks through "files" collection
  this.db.collection('files', function(error, file_collection) { 
    if( error ) 
      callback(error);
    else 
      callback(null, file_collection);
  });
};

//find a specific file
FileDriver.prototype.get = function(id, callback) {
    this.getCollection(function(error, file_collection) { //1
        if (error) 
          callback(error);
        else {
          var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$"); //2
          if (!checkForHexRegExp.test(id)) 
            callback({error: "invalid id"});
          else {
            file_collection.findOne({'_id':ObjectID(id)}, function(error,doc) { //3
                if (error) 
                  callback(error);
                else 
                  callback(null, doc);
            });
          }
        }
    });
};

// request handler used by the Express router
// fetches the file entity from the database via the supplied id
FileDriver.prototype.handleGet = function(req, res) { //1
    var fileId = req.params.id;   // id supplied by request
    if (fileId) {
        this.get(fileId, function(error, thisFile) { //2
            if (error) { 
              res.send(400, error); 
            } else {
              if (thisFile) {
                 var filename = fileId + thisFile.ext; //3
                 var filePath = __dirname + '/uploads/'+ filename; //4
                 res.sendFile(filePath); //5
              } else 
                res.send(404, 'file not found');
            }
        });        
    } else {
	    res.send(404, 'file not found');
    }
};

//save new file
FileDriver.prototype.save = function(obj, callback) { //1
  this.getCollection(function(error, the_collection) {
    if( error ) 
      callback(error);
    else {
      obj.created_at = new Date();
      the_collection.insert(obj, function() {
        callback(null, obj);
      });
    }
  });
};

// file wrapper for save function to return id after creating new file entry
FileDriver.prototype.getNewFileId = function(newobj, callback) { //2
	this.save(newobj, function(err,obj) {
		if (err) { 
      callback(err); 
    } else { 
      callback(null,obj._id); 
    } //3
	});
};

// creates a new object in the file collection
FileDriver.prototype.handleUploadRequest = function(req, res) {
    var self = this;
    var phoneId = req.params.phoneId;
    var shouldAutoOrient = false;
    var ctype = req.get("content-type"); //2
    // tries to guess the files extension based on content-type; ie image/png would have .png
    var ext = ctype.substr(ctype.indexOf('/')+1);
    if (ext) {
      ext = '.' + ext; 
    } else {
      ext = '';
    }
    var newObj = {
      'content-type':ctype, //saves the content-type and extension
      'ext':ext
    };
    if(phoneId != undefined || phoneId == null){
      newObj.phoneId = phoneId;
      shouldAutoOrient = true;
    }
    this.getNewFileId(newObj, function(err,id) {
        if (err) { 
          res.send(400, err); 
        } else { 	         
          var filename = id + ext; //5
          // __dirname is the Node.js executing script's directory
          filePath = __dirname + '/uploads/' + filename; 

          var writable = fs.createWriteStream(filePath); // output stream
          req.pipe(writable); // request is a readStream so you can dump into the writeStream of writable
          // callback on readStream's end event occurs when the pipe operation is complete
          req.on('end', function (){
            
            res.send(201,{'_id':id});
            // auto orients the photo by rotating the image 90 degrees CW
            if(shouldAutoOrient){
              gm(filePath).rotate('black', 90).write(filePath, function (err) {
                if (!err){ 
                  self.emit('idReady', id);
                  console.log(' hooray! ');
                } else {
                  console.log(err);
                }
              });
            }
          });               
          writable.on('error', function(err) { //10
            res.send(500,err);
            file_collection.remove({
              '_id': ObjectID(fileId)
            }, null);
          });
        }
    });
};

//delete a specific object
FileDriver.prototype.delete = function(req, res) {
  var fileId = req.params.id;   // id supplied by request
  console.log("dealing with delete");
  this.getCollection(function(error, file_collection) { //1
      if (error) 
        res.send(400, error);
      else {
          file_collection.remove({
            '_id': ObjectID(fileId)
          }, function(error,doc) { //B
            if (error) 
              res.send(404, error);
            else {
              var pathOfFile = __dirname + '/uploads/' + fileId + '.png';
              fs.unlink(pathOfFile, function (err) {
                if (err) {
                  console.log('could not delete ' + pathOfFile, err);
                } else {
                  console.log('successfully deleted ' + pathOfFile);
                }
                res.send(201, {message: 'deleted record'});
              });
              
              
            }
          });
      }
  });
};

FileDriver.prototype.addTag = function(id, callback){
  
};

FileDriver.prototype.removeTag = function(id, callback){

};

FileDriver.prototype.getCollectionWithTag = function(){

};


exports.FileDriver = FileDriver;
