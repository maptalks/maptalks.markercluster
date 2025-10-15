const { nodeResolve: resolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;
const pkg = require('./package.json');


function glsl() {
    return {
        transform(code, id) {
            if (/\.vert$/.test(id) === false && /\.frag$/.test(id) === false && /\.glsl$/.test(id) === false) return null;
            let transformedCode = JSON.stringify(code.trim()
                .replace(/\r/g, '')
                .replace(/[ \t]*\/\/.*\n/g, '') // remove //
                .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
                .replace(/\n{2,}/g, '\n')); // # \n+ to \n;;
            transformedCode = `export default ${transformedCode};`;
            return {
                code: transformedCode,
                map: { mappings: '' }
            };
        }
    };
}

function wgsl() {
    return {
        transform(code, id) {
            if (/\.wgsl$/.test(id) === false) return null;
            let transformedCode = JSON.stringify(code.trim()
                // .replace(/(^\s*)|(\s*$)/gm, '')
                .replace(/\r/g, '')
                .replace(/[ \t]*\/\/.*\n/g, '') // remove //
                .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
                .replace(/\n{2,}/g, '\n')); // # \n+ to \n;;
            transformedCode = `export default ${transformedCode};`;
            return {
                code: transformedCode
            };
        }
    };
}


const production = process.env.BUILD === 'production';
const outputFile = pkg.main;
const outputESFile = pkg.module;
const plugins = [
    ].concat(production ? [
    terser({
        output : {
            keep_quoted_props: true,
            beautify: false,
            comments : '/^!/'
        }
    })
] : []);

const banner = `/*!\n * ${pkg.name} v${pkg.version}\n * LICENSE : ${pkg.license}\n * (c) 2016-${new Date().getFullYear()} maptalks.org\n */`;

let outro = pkg.name + ' v' + pkg.version;
if (pkg.peerDependencies && pkg.peerDependencies['maptalks']) {
    outro += `, requires maptalks@${pkg.peerDependencies.maptalks}.`;
}

outro = `typeof console !== 'undefined' && console.log('${outro}');`;

module.exports = [
    {
        input: 'index.js',
        plugins: [
            glsl(),
            wgsl(),
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs({
                // global keyword handling causes Webpack compatibility issues, so we disabled it:
                // https://github.com/mapbox/mapbox-gl-js/pull/6956
                ignoreGlobal: true
            })
        ].concat(plugins),
        external: ['maptalks', '@maptalks/gl', '@maptalks/vt'],
        output: {
            globals: {
                'maptalks': 'maptalks',
                '@maptalks/gl': 'maptalks',
                '@maptalks/vt': 'maptalks'
            },
            banner,
            outro,
            extend: true,
            name: 'maptalks',
            file: outputFile,
            format: 'umd',
            sourcemap: true,
        },
        watch: {
            include: ['index.js', '**/*/*.vert', '**/*/*.frag', '**/*/*.wgsl']
        }
    },
    {
        input: 'index.js',
        plugins: [
            glsl(),
            wgsl(),
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs({
                // global keyword handling causes Webpack compatibility issues, so we disabled it:
                // https://github.com/mapbox/mapbox-gl-js/pull/6956
                ignoreGlobal: true
            })
        ].concat(plugins),
        external: ['maptalks', '@maptalks/gl', '@maptalks/vt'],
        output: {
            globals: {
                'maptalks': 'maptalks',
                '@maptalks/gl': 'maptalks',
                '@maptalks/vt': 'maptalks'
            },
            banner,
            outro,
            extend: true,
            name: 'maptalks',
            file: outputESFile,
            format: 'es',
            sourcemap: true,
        },
        watch: {
            include: ['index.js']
        }
    }
];
