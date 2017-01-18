const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const pug = require('gulp-pug');
const path = require('path');
const autoprefixer = require('gulp-autoprefixer');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const webserver = require('gulp-webserver');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const buffer = require('vinyl-buffer');
const watchify = require('watchify');
const minimist = require('minimist');
const _ = require('lodash');

const {argv} = process;
const src = 'src';
const dst = 'docs/';
const scssPath = path.join(src, '*.scss');
const indexjsxPath = path.join(src, 'index.jsx');
const jsxPath = path.join(src, '*.jsx');
const pugPath = path.join(src, '*.pug');
const {_: [taskName]} = minimist(_.slice(argv, 2));
let bundler = browserify({
	entries: [indexjsxPath],
	debug: true,
	transform: [
		[babelify, { presets: ['es2015', 'react'] }]
	]
});
bundler = taskName === 'watch' ? watchify(bundler) : bundler;

gulp.task('sass', () => {
	gulp.src(scssPath)
		.pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
		.pipe(sass.sync())
		.pipe(autoprefixer())
		.pipe(gulp.dest(dst));
});

gulp.task('jsx', () => {
	process.env.NODE_ENV = 'production';
	bundler
		.bundle()
		.on('error', (err) => console.log(`Error : ${err.message}`))
		.pipe(source('index.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(uglify())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(dst));
});

gulp.task('pug', () => {
	gulp.src(pugPath)
		.pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
		.pipe(pug({}))
		.pipe(gulp.dest(dst));
});

gulp.task('webserver', () => {
	gulp.src(dst)
		.pipe(webserver({
			host: 'localhost',
			port: 6280,
			livereload: false
		}));
});

gulp.task('watch', ['webserver', 'sass', 'jsx', 'pug'], () => {
	gulp.watch(scssPath, ['sass']);
	gulp.watch(jsxPath, ['jsx']);
	gulp.watch(pugPath, ['pug']);
});

gulp.task('default', ['sass', 'jsx', 'pug']);