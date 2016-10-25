
/*!
 * migrate
 * Copyright(c) 2016 David Menger <david.menger@me.com>
 * MIT Licensed
 */

var mongoose = require('mongoose');

var migrationsSchema = new mongoose.Schema({
    pos: Number,
    lock: Number,
    migrations: Array,
    __uq: Number
}, { autoIndex: true });

migrationsSchema.index({ __uq: 1 }, { unique: 1 });

var Migrations = mongoose.model('Migrations', migrationsSchema);

module.exports = Migrations;
