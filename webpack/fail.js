/*
 * xrm-webpack-plugin
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

var webpack = require('../webpack');

// The module to be exported.
var fail = module.exports = {};

// Error codes.
fail.code = {
  FATAL_ERROR: 1,
  TASK_FAILURE: 2,
  TEMPLATE_ERROR: 3,
  INVALID_AUTOCOMPLETE: 4,
  WARNING: 5,
};

// DRY it up!
function writeln(e, mode) {
  var msg = String(e.message || e);
  if (!webpack.option('no-color')) { msg += '\x07'; } // Beep!
  if (mode === 'warn') {
    msg = 'Warning: ' + msg + ' ';
    msg += (webpack.option('force') ? 'Used --force, continuing.'.underline : 'Use --force to continue.');
  } else {
    msg = 'Fatal error: ' + msg;
  }
  webpack.log(msg);
}

// If --stack is enabled, log the appropriate error stack (if it exists).
function dumpStack(e) {
  if (webpack.option('stack')) {
    if (e.origError && e.origError.stack) {
      console.log(e.origError.stack);
    } else if (e.stack) {
      console.log(e.stack);
    }
  }
}

// A fatal error occurred. Abort immediately.
fail.fatal = function(e, errcode) {
  writeln(e, 'fatal');
  dumpStack(e);
  webpack.util.exit(typeof errcode === 'number' ? errcode : fail.code.FATAL_ERROR);
};

// Keep track of error and warning counts.
fail.errorcount = 0;
fail.warncount = 0;

// A warning occurred. Abort immediately unless -f or --force was used.
fail.warn = function(e, errcode) {
  var message = typeof e === 'string' ? e : e.message;
  fail.warncount++;
  writeln(message, 'warn');
  // If -f or --force aren't used, stop script processing.
  if (!webpack.option('force')) {
    dumpStack(e);
    webpack.log('Aborted due to warnings.');
    webpack.util.exit(typeof errcode === 'number' ? errcode : fail.code.WARNING);
  }
};

// This gets called at the very end.
fail.report = function() {
  if (fail.warncount > 0) {
    webpack.log('Done, but with warnings.');
  } else {
    webpack.log('Done, without errors.');
  }
};
