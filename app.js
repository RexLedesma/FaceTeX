require('dotenv').config()

var http = require('http');
var fs = require('fs');
var login = require('facebook-chat-api');
var mjAPI = require("mathjax-node-svg2png");

var port = process.env.PORT || 5000;
mjAPI.config({MathJax: {SVG: {font: "TeX"}}});
mjAPI.start();

http.createServer(function(req, res) {
  console.log("ping");
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end("");
}).listen(process.env.PORT || 5000);

// only use this if you are on free tier on heroku to keep bot from idling
setInterval(function() {
  http.get((HEROKU_INSTANCE), function(res) {
    console.log("pong");
  });
}, 300000);

function parseLatexCommand(inputString) {
    var parse = new RegExp(/\$(.*)\$/);
    parse.test(inputString);

    return RegExp.$1;
}

login({
  email: process.env.FB_USERNAME,
  password: process.env.FB_PASSWORD
}, function callback(err, api) {
  if (err) return console.error(err);
  api.setOptions({listenEvents: true});
  var interpret = api.listen(function(err, event) {
    if (err) return console.error(err);

    if (event.type === "message") {
        let LaTeX = parseLatexCommand(event.body);

        console.log('Processing: ' + LaTeX);

          mjAPI.typeset({
            math: LaTeX,
            format: "inline-TeX", // "inline-TeX", "MathML"
            png: true,
            svg: true,
            dpi: 144,
            ex: 50,
            width: 100
          }, function(data) {
            if (!data.errors) {
              var base64Data = data.png.replace(/^data:image\/png;base64,/, '');
              var filename = Date.now() + '.png';

              fs.writeFile(filename, base64Data, 'base64', function(err) {
                if (err) throw err;

                var msg = {
                    attachment: fs.createReadStream(filename)
                };
                console.log('writing image');
                api.sendMessage(msg, event.threadID, (err, messageInfo) => {
                    fs.unlink(filename, (err) => {
                        console.log('Unlinked file: ' + filename);
                    })
                });

              });
            }
          });

        api.markAsRead(event.threadID, function(err) {
          if (err) console.log(err);
        });
      }
    });
});
