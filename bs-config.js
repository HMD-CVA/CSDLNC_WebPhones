module.exports = {
  proxy: "http://localhost:3000",   // đang chạy Express port 3000
  files: ["views/**/*.handlebars", "public/**/*.js", "public/**/*.css"],
  port: 3001,                       // BrowserSync chạy ở port 3001
  reloadDelay: 500
};
