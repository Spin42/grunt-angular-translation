/*
 * grunt-angular-translation
 * https://github.com/Spin42/grunt-angular-translation
 *
 * Copyright (c) 2014 Spin42
 * Licensed under the MIT license.
 */

"use strict";

var beg  = require("beg");
var path = require("path");

var computePath = function(apiKey, action) {
  return path.join("/api/projects", apiKey, action);
};

var extractConfig = function(gruntConfig) {
  if (!gruntConfig("nggettext_extract.pot.files"))      throw new Error("Missing nggettext_extract.pot.files key, check nggettext for more details");
  if (!gruntConfig("translation.config.poPath"))        throw new Error("Missing translation.config.poPath key, please specify the po files path");
  if (!gruntConfig("translation.config.apiKey"))        throw new Error("Missing translation.config.apiKey key");
  if (!gruntConfig("translation.config.targetLocales")) throw new Error("Missing translation.config.targetLocales key");
  if (!gruntConfig("translation.config.sourceLocale"))  throw new Error("Missing translation.config.sourceLocale key");

  var config = {
    potPath       : Object.keys(gruntConfig("nggettext_extract.pot.files"))[0],
    poPath        : gruntConfig("translation.config.poPath"),
    apiKey        : gruntConfig("translation.config.apiKey"),
    targetLocales : gruntConfig("translation.config.targetLocales"),
    gemVersion    : "2.0",
    sourceLocale  : gruntConfig("translation.config.sourceLocale"),
    hostname      : "translation.io"
  }

  return config;
};

var syncPoFiles = function(grunt, config, callback) {
  var potData = grunt.file.read(config.potPath);

  var params  = {
    target_languages : config.targetLocales,
    pot_data         : potData.toString(),
    gem_version      : config.gemVersion,
    source_language  : config.sourceLocale
  };

  var options = {
    hostname : config.hostname,
    path     : computePath(config.apiKey, "sync"),
    payload  : params
  };

  beg.post(options, { parseJson: true, secure: true }, function(err, body) {
    if (err) return callback(err);
    Object.keys(body).forEach(function(key) {
      var match = key.match(/^po_data_(.*)/);
      if (match) {
        var locale   = match[1];
        var filepath = path.join(config.poPath, locale + ".po");
        grunt.file.write(filepath, body[key]);
      }
    });
    callback();
  });
}

var initProject = function(config, callback) {

  var params  = {
    target_languages : config.targetLocales,
    gem_version      : config.gemVersion,
    source_language  : config.sourceLocale
  };

  params.target_languages.forEach(function(language){
    params["po_data_" + language] = ""; // Todo: read existing po files
  });

  var options = {
    hostname : config.hostname,
    path     : computePath(config.apiKey, "init"),
    payload  : params
  };

  beg.post(options, { parseJson: true, secure: true }, function(err, body) {
    if (err) return callback(err);
    callback();
  });
}
 
module.exports = function(grunt) {
  grunt.registerTask("translation:init", "Initialize your translation.io project", function() {
    var done   = this.async();
    var config = extractConfig(grunt.config);

    initProject(config, function(err){
      if (err) {
        grunt.log.error(err);
        return done(false)
      }  
      done();
    })
    
  });

  grunt.registerTask("translation:syncPoFiles", "Send new translatable key/strings and get new translations from translation.io", function() {
    var config = extractConfig(grunt.config);
    var done   = this.async();

    syncPoFiles(grunt, config, function(err){
      if (err) {
        grunt.log.error(err);
        return done(false);
      }
      done();
    });
  });

  grunt.registerTask("translation:syncAndPurge", "Remove unused key/strings from translation.io using the current branch as reference", function() {
    throw new Error("Unimplemented");
  });

  grunt.registerTask("translation:sync", [
    "nggettext_extract",
    "translation:syncPoFiles",
    "nggettext_compile"
  ]);
};
