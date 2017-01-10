'use strict';

const fs = require('fs'),
    gulp = require('gulp'),
    rollup = require('rollup').rollup,
    babel = require('rollup-plugin-babel'),
    uglify = require('uglify-js').minify,
    zlib = require('zlib'),
    pkg = require('./package.json');

const dest = 'dist/' + pkg.name + '.js';

const banner =
  '/*!\n' +
  ' * ' + pkg.name + ' v' + pkg.version + '\n' +
  ' * (c) 2016 maptalks.org\n' +
  ' */';

gulp.task('build', () => {
    return rollup({
        'entry': 'index.js',
        'external': [
            'maptalks'
        ],
        'plugins': [
            babel()
        ],
        'sourceMap': true
    }).then(bundle => bundle.write({
        'format': 'umd',
        'moduleName': 'maptalks',
        'banner': banner,
        'dest': dest,
        'sourceMap': 'inline'
    })
    );
});

gulp.task('publish', ['build'], () => {
    const code = fs.readFileSync(dest).toString('utf-8');
    const minified = banner + '\n' + uglify(code, {
        'fromString': true,
        'output': {
            'screw_ie8': true,
            'ascii_only': true
        }
    }).code;
    fs.writeFileSync('dist/' + pkg.name + '.min.js', minified);
    const gzipped = zlib.gzipSync(minified);
    fs.writeFileSync('dist/' + pkg.name + '.min.js.gz', gzipped);
});

gulp.task('watch', ['build'], () => {
    gulp.watch(['index.js', './gulpfile.js'], ['build']); // watch the same files in our scripts task
});

gulp.task('default', ['watch']);

