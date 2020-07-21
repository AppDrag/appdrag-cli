
/**
 * modules
 */
const fs = require('fs');
const chalk = require('chalk');
const Configstore = require('configstore');
const fetch = require('node-fetch');

const APP_ID_PATH = '.appdrag';
const currFolder = process.cwd();
class Token {

  constructor(_token, _method) {
    this.token = _token;
    this.method = _method;
  }

  setToken (_token) {
    this.token = _token;
  }

  setMethod (_method) {
    this.method = _method;
  }
}
var tokenObj = new Token('DEFAULT','DEFAULT');
/**
 * Config file to check if user is logged on this machine
 */
const packageJson = require('../../package.json');
const config = new Configstore(packageJson.name);

const setupCheck = (argOpts) => {
  if (!checkLogin() && !argOpts.t) {
    console.log(chalk.red('Please login first'));
    return false;
  }
  if (argOpts.t) {
    tokenObj.setToken(argOpts.t);
    tokenObj.setMethod('option');
  }
  let appId = checkAppId();
  if (!appId) {
    if (argOpts.a) {
      return argOpts.a;
    } else {
      console.log(chalk.red('Run init first'));
      return false;
    }
  }
  return appId;
}

const checkAppId = () => {
  if (fs.existsSync(APP_ID_PATH)) {
    let fileContent = fs.readFileSync(APP_ID_PATH);
    try {
      return JSON.parse(fileContent).appID;
    } catch {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * Check if logged in
 */
const checkLogin = () => {
  if (config.get('token')) {
     tokenObj.setToken(config.get('token'));
     tokenObj.setMethod('login');
    return true;
  } else {
    return false;
  }
}

/**
 * Displays help
 */
const help = () => {
  console.log(
    chalk.blue(
      'AppDrag'
    )
  );
  console.log(chalk.underline('appdrag-cli v1.01'));
  console.log(chalk.bold('Usage'), ': appdrag-cli', chalk.yellow('command'), chalk.gray('<args>'), chalk.cyan('-options'));
  console.log(chalk.bold('Options:'));
  console.log(chalk.blue('-a [appId]: Input your appId directly in the command line instead of using `init`.'));
  console.log(chalk.blue('-t [token]: Input your appId directly in the command line instead of using `init`.'));
  console.log(chalk.blue('-i [suffix]: (fs pull specific) Only pulls files with the specified suffix.'));
  console.log(chalk.blue('-e [suffix]: (fs pull specific) Exclude files with the specified suffix from bein pulled.'));
  console.log(chalk.bold('Available commands:'));
  console.log(chalk.blue('\n-- Setup'));
  console.log('  ', chalk.yellow('login'), '\t\t\t\t\tLogin to our service')
  console.log('  ', chalk.yellow('init'), '\t<app-id> \t\t\tLink folder with your app-id')
  console.log(chalk.blue('\n-- Filesystem'));
  console.log('  ', chalk.yellow('fs push'), ' \t<folder-to-push> <opt: dest>\tPush folder to your project files');
  console.log('  ', chalk.yellow('fs pull'), ' \t<source-folder> \t\tPull folder from your project files');
  console.log(chalk.blue('\n-- Database - CloudBackend'));
  console.log('  ', chalk.yellow('db push'), ' \t<sql-file> \t\t\tRestore the database from the .sql backup provided');
  console.log('  ', chalk.yellow('db pull'), ' \t\t\t\t\tRetrieves .sql file of your database');
  console.log(chalk.blue('\n-- Api - CloudBackend'));
  console.log('  ', chalk.yellow('api push'), ' \t<opt: function_id>\t\tPull all (or one) function(s) from your CloudBackend');
  console.log('  ', chalk.yellow('api pull'), ' \t<opt: function_id>\t\tPush all (or one) function(s) of your CloudBackend');
  console.log(chalk.blue('\n-- Deploy'));
  console.log('  ', chalk.yellow('deploy fs'), ' \t<path>\t\t\t\tDeploys all your non-CloudBackend related files to the specified folder');
  console.log('  ', chalk.yellow('deploy api'), ' \t<path>\t\t\t\tDeploys all the functions from your CloudBackend to the specified folder');
  console.log('  ', chalk.yellow('deploy db'), ' \t<path>\t\t\t\tDeploys the database from your CloudBackend to the specified folder');
  console.log(chalk.blue('\n-- Help'));
  console.log('  ', chalk.yellow('help'), ' \t\t\t\t\tDisplays this help text');
};

const refreshToken = async (refreshToken) => {
  let data = { command: 'RefreshToken', refreshToken: refreshToken };
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  }
  let response = await fetch('https://api.appdrag.com/api.aspx', opts);
  return response.json();
};

module.exports = {
  config,
  setupCheck,
  help,
  checkAppId,
  checkLogin,
  currFolder,
  refreshToken,
  tokenObj
}