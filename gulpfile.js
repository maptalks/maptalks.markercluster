'use strict';

const gulp = require('gulp'),
    pkg = require('./package.json'),
    BundleHelper = require('maptalks-build-helpers').BundleHelper;
const bundler = new BundleHelper(pkg);

gulp.task('build', () => {
    return bundler.bundle('index.js');
});

gulp.task('minify', ['build'], () => {
    bundler.minify();
});

gulp.task('watch', ['build'], () => {
    gulp.watch(['index.js', './gulpfile.js'], ['build']);
});

gulp.task('default', ['watch']);

