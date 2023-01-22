"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
///server.js

var http = require('http'),
  fs = require('fs'),
  url = require('url'),
  events = require('events'),
  express = require('express'),
  fetch = require('node-fetch'),
  recaptcha = require('recaptcha-v2'),
  React = require('react'),
  ReactDOM = require('react-dom'),
  jQuery = require('jquery'),
  ejs = require('ejs'),
  WebSocket = require('ws'),
  socketIO = require('socket.io'),
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest,
  nodemailer = require('nodemailer'),
  querystring = require('querystring'),
  jsonrepair = require('jsonrepair'),
  compression = require('compression'),
  helmet = require('helmet'),
  cors = require('cors'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  //for express body json and url parsing
  FileAPI = require('file-api'),
  // busboy = require('connect-busboy'),
  // bodyParser = require('body-parser'), //for express body json and url parsing
  multer = require('multer'),
  //for express body multipart form parsing
  path = require('path');
var MY = require(path.resolve('./myNodeModules/myHelperFunctions.js'));
var MAINVARS = require(path.resolve('./src/js/myMainVariables.js'));

//fileAPI
var File = FileAPI.File;
var FileList = FileAPI.FileList;
var FileReader = FileAPI.FileReader;
var FileProcess = {
  nodePath: '',
  filePath: '',
  args: []
};
var MySystem = {
  test: false,
  dev: false
};

///PRE SERVER METHODS
//used to by pass the JSON.stringify TypeError by changing it to a string
BigInt.prototype.toJSON = function () {
  return this.toString();
};
process.argv.forEach(function (val, index, array) {
  switch (index) {
    case 0:
      FileProcess.nodePath = val;
      MY.clog("NodePath: ".concat(FileProcess.nodePath));
      break;
    case 1:
      FileProcess.filePath = val;
      MY.clog("FilePath: ".concat(FileProcess.filePath));
      break;
    default:
      FileProcess.args.push(String(val).toLowerCase());
      break;
  }
});
if (FileProcess.args.length > 0) {
  MY.clog(FileProcess.args);
  FileProcess.args.forEach(function (arg, index) {
    switch (arg) {
      case '-test':
        MySystem.test = true;
        break;
      case '-dev':
        MySystem.dev = true;
        break;
      default:
        MY.clog("Invalid argument:\t".concat(arg));
        break;
    }
  });
}

///OTHER VARS
var defaultPort = MySystem.test || MySystem.dev ? 8081 : process.env.PORT || 8081;
var PORT = defaultPort;
var servers = [];
var startTime = new Date();

///EXPRESS

var syncSeconds = 60;
var syncElapsed = 0;
var syncTimerFlag = false;
// var MyRecaptcha = MAINVARS.MyRecaptcha;
var app = express();
var server = app.listen(defaultPort, function () {
  console.log('Server started! @ ' + startTime);
  switchPort(this, PORT);
});

///SOCKET.IO
var io = new socketIO.Server(server);

// var wsServer = new WebSocket.Server({ server });
var myClients = [];
var myUsers = {};

///EXPRESS APP///

//SERVE A STATIC PAGE IN THE PUBLIC DIRECTORY
app.use(express["static"]("public"));
var multerUpload = multer();
app.use(bodyParser.text());
app.use(bodyParser.json());
// app.use(express.bodyParser());
// app.use(express.json()) // for parsing application/json
// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cors());

// app.use(morgan('combined'));

app.post('/api', function (req, res) {
  var reqData = req.body;
  if (MY.isString(reqData) && MY.isJSON(reqData)) {
    reqData = JSON.parse(reqData);
  }
  if (!MY.isObject(reqData)) {
    //send err
    res.send('eat ass');
  }
  // res.set('Content-Type', 'text/plain');
  res.send('WHO ASKED??!!');
});
var ExpressApp = {
  routes: [{
    route: "/",
    render: "public/index.html",
    status: 200,
    preRender: function preRender(req, res, data) {}
  }, {
    route: "*",
    render: "public/index.html",
    status: 404,
    preRender: function preRender(req, res, data) {}
  }],
  defaultURL: !MySystem.test ? "".concat(MAINVARS.metadata.url) : "https://localhost:".concat(PORT),
  routeDirectory: "./dist/",
  meta: MAINVARS.metadata
};
ExpressApp.routes.forEach(function (val) {
  app.set("views", __dirname);
  app.use(express["static"](path.join(__dirname, 'public')));
  app.get(val.route, function (req, res) {
    res.status(val.status);
    // res.setHeader('Accept-Encoding','gzip');

    var urlParams = MY.parseURLParams(req.url);
    var viewData = {
      local: {}
    };
    if (urlParams) {
      viewData.local.urlParams = urlParams;
    }
    viewData.local = Object.assign(viewData.local, ExpressApp.meta);
    viewData.local.url = MySystem.test || MySystem.dev ? "".concat(ExpressApp.meta.url || "https://".concat(req.headers.host).concat(req.url)) : "https://".concat(req.headers.host).concat(req.url);
    var renderPath = ExpressApp.routeDirectory + val.render;
    // var renderPath = val.render;
    if (val.preRender) {
      val.preRender(req, res, viewData);
    }
    res.sendFile(path.resolve(renderPath));
    // fs.readFile(renderPath, 'utf8', function(err, filedata){
    //     if(err){
    //         throw err;
    //     }

    //     if(val.postRender){
    //         val.postRender(req,res,filedata);
    //     }

    // });
  });
});

///SERVER METHODS
function getBase64(_x) {
  return _getBase.apply(this, arguments);
}
function _getBase() {
  _getBase = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(file) {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt("return", new Promise(function (res, rej) {
              var reader = new FileReader();
              reader.onload = function () {
                return res(reader.result);
              };
              reader.onerror = function (err) {
                rej(err);
              };
              reader.readAsDataURL(file);
            }));
          case 1:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getBase.apply(this, arguments);
}
function switchPort(s, p) {
  s.close();
  syncTimerFlag = true;
  s.listen(p, function () {
    console.log('Server is listening on port ' + p);
  });
  myClients = [];
  myUsers = {};
  syncTimerFlag = false;
  syncTimer(syncSeconds);
}
function syncTimer(seconds) {
  if (seconds <= 0.01) seconds = 10;
  if (seconds >= 360) seconds = 359.99;
  if (!syncTimerFlag) {
    syncTimerFlag = true;
    var tS = setTimeout(function () {
      syncTimerFlag = false;
      // updateClients();
      // MY.clog('Synced Server : '+new Date());
      syncElapsed += seconds;
      syncTimer(seconds);
    }, Math.floor(seconds * 1000));
  }
}
function AJAX(jsonData, callback, url) {
  var req = new XMLHttpRequest();
  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      if (req.status == 200) {
        var json = JSON.parse(req.responseText);
        callback(json);
      }
    } else {
      console.log(req.readyState);
    }
  };
  req.open("GET", url, true);
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(JSON.stringify(jsonData));
}
function getRequestURL(req) {
  var _req$headers, _url$parse;
  var hostname = req === null || req === void 0 ? void 0 : (_req$headers = req.headers) === null || _req$headers === void 0 ? void 0 : _req$headers.host;
  var pathname = (_url$parse = url.parse(req === null || req === void 0 ? void 0 : req.url)) === null || _url$parse === void 0 ? void 0 : _url$parse.pathname;
  if (!hostname || !pathname) return null;
  // console.log(`http://${hostname}${pathname}`);
  return "http://".concat(hostname).concat(pathname);
}
function toJsonString(data) {
  if (data !== undefined) {
    var intCount = 0,
      repCount = 0;
    var json = JSON.stringify(data, function (_, v) {
      if (typeof v === 'bigint') {
        intCount++;
        return "".concat(v, "#bigint");
      }
      return v;
    });
    var res = json.replace(/"(-?\d+)#bigint"/g, function (_, a) {
      repCount++;
      return a;
    });
    if (repCount > intCount) {
      // You have a string somewhere that looks like "123#bigint";
      throw new Error("BigInt serialization conflict with a string value.");
    }
    return res;
  }
}
function toObject() {
  return JSON.parse(JSON.stringify(this, function (key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
  } // return everything else unchanged
  ));
}