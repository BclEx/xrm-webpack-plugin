# xrm-webpack-plugin v0.1.0

> Webpack plugin to continuously scaffold an xrm platform 


## Getting Started
This is a [webpack](http://webpack.github.io/) plugin that scaffolds an xrm platform to serve your
webpack bundles.

Maintainer: Sky Morey [@smorey2](https://twitter.com/smorey2)

Installation
------------
Install the plugin with npm:
```shell
$ npm install html-webpack-plugin --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

Basic Usage
-----------

The plugin will generate an xrm platform for you. Just add the plugin to your webpack
config as follows:

```javascript
var XrmWebpackPlugin = require('xrm-webpack-plugin');

var paths = {
  dest: {
    css: 'css',
    js: 'js',
    database: 'Databases',
  }
};

var webpackConfig = {
  entry: 'index.js',
  output: {
    path: 'dist',
    filename: 'index_bundle.js'
  },
  plugins: [new XrmWebpackPlugin(paths)]
};
```