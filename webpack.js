/*
 * xrm-webpack-plugin
 *
 * Copyright (c) 2015 
 * Licensed under the MIT license.
 */

'use strict';

// External libs.
var fs = require('fs');
var path = require('path');
var GroupedQueue = require('grouped-queue');
var debug = require('debug')('webpack:xrm');

// The module to be exported.
var webpack = module.exports = function XrmWebpackPlugin(configs, options) {
  this.configs = configs;
  this.options = options;
  this.env = require('yeoman-environment').createEnv();
  this.env.on('error', function (err) {
    console.error(false ? err.stack : err.message);
  });

  //var done = this.async();
  this.runLoop = new GroupedQueue(webpack.queues);
  this.runLoop.once('end', function () {
    //done();
  }.bind(this));
  // Each composed generator might set listeners on these shared resources. Let's make sure
  // Node won't complain about event listeners leaks.
  this.runLoop.setMaxListeners(0);
}

// Logger
webpack.log = function () { }; //console.log;

// Expose internal webpack libs.
function gRequire(name) {
  return webpack[name] = require('./webpack/' + name);
}
gRequire('util');
gRequire('template');
var fail = gRequire('fail');
gRequire('file');
var option = gRequire('option');
var config = gRequire('config');
var task = gRequire('task');

// Expose specific webpack lib methods on webpack.
function gExpose(obj, methodName) {
  webpack[methodName] = obj[methodName].bind(obj);
}
gExpose(config, 'init');
gExpose(fail, 'warn');
gExpose(fail, 'fatal');

webpack.prototype.apply = function (compiler) {
  // Update options with passed-in options.
  option.init(this.options);
  config.init(this.configs);
  var name = 'main', target = '';

  // Return an options object with the specified defaults overwritten by task-
  // and/or target-specific overrides, via the "options" property.
  this.options = function () {
    var targetObj = webpack.config([name, target]);
    var args = [{}].concat(webpack.util._.toArray(arguments)).concat([
      webpack.config([name, 'options']),
      webpack.util.kindOf(targetObj) === 'object' ? targetObj.options : {}
    ]);
    var options = webpack.util._.extend.apply(null, args);
    webpack.log(options, 'Options');
    return options;
  };
  // Expose data on `this` (as well as task.current).
  this.data = config('main');
  // Expose normalized files object.
  this.files = task.normalizeMultiTaskFiles(this.data, 'target');

  // var basePath = compiler.context || process.cwd();
  // var outputFile = path.resolve(basePath, this.outputFile);

  compiler.plugin('run', onRun.bind(this));
  //compiler.plugin('watch-run', onRun.bind(this));

  function onRun(unused, done) {
    var self = this;

    function process(ctx, name, dest, options) {
      debug('Running ' + name);
      options['skip-install'] = true;
      ctx.name = name;
      options.dest = dest;
      this.env.run(['xrm', ctx], options, function (err) {
        //this.async2();
        debug('Finished ' + name + ' processing');
        // self.log('File "' + name + '" processed.');
      });
    };

    function addMethod(method, args, methodName, queueName) {
      queueName = queueName || 'default';
      debug('Queueing ' + methodName + ' in ' + queueName);
      self.runLoop.add(queueName, function (completed) {
        debug('Running ' + methodName);
        var done = function (err) {
          completed();
        };

        var running = false;
        self.async2 = function () {
          running = true;
          return done;
        };

        try {
          method.apply(self, args);
          if (!running) {
            done();
            return;
          }
        } catch (err) {
          debug('An error occured while running ' + methodName, err);
        }
      });
    }

    function addInQueue(filePath, dest) {
      // Read file source.
      var nameParts = getObjectNameParts(path.basename(filePath, '.js'), '');
      var ctx = eval('[' + webpack.file.read(filePath) + ']')[0];
      ctx.searchPaths = [path.dirname(filePath)];
      ctx.schemaName = nameParts[0];
      var args = [ctx, nameParts[1], dest, options];
      //addMethod(process, args, file);
      debug('Queueing ' + nameParts[1]);
      process.apply(self, args);
    }

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: ';',
    });

    // Iterate over all specified file groups.
    this.env.lookup(function () {
      this.files.forEach(function (file) {
        file.src.filter(function (filePath) { return webpack.file.exists(filePath); })
          .forEach(function (filePath) { addInQueue(filePath, file.dest); });
      });
    }.bind(this));

    done();
  }
}

function getObjectNameParts(objectName) {
  var pieces = objectName.split('.');
  if (!pieces || pieces.length === 1) {
    return ['dbo', pieces ? pieces[0] : objectName];
  }
  return [pieces[0], pieces[1]];
}

webpack.queues = [
  'default',
  'defered',
];