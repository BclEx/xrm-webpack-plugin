/*
 * xrm-webpack-plugin
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

var webpack = require('../webpack');

// The module to be exported.
var task = module.exports = {};

// Multi task targets can't start with _ or be a reserved property (options).
function isValidMultiTaskTarget(target) {
  return !/^_|^options$/.test(target);
}

// Normalize multi task files.
task.normalizeMultiTaskFiles = function (data, target) {
  var prop, obj;
  var files = [];
  if (webpack.util.kindOf(data) === 'object') {
    if ('src' in data || 'dest' in data) {
      obj = {};
      for (prop in data) {
        if (prop !== 'options') {
          obj[prop] = data[prop];
        }
      }
      files.push(obj);
    } else if (webpack.util.kindOf(data.files) === 'object') {
      for (prop in data.files) {
        files.push({ src: data.files[prop], dest: webpack.config.process(prop) });
      }
    } else if (Array.isArray(data.files)) {
      webpack.util._.flatten(data.files).forEach(function (obj) {
        var prop;
        if ('src' in obj || 'dest' in obj) {
          files.push(obj);
        } else {
          for (prop in obj) {
            files.push({ src: obj[prop], dest: webpack.config.process(prop) });
          }
        }
      });
    }
  } else {
    files.push({ src: data, dest: webpack.config.process(target) });
  }

  // If no src/dest or files were specified, return an empty files array.
  if (files.length === 0) {
    webpack.verbose.writeln('File: ' + '[no files]'.yellow);
    return [];
  }

  // Process all normalized file objects.
  files = webpack.util._(files).chain().forEach(function (obj) {
    if (!('src' in obj) || !obj.src) { return; }
    // Normalize .src properties to flattened array.
    if (Array.isArray(obj.src)) {
      obj.src = webpack.util._.flatten(obj.src);
    } else {
      obj.src = [obj.src];
    }
  }).map(function (obj) {
    // Build options object, removing unwanted properties.
    var expandOptions = webpack.util._.extend({}, obj);
    delete expandOptions.src;
    delete expandOptions.dest;

    // Expand file mappings.
    if (obj.expand) {
      return webpack.file.expandMapping(obj.src, obj.dest, expandOptions).map(function (mapObj) {
        // Copy obj properties to result.
        var result = webpack.util._.extend({}, obj);
        // Make a clone of the orig obj available.
        result.orig = webpack.util._.extend({}, obj);
        // Set .src and .dest, processing both as templates.
        result.src = webpack.config.process(mapObj.src);
        result.dest = webpack.config.process(mapObj.dest);
        // Remove unwanted properties.
        ['expand', 'cwd', 'flatten', 'rename', 'ext'].forEach(function (prop) {
          delete result[prop];
        });
        return result;
      });
    }

    // Copy obj properties to result, adding an .orig property.
    var result = webpack.util._.extend({}, obj);
    // Make a clone of the orig obj available.
    result.orig = webpack.util._.extend({}, obj);

    if ('src' in result) {
      // Expose an expand-on-demand getter method as .src.
      Object.defineProperty(result, 'src', {
        enumerable: true,
        get: function fn() {
          var src;
          if (!('result' in fn)) {
            src = obj.src;
            // If src is an array, flatten it. Otherwise, make it into an array.
            src = Array.isArray(src) ? webpack.util._.flatten(src) : [src];
            // Expand src files, memoizing result.
            fn.result = webpack.file.expand(expandOptions, src);
          }
          return fn.result;
        }
      });
    }

    if ('dest' in result) {
      result.dest = obj.dest;
    }

    return result;
  }).flatten().value();

  // Log this.file src and dest properties when --verbose is specified.
  if (webpack.option('verbose')) {
    files.forEach(function (obj) {
      var output = [];
      if ('src' in obj) {
        output.push(obj.src.length > 0 ? webpack.log(obj.src) : '[no src]');
      }
      if ('dest' in obj) {
        output.push('-> ' + (obj.dest ? String(obj.dest) : '[no dest]'));
      }
      if (output.length > 0) {
        webpack.log('Files: ' + output.join(' '));
      }
    });
  }

  return files;
};

// // This is the most common "multi task" pattern.
// task.registerMultiTask = function (name, info, fn) {
//   // If optional "info" string is omitted, shuffle arguments a bit.
//   if (fn == null) {
//     fn = info;
//     info = 'Custom multi task.';
//   }
//   // Store a reference to the task object, in case the task gets renamed.
//   var thisTask;
//   task.registerTask(name, info, function (target) {
//     // Guaranteed to always be the actual task name.
//     var name = thisTask.name;
//     // Arguments (sans target) as an array.
//     this.args = grunt.util.toArray(arguments).slice(1);
//     // If a target wasn't specified, run this task once for each target.
//     if (!target || target === '*') {
//       return task.runAllTargets(name, this.args);
//     } else if (!isValidMultiTaskTarget(target)) {
//       throw new Error('Invalid target "' + target + '" specified.');
//     }
//     // Fail if any required config properties have been omitted.
//     this.requiresConfig([name, target]);
//     // Return an options object with the specified defaults overwritten by task-
//     // and/or target-specific overrides, via the "options" property.
//     this.options = function () {
//       var targetObj = webpack.config([name, target]);
//       var args = [{}].concat(webpack.util._.toArray(arguments)).concat([
//         webpack.config([name, 'options']),
//         webpack.util.kindOf(targetObj) === 'object' ? targetObj.options : {}
//       ]);
//       var options = webpack.util._.extend.apply(null, args);
//       webpack.verbose.writeflags(options, 'Options');
//       return options;
//     };
//     // Expose the current target.
//     this.target = target;
//     // Recreate flags object so that the target isn't set as a flag.
//     this.flags = {};
//     this.args.forEach(function (arg) { this.flags[arg] = true; }, this);
//     // Expose data on `this` (as well as task.current).
//     this.data = webpack.config([name, target]);
//     // Expose normalized files object.
//     this.files = task.normalizeMultiTaskFiles(this.data, target);
//     // Expose normalized, flattened, uniqued array of src files.
//     Object.defineProperty(this, 'filesSrc', {
//       enumerable: true,
//       get: function () {
//         return webpack.util._(this.files).chain().pluck('src').flatten().uniq().value();
//       }.bind(this)
//     });
//     // Call original task function, passing in the target and any other args.
//     return fn.apply(this, this.args);
//   });
// };
