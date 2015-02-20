// Load required modules
var http    = require("http"),              // http server core modul,
    express = require("express"),           // web framework external module
    // web socket external module
    io      = require("socket.io"),
    easyrtc = require("easyrtc");           // EasyRTC external modul,
    fs = require('fs'),
    util = require('util'),
    request = require('request'),
    path = require('path'),
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    CollectionDriver = require('./custom_dependencies/collectionDriver').CollectionDriver,
    FileDriver = require('./custom_dependencies/fileDriver').FileDriver;



/***************** EXPRESS CONFIGURATIONS *****************/
// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.set('port', process.env.PORT || 8080); 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'static')));

/***************** MONGO CONFIGURATIONS ******************/
var mongoHost = 'localHost'; //A
var mongoPort = 27017;
var fileDriver;
var collectionDriver;
 
var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); //B
mongoClient.open(function(err, mongoClient) { //C
  if (!mongoClient) {
      console.error("Error! Exiting... Must start MongoDB first");
      process.exit(1); //D
  }
  var db = mongoClient.db("TestImageDB");  //E
  fileDriver = new FileDriver(db);
  collectionDriver = new CollectionDriver(db); //F
});

// log server data (might be making server hold unnecessary amounts of data)
// log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
// log_stdout = process.stdout;
// console.log = function(d) { //
//   log_file.write(util.format(d) + '\n');
//   log_stdout.write(util.format(d) + '\n');
// };

/*************** EASYRTC CONFIGURATION *******************/
// setup TURN server by linking to XIRSYS
easyrtc.on("getIceConfig", function(connectionObj, callback) {
  
    // This object will take in an array of XirSys STUN and TURN servers
    var iceConfig = [];
 
    request.post('https://api.xirsys.com/getIceServers', {
        form: {
            ident: "tingche",
            secret: "3dc78335-02c8-49a7-a3db-70ef741281dd",
            domain: "162.209.63.24",
            application: "default",
            room: "default",
            secure: 1
        },
        json: true
    },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // body.d.iceServers is where the array of ICE servers lives
            iceConfig = null;
            iceConfig = body.d.iceServers;  
            console.log(iceConfig);
            callback(null, iceConfig);
        }
    });
});

// function for dealing with client sequence requests
var sequenceNum = 0,
		elementID = 0;
var onEasyrtcMsg = function(connectionObj, msg, socketCallback, next){
//    console.log("Message Received from client.");
    
    switch(msg.msgType) {
      case "getSequenceNum":
        socketCallback({msgType:'returnSessionNum', msgData:sequenceNum}); //nice
        if(sequenceNum == undefined || sequenceNum == null || sequenceNum > 9007199254740990){
          sequenceNum = 0;
        }

        sequenceNum++;
        next(null);
        break;
      case "getElementID":
        socketCallback({msgType:'returnElementID', msgData:elementID}); //nice
        if(elementID == undefined || elementID == null || elementID > 9007199254740990){
          elementID = 0;
        }
        elementID++;
        next(null);
        break;
      default:
        // Send all other message types to the default handler
        easyrtc.events.emitDefault("easyrtcMsg", connectionObj, msg, socketCallback, next);
    }
    
};

easyrtc.events.on("easyrtcMsg", onEasyrtcMsg);

/***************** FILE SERVER **************************/
// the "files" collection is treated differently than the generic "/:collection" routing
app.post('/db/files', function(req,res) {
  fileDriver.handleUploadRequest(req,res);
});

app.get('/db/files/:id', function(req, res) {
  fileDriver.handleGet(req,res);
});

app.delete('/db/files/:id', function(req, res) {
  fileDriver.delete(req,res);
});

app.get('/db/:collection', function(req, res) { //A
   var params = req.params; //B
   collectionDriver.findAll(req.params.collection, function(error, objs) { //C
          if (error) { res.send(400, error); } //D
          else { 
              if (req.accepts('html')) { //E
                  res.render('data',{objects: objs, collection: req.params.collection}); //F
              } else {
                res.set('Content-Type','application/json'); //G
                res.status(200).send(objs); //H
              }
         }
    });
});
 
app.get('/db/:collection/:entity', function(req, res) { //I
   var params = req.params;
   var entity = params.entity;
   var collection = params.collection;
   if (entity) {
       collectionDriver.get(collection, entity, function(error, objs) { //J
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //K
       });
   } else {
      res.send(400, {error: 'bad url', url: req.url});
   }
});

app.post('/db/:collection', function(req, res) { //A
    var object = req.body;
    var collection = req.params.collection;
    collectionDriver.save(collection, object, function(err,docs) {
          if (err) { res.send(400, err); } 
          else { res.send(201, docs); } //B
     });
});

app.put('/db/:collection/:entity', function(req, res) { //A
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
       collectionDriver.update(collection, req.body, entity, function(error, objs) { //B
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //C
       });
   } else {
       var error = { "message" : "Cannot PUT a whole collection" }
       res.send(400, error);
   }
});

app.delete('/db/:collection/:entity', function(req, res) { //A
    var params = req.params;
    var entity = params.entity;
    var collection = params.collection;
    if (entity) {
       collectionDriver.delete(collection, entity, function(error, objs) { //B
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //C 200 b/c includes the original doc
       });
   } else {
       var error = { "message" : "Cannot DELETE a whole collection" }
       res.send(400, error);
   }
});


/***************** SERVER LISTEN AND START ******************/
// Start Express http server on port 8080
var webServer = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level":1, 'destroy buffer size': Infinity});
//var socketServer = io.listen(webServer, {"log level":1});

// Make Easyrtc app listen on opened ports
var rtc = easyrtc.listen(app, socketServer);


