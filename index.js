/* jshint node: true */

'use strict';
var path = require('path');
var fs = require('fs');
var request = require("request");

//
var ApiJSONReporter = function (baseReporterDecorator, config, helper, logger) {

  var log = logger.create('karma-json-reporter');
  baseReporterDecorator(this);

  var history = {
    "@timestamp": (new Date()).toISOString(),
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

  var reporterConfig = config.apiJsonReporter || {};
  var stdout = typeof reporterConfig.stdout !== 'undefined' ? reporterConfig.stdout : true;
  var outputFile = (reporterConfig.outputFile) ? helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile )) : null;
  var outputUrl = reporterConfig.outputUrl || '';

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
    if (outputUrl) {
        request({
            url: outputUrl,
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(history)
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                log.debug('Request url success!');
            }
        });
    } else if(outputFile) {
      helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, JSON.stringify(history), function(err) {
        if (err) {
          log.warn('Cannot write JSON\n\t' + err.message);
        } else {
          log.debug('JSON written to ' + outputFile);
        }
      });
    });
    }
    history.result = {};
  };
};

ApiJSONReporter.$inject = ['baseReporterDecorator','config','helper','logger'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:apijson': ['type', ApiJSONReporter]
};
