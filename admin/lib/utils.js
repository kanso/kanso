var db = require('kanso/db');

exports.capitalize = function (str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
};

exports.typeHeading = function (type) {
    // capitalize and make plural
    // TODO: add django admin panel for custom setting of plurals
    return exports.capitalize(type) + 's';
};


/**
 * This code is adapted (brutally hacked apart) from share/server/util.js from
 * CouchDB, as this code is not exposed for use within list and show functions.
 */

var sandbox = {};

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

var resolveModule = exports.resolveModule = function(names, mod, root) {
  if (names.length == 0) {
    if (typeof mod.current != "string") {
      throw ["error","invalid_require_path",
        'Must require a JavaScript string, not: '+(typeof mod.current)];
    }
    return {
      current : mod.current,
      parent : mod.parent,
      id : mod.id,
      exports : {}
    };
  }
  // we need to traverse the path
  var n = names.shift();
  if (n == '..') {
    if (!(mod.parent && mod.parent.parent)) {
      throw ["error", "invalid_require_path", 'Object has no parent '+JSON.stringify(mod.current)];
    }
    return resolveModule(names, {
      id : mod.id.slice(0, mod.id.lastIndexOf('/')),
      parent : mod.parent.parent.parent,
      current : mod.parent.parent.current
    });
  } else if (n == '.') {
    if (!mod.parent) {
      throw ["error", "invalid_require_path", 'Object has no parent '+JSON.stringify(mod.current)];
    }
    return resolveModule(names, {
      parent : mod.parent.parent,
      current : mod.parent.current,
      id : mod.id.slice(0, mod.id.lastIndexOf('/')),
    });
  } else if (root) {
    mod = {current : root};
  }
  if (!mod.current[n]) {
    throw ["error", "invalid_require_path", 'Object has no property "'+n+'". '+JSON.stringify(mod.current)];
  }
  return resolveModule(names, {
    current : mod.current[n],
    parent : mod,
    id : mod.id ? mod.id + '/' + n : n
  });
};

var Couch = exports.Couch = {
  module_cache: {},
  compileFunction : function(source, ddoc) {    
    if (!source) throw(["error","not_found","missing function"]);
    try {
        if (ddoc) {
          var require = function(name, module) {
            module = module || {};
            var newModule = resolveModule(name.split('/'), module, ddoc);
            if (!Couch.module_cache.hasOwnProperty(newModule.id)) {
                // create empty exports object before executing the module,
                // stops circular requires from filling the stack
                Couch.module_cache[newModule.id] = {};
                var s = "function (module, exports, require) { " + newModule.current + " }";
                try {
                  var func = eval('(' + s + ')');
                  func.apply(sandbox, [newModule, newModule.exports, function(name) {
                    return require(name, newModule);
                  }]);
                } catch(e) { 
                  throw ["error","compilation_error","Module require('"+name+"') raised error "+e.toString()]; 
                }
                Couch.module_cache[newModule.id] = newModule.exports;
            }
            return Couch.module_cache[newModule.id];
          };
          sandbox.require = require;
        }
        var functionObject = eval('(' + source + ')', sandbox);
    } catch (err) {
      throw(["error", "compilation_error", err.toString() + " (" + source + ")"]);
    };
    if (typeof(functionObject) == "function") {
      return functionObject;
    } else {
      throw(["error","compilation_error",
        "Expression does not eval to a function. (" + source.toString() + ")"]);
    };
  }
};

exports.appRequire = function (ddoc, path) {
    return exports.Couch.compileFunction('function () {\n' +
    '    return require("' + path + '");\n' +
    '}', ddoc)();
};

// used to store downloaded design_docs
exports.design_docs = {};

exports.getDesignDoc = function (name, callback) {
    if (exports.design_docs[name]) {
        return callback(null, exports.design_docs[name]);
    }
    db.getDoc('_design/' + name, {}, function (err, ddoc) {
        if (err) {
            return callback(err);
        }
        exports.design_docs[name] = ddoc;
        return callback(null, exports.design_docs[name]);
    });
};
