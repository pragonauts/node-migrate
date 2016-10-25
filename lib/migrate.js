
/*!
 * migrate
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Set = require('./set')
  , path = require('path')
  , fs = require('fs')
  , Migrations = require('./Migrations');

/**
 * Expose the migrate function.
 */

exports = module.exports = migrate;

function migrate(title, up, down) {
  // migration
  if ('string' == typeof title && up && down) {
    migrate.set.addMigration(title, up, down);
  // specify migration file
  } else if (!migrate.set) {
    migrate.set = new Set();
  }

  // run migrations
  return migrate.set;
}

exports.load = function (migrationsDirectory, fn) {

  var set = new Set();
  var dir = path.resolve(migrationsDirectory);

  Migrations.on('index', function(err) {
    if (err) {
      return fn(err);
    }
    fs.readdirSync(dir).filter(function(file){
      return file.match(/^\d+.*\.js$/);
    }).sort().forEach(function (file) {
      var mod = require(path.join(dir, file));
      set.addMigration(file, mod.up, mod.down);
    });
    fn(null, set);
  });
};
