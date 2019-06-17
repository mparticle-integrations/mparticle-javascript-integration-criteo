import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [{
    input: 'src/CriteoEventForwarder.js',
    output: {
        file: 'CriteoEventForwarder.js',
        format: 'umd',
        exports: 'named',
        name: 'mp-criteo-kit',
        strict: false
    },
    plugins: [
        resolve({
            browser: true
        }),
        commonjs()
    ]
},
{
    input: 'src/CriteoEventForwarder.js',
    output: {
        file: 'dist/CriteoEventForwarder.js',
        format: 'umd',
        exports: 'named',
        name: 'mp-criteo-kit',
        strict: false
    },
    plugins: [
        resolve({
            browser: true
        }),
        commonjs()
    ]
}
] 