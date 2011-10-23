#!/usr/bin/env node

var couchapp = require('./main.js')
  , watch = require('watch')
  , path = require('path')
  , fs = require('fs')
  ;

function abspath (pathname) {
  if (pathname[0] === '/') return pathname
  return path.join(process.env.PWD, path.normalize(pathname));
}

function copytree (source, dest) {
  watch.walk(source, function (err, files) {
    for (i in files) {
      (function (i) {
        if (files[i].isDirectory()) {
          try {
            fs.mkdirSync(i.replace(source, dest), 0755)
          } catch(e) {
            console.log('Could not create '+dest)
          }
        } else {
          fs.readFile(i, function (err, data) {
            if (err) throw err;
            fs.writeFile(i.replace(source, dest), data, function (err) {
              if (err) throw err;
            });
          })
        } 
      })(i); 
    }
  })
}

function boiler (app) {
  if (app) {
    try { fs.mkdirSync(path.join(process.env.PWD, app)) }
    catch(e) {};
  }
  app = app || '.'

  copytree(path.join(__dirname, 'boiler'), path.join(process.env.PWD, app));
  
  
}


if (process.mainModule && process.mainModule.filename === __filename) {
  var node = process.argv.shift()
    , bin = process.argv.shift()
    , command = process.argv.shift()
    , app = process.argv.shift()
    , couch = process.argv.shift()
    ;

  if (command == 'help' || command == undefined) {
    console.log(
      [ "couchapp -- utility for creating couchapps" 
      , ""
      , "Usage:"
      , "  couchapp <command> app.js http://localhost:5984/dbname"
      , ""
      , "Commands:"
      , "  push   : Push app once to server."
      , "  sync   : Push app then watch local files for changes."
      , "  boiler : Create a boiler project."
      ]
      .join('\n')
    )
    process.exit();
  }
  
  if (command == 'boiler') {
    boiler(app);
  } else {
    couchapp.createApp(require(abspath(app)), couch, function (app) {
      if (command == 'push') app.push()
      else if (command == 'sync') app.sync()

    })
  } 
}


exports.boilerDirectory = path.join(__dirname, 'boiler')

