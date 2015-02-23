var EventEmitter = require('events').EventEmitter;
var util = require('util');
var assert = require('assert');
var Transform = require('stream').Transform;
var disect = require('disect');

function noop(){}

function Tokenizer (check_token_cb, options) {
    if(!(this instanceof Tokenizer)) {
      return new Tokenizer(check_token_cb);
    }

    Transform.call(this, options);
    this._readableState.objectMode = true;
    this._buffered = ""; // we buffer untokenized data between writes
    this._regexes = []; // should contain objects 
                        // with regex[RegExp] and type[String]
    this._ignored = {}; // a hash of ignored token types
                        // these will be parsed but not emitted
    this._checkToken = check_token_cb || noop;
}
util.inherits(Tokenizer, Transform);

Tokenizer.prototype._transform = function _transform(chunk, encoding, callback) {
  chunk = chunk.toString();
  var self = this;
  process.nextTick(function () {
    try {
      var index = 0, step = 64;
      while(index < chunk.length) {
        self._tokenize(chunk.substr(index, step));
        index += step;
      }
      callback();
    } catch(e) {
      callback(e);
    }
  })
};

Tokenizer.prototype._getMatchingRule = function _getMatchingRule(str) {
  for (var i = 0; i < this._regexes.length; ++i) {
      if(this._regexes[i].regex.test(str)) {
        return this._regexes[i];
      }
  }
  return null;
};

Tokenizer.prototype._tokenize = function _tokenize(data, nobuffer) {
    var regexes = this._regexes;
    // in case we buffered data on previous writes
    data = this._buffered + data;
    this._buffered = '';
    if(!data.length) {
      return;
    }

    var self = this;
    var maxIndex = disect(0, data.length, function (index) {
      var buf = data.substring(0, index + 1);
      return self._getMatchingRule(buf) === null;
    });

    if(maxIndex === 0) {
      // no match found
      throw new SyntaxError('could not tokenize ' + JSON.stringify(data));
    }
    else if (maxIndex === data.length && !nobuffer) {
      // the whole string is matching
      this._buffered = data;
      return;
    }
    else {
      // some substring is matching
      var str = data.substring(0, maxIndex);
      var rule = this._getMatchingRule(str);
      if(!rule) {
        throw new Error('wut ?');
      }
      this._gotToken(str, rule);
      this._tokenize(data.substring(maxIndex), nobuffer);
    }
};

Tokenizer.prototype._flush = function _flush(callback) {
  var self = this;
  process.nextTick(function () {
    try {
      self._tokenize('', true);
      callback();
    } catch(e) {
      callback(e);
    }
  });
};

var Token = function String (content, type) {
  this.content = content;
  this.type = type;
  this.toString = function () {
    return this.content.toString();
  }
}
util.inherits(Token, String);
Token.prototype.valueOf = function valueOf() {
  return this.content;
};

Tokenizer.prototype._gotToken = function _gotToken(str, rule) {
    // notify the token checker
    var type = this._checkToken(str, rule) || rule.type;
    if(this._ignored[type]) return;
    var token = new Token(str, type);

    this.push(token);

    this.emit('token', token, type);
};

Tokenizer.prototype.addRule = function addRule(regex, type) {
    // this is useful for built-in rules
    if(!type) {
      if(Array.isArray(regex)) {
        return this.addRule(regex[0], regex[1]);
      }
      else if(regex) {
        return this.addRule(Tokenizer[regex]);
      }
      else {
        throw new Error('No parameters specified');
      }
    }
    assert.ok((regex instanceof RegExp) || (typeof regex === 'function'));
    assert.equal(typeof type, 'string');
    this._regexes.push({regex:regex,type:type});
};

/**
 * set some tokens to be ignored. these won't be emitted
 */
Tokenizer.prototype.ignore = function ignore(ignored) {
    if(typeof ignore === 'array') {
        for (var i = 0; i < ignored.length; ++i) {
            this.ignore(ignored[i]);
        }
        return;
    }
    this._ignored[ignored] = true;
};

module.exports = Tokenizer;

// built-in rules
Tokenizer.whitespace    = [/^(\s)+$/, 'whitespace'];
Tokenizer.word          = [/^\w+$/, 'word'];
Tokenizer.number        = [/^\d+(\.\d+)?$/, 'number'];
