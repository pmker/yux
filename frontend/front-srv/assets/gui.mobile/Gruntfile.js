module.exports = function(grunt) {

    const {Externals} = require('../gui.ajax/res/js/dist/libdefs.js');

    grunt.initConfig({
        copy: {
            smartbannercss: {
                expand: true,
                src: 'node_modules/smart-app-banner/dist/smart-app-banner.css',
                dest: 'res/',
                flatten: true
            },
        },
        babel: {
            options: {},

            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'res/js/',
                        src: ['**/*.js'],
                        dest: 'res/build/',
                        ext: '.js'
                    }
                ]
            }
        },
        browserify: {
            mobile: {
                options: {
                    external: Externals,
                    browserifyOptions:{
                        standalone: 'MobileExtensions',
                        debug:true
                    }
                },
                files: {
                    'res/build/mobile-build.js': 'res/build/index.js'
                }
            }
        },
        compress: {
            options: {
                mode: 'gzip',
                level:9,
            },
            js: {
                expand: true,
                cwd: 'res/build/',
                src: ['mobile-build.js'],
                dest: 'res/build/',
                ext: '.js.gz'
            },
        },
        watch: {
            js: {
                files: [
                    "res/**/*"
                ],
                tasks: ['babel', 'browserify'],
                options: {
                    spawn: false
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.registerTask('default', [
        'copy',
        'babel',
        'browserify',
        'compress'
    ]);

};
