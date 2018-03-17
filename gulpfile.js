'use strict';

var version = require('./package.json').version;

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var log = require('gulplog');
var sass = require('gulp-sass');
var rename = require('gulp-rename');

gulp.task('t3dapp', function () {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './src/Tyria3DApp.js',
        glob: './src/**/*.js',
        debug: true
    });

    return b.bundle()
        .pipe(source(`T3DAPP-${version}.min.js`))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
            // Add transformation tasks to the pipeline here.
            .pipe(uglify())
            .on('error', log.error)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist/build/'));
});

gulp.task('three-bundle', function(){
    return gulp.src([
        './dist/vendor/three/three.js',
        './dist/vendor/three/DDSLoader.js',
        './dist/vendor/three/FirstPersonControls.js',
        './dist/vendor/three/OBJLoader.js',
        './dist/vendor/three/OrbitControls.js',
        './dist/vendor/three/PointerLockControls.js',
        './dist/vendor/three/Projector.js',
        './dist/vendor/three/Raycaster.js',
        './dist/vendor/three/Stats.js',
        './dist/vendor/three/TrackballControls.js'])
    .pipe(concat({ path: 'three-bundle.js'}))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/build/vendor'));
});

gulp.task("sass", function () {
    return gulp.src('./dist/css/sass/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename('__3d.css'))
        .pipe(gulp.dest('./dist/css'));
});