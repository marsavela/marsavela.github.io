/*
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var browserify = require('browserify');
var browserSync = require('browser-sync');
var buffer = require('vinyl-buffer');
var del = require('del');
var exclude = require('gulp-ignore').exclude;
var fs = require('fs');
var gulp = require('gulp');
var merge = require('merge-stream');
var path = require('path');
var reload = browserSync.reload;
var requireDir = require('require-dir');
var runSequence = require('gulp4-run-sequence');
var source = require('vinyl-source-stream');

var $ = require('gulp-load-plugins')();

function errorHandler(error) {
  console.error(error.stack);
  this.emit('end'); // http://stackoverflow.com/questions/23971388
}


// Lint JavaScript
gulp.task('js', function() {
  var streams = [];
  if (fs.existsSync('app/')) {
    fs.readdirSync('app/').forEach(file => {
      if (file.match(/^[^_].+\.js$/)) {
        streams.push(browserify('app/' + file)
            .bundle()
            .pipe(source(file))
            .pipe(buffer())
            .pipe(gulp.dest('.tmp/'))
            .pipe($.uglify())
            .pipe(gulp.dest('dist/')));
      }
    });
  }

  return merge(streams);
});

// Optimize Images
gulp.task('media', function () {
  var stream = gulp.src('app/images/**/*')
    .pipe($.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{removeTitle: true}],
    }))
    .pipe(gulp.dest('dist/images'))
    .pipe($.size({title: 'images'}));

  return stream;
});

// Copy All Files At The Root Level (app) and lib
gulp.task('copy', function () {
  return gulp.src([
    'app/*',
    '!app/html',
    '!app/*.scss'
  ], {dot: true})
    .pipe(gulp.dest('dist'))
    .pipe($.size({title: 'copy'}));
});


// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
  // For best performance, don't add Sass partials to `gulp.src`
  return gulp.src([
      'app/*.scss',
      'app/*.css',
    ])
    .pipe($.changed('styles', {extension: '.scss'}))
    .pipe($.sass({
      style: 'expanded',
      precision: 10,
      quiet: true
    }).on('error', errorHandler))
    .pipe(gulp.dest('.tmp/'))
    // Concatenate And Minify Styles
    .pipe($.if('*.css', $.csso()))
    .pipe(gulp.dest('dist/'))
    .pipe($.size({title: 'styles'}));
});

// HTML
gulp.task('html', function () {
  return gulp.src([
      'app/*.html',
    ])
    .pipe(gulp.dest('.tmp'))
    .pipe($.if('*.html', $.minifyHtml()))
    .pipe(gulp.dest('dist'))
    .pipe($.size({title: 'html'}));
});

// Clean Output Directory
gulp.task('clean', function(cb) {
  del.sync(['.tmp', 'dist']);
  $.cache.clearAll();
  cb();
});

// Watch Files For Changes & Reload
gulp.task('serve', gulp.series('styles', 'js', 'html', function () {
  browserSync({
    notify: false,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', 'app']
    }
  });

  gulp.watch('app/*.html', gulp.series('html', reload));
  gulp.watch('app/*.{scss,css}', gulp.series('styles', reload));
  gulp.watch('app/*.js', gulp.series('js', reload));
  gulp.watch('app/images/**/*', gulp.series(reload));
}));

// Build Production Files, the Default Task
gulp.task('default', gulp.series('clean', function (cb) {
  runSequence('styles',
      gulp.series('js', 'html', 'media', 'copy'),
      cb);
}));

// Build and serve the output from the dist build
gulp.task('serve:dist', gulp.series('default', function () {
  browserSync({
    notify: false,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: 'dist'
  });
}));

// Deploy to GitHub pages
gulp.task('deploy', function() {
  return gulp.src('dist/**/*', {dot: true})
      .pipe($.ghPages());
});
