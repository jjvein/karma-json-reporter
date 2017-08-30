/* jshint node: true */

'use strict';
var path = require('path');
var fs = require('fs');

//
var JSONReporter = function (baseReporterDecorator, config, helper, logger) {

  var log = logger.create('karma-json-reporter');
  baseReporterDecorator(this);

  var history = {
    browsers : {},
    failures : {},
    result : {},
    summary : {}
  };

  var setFailure = function(failure) {
    var lastObj = history.failures;

    for(var i = 0; i < failure.suite.length; i++) {
      if (lastObj[failure.suite[i]]) {
        lastObj = lastObj[failure.suite[i]];
      } else {
        lastObj = lastObj[failure.suite[i]] = {};
      }
    }

    lastObj['__it__'] = lastObj['__it__'] || [];
    lastObj['__it__'].push({ description: failure.description, log: failure.log })
  }

  var reporterConfig = config.jsonReporter || {};
  var stdout = typeof reporterConfig.stdout !== 'undefined' ? reporterConfig.stdout : true;
  var outputFile = (reporterConfig.outputFile) ? helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile )) : null;

  this.onSpecComplete = function(browser, result) {
    history.result[browser.id] = history.result[browser.id] || [];
    history.result[browser.id].push(result);

    history.browsers[browser.id] = history.browsers[browser.id] || browser;

    if (!result.skipped && !result.success) {
      setFailure(result);
    }
  };

  this.onRunComplete = function(browser, result) {
    history.summary = result;
    if(stdout) process.stdout.write(JSON.stringify(history));
    if(outputFile) {
      helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, JSON.stringify(history), function(err) {
        if (err) {
          log.warn('Cannot write JSON\n\t' + err.message);
        } else {
          log.debug('JSON written to "%s".', outputFile);
        }
      });
    });
    }
    history.result = {};
  };
};

JSONReporter.$inject = ['baseReporterDecorator','config','helper','logger'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:json': ['type', JSONReporter]
};
