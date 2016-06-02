/*
 * xrm-webpack-plugin
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

// The module to be exported.
var util = module.exports = {};
util.namespace = require('getobject');
util._ = require('lodash');
util.exit = require('exit'); // Instead of process.exit. See https://github.com/cowboy/node-exit

// Create a new Error object, with an origError property that will be dumped
// if grunt was run with the --debug=9 option.
var nodeUtil = require('util');
util.error = function(err, origError) {
  if (!nodeUtil.isError(err)) { err = new Error(err); }
  if (origError) { err.origError = origError; }
  return err;
};

// What "kind" is a value?
// I really need to rework https://github.com/cowboy/javascript-getclass
var kindsOf = {};
'Number String Boolean Function RegExp Array Date Error'.split(' ').forEach(function(k) {
  kindsOf['[object ' + k + ']'] = k.toLowerCase();
});
util.kindOf = function(value) {
  // Null or undefined.
  if (value == null) { return String(value); }
  // Everything else.
  return kindsOf[kindsOf.toString.call(value)] || 'object';
};

// The line feed char for the current system.
util.linefeed = process.platform === 'win32' ? '\r\n' : '\n';

// Normalize linefeeds in a string.
util.normalizelf = function(str) {
  return str.replace(/\r\n|\n/g, util.linefeed);
};

// Given str of "a/b", If n is 1, return "a" otherwise "b".
util.pluralize = function(n, str, separator) {
  var parts = str.split(separator || '/');
  return n === 1 ? (parts[0] || '') : (parts[1] || '');
};

// Recurse through objects and arrays, executing fn for each non-object.
util.recurse = function(value, fn, fnContinue) {
  function recurse(value, fn, fnContinue, state) {
    var error;
    if (state.objs.indexOf(value) !== -1) {
      error = new Error('Circular reference detected (' + state.path + ')');
      error.path = state.path;
      throw error;
    }
    var obj, key;
    if (fnContinue && fnContinue(value) === false) {
      // Skip value if necessary.
      return value;
    } else if (util.kindOf(value) === 'array') {
      // If value is an array, recurse.
      return value.map(function(item, index) {
        return recurse(item, fn, fnContinue, {
          objs: state.objs.concat([value]),
          path: state.path + '[' + index + ']',
        });
      });
    } else if (util.kindOf(value) === 'object' && !Buffer.isBuffer(value)) {
      // If value is an object, recurse.
      obj = {};
      for (key in value) {
        obj[key] = recurse(value[key], fn, fnContinue, {
          objs: state.objs.concat([value]),
          path: state.path + (/\W/.test(key) ? '["' + key + '"]' : '.' + key),
        });
      }
      return obj;
    } else {
      // Otherwise pass value into fn and return.
      return fn(value);
    }
  }
  return recurse(value, fn, fnContinue, {objs: [], path: ''});
};