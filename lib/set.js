
/*!
 * migrate - Set
 * Copyright (c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Migration = require('./migration')
  , Migrations = require('./Migrations')
  , fs = require('fs')
  , mongoose = require('mongoose')
  , timeout = 30000;

/**
 * Expose `Set`.
 */

module.exports = Set;

/**
 * Initialize a new migration `Set`
 *
 * @api private
 */

function Set() {
  this.migrations = [];
  this.pos = 0;
  this._doc = null;
};

/**
 * Inherit from `EventEmitter.prototype`.
 */

Set.prototype.__proto__ = EventEmitter.prototype;

/**
 * Add a migration.
 *
 * @param {String} title
 * @param {Function} up
 * @param {Function} down
 * @api public
 */

Set.prototype.addMigration = function(title, up, down){
  this.migrations.push(new Migration(title, up, down));
};

/**
 * Save the migration data.
 *
 * @api public
 */

Set.prototype.save = function(fn){
  if (!this._doc) {
    return fn(null);
  }

  var self = this;

  this._doc.pos = this.pos;
  this._doc.migrations = this.migrations;
  this._doc.lock = this.migrations.length === this.pos ? 0 : Date.now();

  this._doc.save(function (err) {
    if (err) return fn(err);

    self.emit('save');
    fn(null);
  });
};

/**
 * Load the migration data and call `fn(err, obj)`.
 *
 * @param {Function} fn
 * @return {Type}
 * @api public
 */

Set.prototype.load = function(fn){
  this.emit('load');

  var self = this,
    now = Date.now();

  Migrations.findOneAndUpdate({
    __uq: 1,
    lock: { $lt: now - timeout }
  }, {
    $setOnInsert: {
      pos: this.pos,
      migrations: this.migrations
    },
    $set: {
      lock: now
    }
  }, {
    new: true,
    upsert: true
  }, function (err, res) {
    if (err && err.code !== 11000) {
     return fn(err);
    } else if (err) {
      return fn(null, { pos: self.migrations.length });
    }
    self._doc = res;
    try {
      fn(null, res);
    } catch (err) {
      fn(err);
    }
  });
};

/**
 * Run down migrations and call `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */

Set.prototype.down = function(migrationName, fn){
  this.migrate('down', migrationName, fn);
};

/**
 * Run up migrations and call `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */

Set.prototype.up = function(migrationName, fn){
  this.migrate('up', migrationName, fn);
};

/**
 * Migrate in the given `direction`, calling `fn(err)`.
 *
 * @param {String} direction
 * @param {Function} fn
 * @api public
 */

Set.prototype.migrate = function(direction, migrationName, fn){
  if (typeof migrationName === 'function') {
    fn = migrationName;
    migrationName = null;
  }
  var self = this;
  this.load(function(err, obj){
    if (err) {
      if ('ENOENT' != err.code) return fn(err);
    } else {
      self.pos = obj.pos;
    }
    self._migrate(direction, migrationName, fn);
  });
};

/**
 * Get index of given migration in list of migrations
 *
 * @api private
 */

 function positionOfMigration(migrations, filename) {
   for(var i=0; i < migrations.length; ++i) {
     if (migrations[i].title == filename) return i;
   }
   return -1;
 }

/**
 * Perform migration.
 *
 * @api private
 */

Set.prototype._migrate = function(direction, migrationName, fn){
  var self = this
    , migrations
    , migrationPos;

  if (!migrationName) {
    migrationPos = direction == 'up' ? this.migrations.length : 0;
  } else if ((migrationPos = positionOfMigration(this.migrations, migrationName)) == -1) {
    return fn(new Error("Could not find migration: " + migrationName));
  }

  switch (direction) {
    case 'up':
      migrations = this.migrations.slice(this.pos, migrationPos+1);
      break;
    case 'down':
      migrations = this.migrations.slice(migrationPos, this.pos).reverse();
      break;
  }

  function next(migration) {
    self.save(function (err) {
      if (err) return fn(err);

      if (!migration) return fn(null);

      self.emit('migration', migration, direction);
      migration[direction](function(err){
        if (err) return fn(err);

        self.pos += (direction === 'up' ? 1 : -1);
        next(migrations.shift())
      });
    });
  }

  next(migrations.shift());
};
