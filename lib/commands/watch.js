var argParse, doPush, fs, kansorc, logger, packages, path, push, pushArgs, pushSettings, sources, utils, _;

fs = require('fs');

path = require('path');

_ = require('underscore');

utils = require('../utils');

packages = require('../packages');

logger = require('../logger');

kansorc = require('../kansorc');

push = require('./push');

argParse = require('../args').parse;

pushSettings = null;

pushArgs = null;

sources = [];

function ignore(file) {
  // ignore hidden files, kanso.json, and packages directory
  return /^\.|~$|^packages$|^kanso.json$/.test(path.basename(file));
};

function onDirChange(dir) {
  return fs.readdir(dir, function(err, files) {
    if (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      return typeof watcher !== "undefined" && watcher !== null ? watcher.close() : void 0;
    } else {
      return _.each(files, function(file) {
        file = path.join(dir, file);
        if (!(_.include(sources, file) || ignore(file))) {
          sources.push(file);
          return watchFile(file);
        }
      });
    }
  });
};

function watchDir(dir) {
  var watcher;
  return watcher = fs.watch(dir, function() {
    return onDirChange(dir);
  });
};

doPush = _.debounce(function() {
  return push.run(pushSettings, pushArgs);
}, 100);

function watchFile(file) {
  var prevStats, watcher;
  prevStats = null;
  watcher = null;
  function onWatchError(e) {
    if (e.code === 'ENOENT') {
      if (!_.include(sources, file)) {
        return;
      }
      try {
        return rewatch();
      } catch (e) {
        return sources = _.without(sources, file);
      }
    } else {
      throw e;
    }
  }
  function onFileChange() {
    return fs.stat(file, function(err, stats) {
      if (err) {
        return onWatchError(err);
      } else if (prevStats && stats.size === prevStats.size && stats.mtime.getTime() === prevStats.mtime.getTime()) {
        return rewatch();
      } else {
        prevStats = stats;
        return doPush();
      }
    });
  }
  function rewatch() {
    if (watcher != null) {
      watcher.close();
    }
    return watcher = fs.watch(file, onFileChange);
  }
  try {
    fs.stat(file, function(err, stats) {
      if (stats.isDirectory()) {
        watchDir(file);
        return onDirChange(file);
      } else {
        return watcher = fs.watch(file, onFileChange);
      }
    });
  } catch (e) {
    onWatchError(e);
  }
  doPush();
};

_.extend(exports, {
  run: function(settings, args) {
    var dir, positional;
    pushSettings = settings;
    pushArgs = args;
    positional = argParse(args, {}).positional;
    dir = positional[0] || '.';
    return path.exists(dir, function(exists) {
      var url;
      if (!exists) {
        dir = process.cwd();
        url = positional[0];
      }
      dir = utils.abspath(dir);
      return kansorc.extend(settings, "" + dir + "/.kansorc", function(err, settings) {
        var env;
        if (err) {
          return logger.error(err);
        }
        if (positional.length > 1) {
          url = positional[1];
        } else if (positional.length && !exists) {
          url = positional[0];
        }
        env = utils.argToEnv(settings, url);
        watchDir(dir);
        onDirChange(dir);
      });
    });
  },
  summary: 'Watches a directory. On change pushes the project to a CouchDB database.',
  usage: "kanso watch [PATH] [DB]\n\nParameters:\n  PATH:    Path to project directory to watch. (defaults to \".\")\n  DB:      The CouchDB database to upload the app to, will use \"default\"\n           env set in .kansorc if none provided and .kansorc exists:w\n\n  Options:\n    --minify    Compress CommonJS modules attachment using UglifyJS\n    --open      Open the app URL in the browser after pushing\n    --baseURL   Add a custom baseURL property to the kanso.json values\n    --id        Specify a custom document id for the generated app,"
});
