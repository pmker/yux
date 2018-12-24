module.exports = function(grunt) {

    const {Externals} = require('../gui.ajax/res/js/dist/libdefs.js');

    grunt.initConfig({
        babel: {
            options: {},

            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'res/react/',
                        src: ['**/*.js'],
                        dest: 'res/build/',
                        ext: '.js'
                    }
                ]
            }
        },
        browserify: {
            ui : {
                options: {
                    external:Externals,
                    browserifyOptions:{
                        standalone: 'WelcomeComponents'
                    }
                },
                files: {
                    'res/build/WelcomeComponents.js'  : 'res/build/index.js'
                }
            }
        },
        less: {
            development: {
                options: {
                    plugins: [
                        new (require('less-plugin-autoprefix'))({browsers: ["last 2 versions, > 10%"]})
                    ]
                },
                files: {
                    "res/home.css": "res/home.less"
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
                src: ['WelcomeComponents.js'],
                dest: 'res/build/',
                ext: '.js.gz'
            },
            css: {
                expand: true,
                cwd: 'res',
                src: ['home.css'],
                dest: 'res',
                ext: '.css.gz'
            },
        },
        watch: {
            js: {
                files: [
                    "res/react/**/*"
                ],
                tasks: ['default'],
                options: {
                    spawn: false
                }
            },
            styles: {
                files: ['res/*.less'],
                tasks: ['less'],
                options: {
                    nospawn: true
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('assemble-less');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.registerTask('default', ['babel', 'browserify', 'less', 'compress']);

};
