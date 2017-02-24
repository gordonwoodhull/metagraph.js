module.exports = function (grunt) {
    'use strict';

    require('load-grunt-tasks')(grunt, {
        pattern: ['grunt-*']
    });
    require('time-grunt')(grunt);

    var config = {
        src: 'src',
        spec: 'spec',
        web: 'web',
        pkg: require('./package.json'),
        banner: grunt.file.read('./LICENSE_BANNER'),
        jsFiles: module.exports.jsFiles
    };

    grunt.initConfig({
        conf: config,

        concat: {
            options : {
                process: true,
                sourceMap: true,
                banner : '<%= conf.banner %>'
            },
            main: {
                src: '<%= conf.jsFiles %>',
                dest: '<%= conf.pkg.name %>.js'
            }
        },
        uglify: {
            jsmin: {
                options: {
                    mangle: true,
                    compress: true,
                    sourceMap: true,
                    banner : '<%= conf.banner %>'
                },
                src: '<%= conf.pkg.name %>.js',
                dest: '<%= conf.pkg.name %>.min.js'
            }
        },
        jasmine: {
            specs: {
                options: {
                    display: 'short',
                    summary: true,
                    specs:  '<%= conf.spec %>/*-spec.js',
                    helpers: [
                        '<%= conf.web %>/js/jasmine-jsreporter.js',
                        '<%= conf.spec %>/helpers/*.js'
                    ],
                    styles: [
                        '<%= conf.web %>/css/dc.css'
                    ],
                    version: '2.0.0',
                    outfile: '<%= conf.spec %>/index.html',
                    keepRunner: true
                },
                src: [
                    '<%= conf.pkg.name %>.js'
                ]
            }
        },
        jscs: {
            old: {
                src: ['<%= conf.spec %>/**/*.js'],
                options: {
                    validateIndentation: 4
                }
            },
            source: {
                src: ['<%= conf.src %>/**/*.js', '!<%= conf.src %>/{banner,footer}.js', 'Gruntfile.js',
                    'grunt/*.js', '<%= conf.web %>/stock.js'],
                options: {
                    config: '.jscsrc'
                }
            }
        },
        jshint: {
            source: {
                src: ['<%= conf.src %>/**/*.js', 'Gruntfile.js', 'grunt/*.js', '<%= conf.web %>/stock.js'],
                options: {
                    jshintrc: '.jshintrc',
                    ignores: ['<%= conf.src %>/banner.js', '<%= conf.src %>/footer.js']
                }
            }
        },
        watch: {
            scripts: {
                files: ['<%= conf.src %>/**/*.js', 'metagraph.css'],
                tasks: ['build', 'copy']
            },
            docs: {
                files: ['welcome.md', '<%= conf.src %>/**/*.js', 'metagraph.css'],
                tasks: ['docs']
            },
            reload: {
                files: ['<%= conf.pkg.name %>.js',
                    '<%= conf.pkg.name %>css',
                    '<%= conf.web %>/js/<%= conf.pkg.name %>.js',
                    '<%= conf.web %>/css/<%= conf.pkg.name %>.css',
                    '<%= conf.pkg.name %>.min.js'],
                options: {
                    livereload: true
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8888,
                    base: '.'
                }
            }
        },
        jsdoc: {
            dist: {
                src: ['welcome.md', '<%= conf.src %>/**/*.js', '!<%= conf.src %>/{banner,footer}.js'],
                options: {
                    destination: 'web/docs/html',
                    template: 'node_modules/ink-docstrap/template',
                    configure: 'jsdoc.conf.json'
                }
            }
        },
        jsdoc2md: {
            dist: {
                src: 'metagraph.js',
                dest: 'web/docs/api-latest.md'
            }
        },
        copy: {
            'dc-to-gh': {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            '<%= conf.pkg.name %>.css',
                            'node_modules/dc/dc.css',
                            'node_modules/font-awesome/css/font-awesome.css',
                            'node_modules/jquery-ui-dist/jquery-ui.css'
                        ],
                        dest: '<%= conf.web %>/css/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            '<%= conf.pkg.name %>.js',
                            '<%= conf.pkg.name %>.js.map',
                            '<%= conf.pkg.name %>.min.js',
                            '<%= conf.pkg.name %>.min.js.map',
                            'node_modules/crossfilter/crossfilter.js',
                            'node_modules/d3/d3.js',
                            'node_modules/lodash/lodash.js',
                            'node_modules/queue-async/build/queue.js',
                            'node_modules/dagre/dist/dagre.js',
                            'node_modules/webcola/WebCola/cola.js'
                          ],
                        dest: '<%= conf.web %>/js/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            'node_modules/font-awesome/fonts/*'
                        ],
                        dest: '<%= conf.web %>/fonts/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: 'node_modules/d3-tip/index.js',
                        dest: '<%= conf.web %>/js/d3-tip/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: 'node_modules/d3-tip/examples/example-styles.css',
                        dest: '<%= conf.web %>/css/d3-tip/'
                    }
                ]
            }
        },
        'gh-pages': {
            options: {
                base: '<%= conf.web %>',
                message: 'Synced from from master branch.'
            },
            src: ['**']
        },
        shell: {
            merge: {
                command: function (pr) {
                    return [
                        'git fetch origin',
                        'git checkout master',
                        'git reset --hard origin/master',
                        'git fetch origin',
                        'git merge --no-ff origin/pr/' + pr + ' -m \'Merge pull request #' + pr + '\''
                    ].join('&&');
                },
                options: {
                    stdout: true,
                    failOnError: true
                }
            },
            amend: {
                command: 'git commit -a --amend --no-edit',
                options: {
                    stdout: true,
                    failOnError: true
                }
            },
            hooks: {
                command: 'cp -n scripts/pre-commit.sh .git/hooks/pre-commit' +
                    ' || echo \'Cowardly refusing to overwrite your existing git pre-commit hook.\''
            }
        },
        browserify: {
            dev: {
                src: '<%= conf.pkg.name %>.js',
                dest: 'bundle.js',
                options: {
                    browserifyOptions: {
                        standalone: 'dc'
                    }
                }
            }
        }
    });

    // task aliases
    grunt.registerTask('build', ['concat', 'uglify']);
    grunt.registerTask('docs', ['build', 'copy', 'jsdoc', 'jsdoc2md']);
    grunt.registerTask('web', ['docs', 'gh-pages']);
    grunt.registerTask('server', ['docs', 'connect:server', 'watch:scripts']);
    grunt.registerTask('test', ['build', 'copy', 'jasmine:specs']);
    grunt.registerTask('lint', ['build', 'jshint', 'jscs']);
    grunt.registerTask('default', ['build', 'shell:hooks']);
};

module.exports.jsFiles = [
    'src/banner.js',   // NOTE: keep this first
    'src/core.js',
    'src/graph.js',
    'src/pattern.js',
    'src/graph_pattern.js',
    'src/footer.js'  // NOTE: keep this last
];
