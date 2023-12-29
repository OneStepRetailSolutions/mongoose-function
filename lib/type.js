
module.exports = exports = function (mongoose, opts) {
    var custom;
    var isLocalFunction;
     if (opts && 'function' == typeof opts.toFunction) {
      // validate the custom method returns functions
      var fn = opts.toFunction;
      custom = function () {
        var ret = fn.apply(undefined, arguments);
        if (null === ret) return ret;
        if ('function' != typeof ret) {
          var msg = 'MongooseFunction: custom toFunction did not return a function';
          throw new Error(msg);
        }
        return ret;
      }
    }
  
    if (opts && 'function' == typeof opts.isLocalFunction) {
      // validate the custom method returns functions
      var fnILF = opts.isLocalFunction;
      isLocalFunction = function () {
        var ret = fnILF.apply(undefined, arguments);
        if (null === ret) return ret;
        return ret;
      }
    }
  
    function MongooseFunction () {
      var arg = arguments[0];
      var type = typeof arg;
      var toFunc = custom || toFunction;
      var isLocalFunc = isLocalFunction || isLocalFunct;
      var fn;
  
      if ('string' == type) {
        arg = arg.trim();
        if (!arg.length) return null;
      }
  
      //AFG-20231119 - Too much "function" checking going on here. toFunc should handle this.
      if ('string' == type) { //&& /^function\s*[^\(]*\(/.test(arg)) {
          fn = toFunc(arg);
  
      } else if ('function' == type) {
        fn = arg;
  
      } else if ('object' == type && 'Code' == arg._bsontype) {
        if (arg.scope && Object.keys(arg.scope).length > 0) {
          throw new Error('MongooseFunction does not support storing Code `scope`')
        }
  
        fn = 'function' == typeof arg.code
          ? arg.code
          : toFunc(arg.code);
  
      } else {
        throw error(arg);
      }
  
      if (null === fn) return fn;
  
      // compatibility with mongoose save
      let isLF = isLocalFunc(arg);
      if (isLF) {  //preserve local function designation in database
          fn.valueOf = function () {
              return this.origValue;
           }
          fn.origValue = arg;
      } else {
          fn.valueOf = fn.toString
      }
      fn.__MongooseFunction__ = 1;
  
      return fn;
    }
  
    MongooseFunction.toFunction = toFunction;
    MongooseFunction.isLocalFunc = isLocalFunction;
  
    return mongoose.Types.Function = MongooseFunction;
  }
  
  //placeholder for opts.isLocalFunction
  function isLocalFunct(arg) {
      return false;
  }
  
  // converting functions stored as strings in the db
  function toFunction (arg) {
    'use strict';
  
    arg = arg.trim();
  
    // zero length strings are considered null instead of Error
    if (0 == arg.length) return null;
  
    // must start with "function"
    if (!/^function\s*[^\(]*\(/.test(arg)) {
      throw error(arg);
    }
  
    // trim string to function only
    arg = trim(arg);
  
    return eval('(' + arg + ')');
  }
  
  /**
   * Trim `arg` down to only the function
   */
  
  function trim (arg) {
    var match = arg.match(/^function\s*[^\(]*\([^\)]*\)\s*{/);
    if (!match) throw error(arg);
  
    // we included the first "{" in our match
    var open = 1;
  
    for (var i = match[0].length; i < arg.length; ++i) {
      switch (arg[i]) {
      case '{':
        open++; break;
      case '}':
        open--;
        if (open === 0) {
          // stop at first valid close of function
          return arg.substring(0, i+1);
        }
      }
    }
    throw error(arg);
  }
  
  /**
   * Create an Invalid function string error
   */
  
  function error (arg) {
    return new Error("MongooseFunction: Invalid function string: " + arg);
  }
  