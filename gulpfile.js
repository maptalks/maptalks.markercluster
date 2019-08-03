'use strict';

const gulp = require('gulp'),
    pkg = require('./package.json'),
    BundleHelper = require('maptalks-build-helpers').BundleHelper,
    TestHelper = require('maptalks-build-helpers').TestHelper;
const bundleHelper = new BundleHelper(pkg);
const testHelper = new TestHelper();
const karmaConfig = require('./karma.config');

gulp.task('build', () => {
    return bundleHelper.bundle('index.js');
});

gulp.task('minify', gulp.series(['build'], () => {
    bundleHelper.minify();
}));

gulp.task('watch', gulp.series(['build'], () => {
    gulp.watch(['index.js', './gulpfile.js'], gulp.series(['build']));
}));

gulp.task('runTest', done => {
    testHelper.test(karmaConfig);
    done();
});

gulp.task('test', gulp.series(['build', 'runTest']));

gulp.task('tdd', gulp.series(['build'], () => {
    karmaConfig.singleRun = false;
    gulp.watch(['index.js'], ['test']);
    testHelper.test(karmaConfig);
}));

gulp.task('default', gulp.series(['watch']));

