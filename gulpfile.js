'use strict';

var gulp   = require('gulp'),
    header = require('gulp-header'),
    browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var version = require('./package.json').version;

gulp.task('watch', ['build'], function () {
   var scriptWatcher = gulp.watch(['index.js', './gulpfile.js'], ['build']); // watch the same files in our scripts task
});

// ref:
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-transforms.md
gulp.task('build', function () {
    // set up the browserify instance on a task basis
  var b = browserify({
    entries: ['./index.js'],
    debug: false
  });

  b.external(['maptalks']);

  return b.bundle()
    .pipe(source('maptalks.clusterlayer.js')) // gives streaming vinyl file object
    .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
    // .pipe(uglify()) // now gulp-uglify works
    .pipe(header('//version:' + version+'\n'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['watch']);
