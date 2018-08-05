const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('gulp-browserify');
const serve = require('gulp-serve')

const jsSourcePath = 'js/**/*.js';

gulp.task('default', ['scripts'], () => {
  gulp.watch(jsSourcePath, ['scripts']);
});

gulp.task('scripts', () => {
  gulp
    .src(jsSourcePath)
    .pipe(
      babel({
        presets: ['es2015']
      })
    )
    .pipe(browserify())
    .on('error', er => console.log(er))
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('serve', serve({
  root: ['./'],
  port: 8000,
}));
