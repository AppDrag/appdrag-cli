
/**
 * modules
 */
const fs = require('fs');
const chalk = require('chalk');
const Configstore = require('configstore');
const fetch = require('node-fetch');
const util = require('util');
const streamPipeline = util.promisify(require('stream').pipeline);

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
  console.log(chalk.underline('appdrag v1.3.0'));
  console.log(chalk.bold('Usage'), ': appdrag', chalk.yellow('command'), chalk.gray('<args>'), chalk.cyan('-options'));
  console.log(chalk.bold('\nOptions:'));
  console.log(chalk.cyan('-a [appId]'),': Input your appId directly in the command line instead of using', chalk.yellow('init'), '.');
  console.log(chalk.cyan('-t [token]'),': Input your token directly in the command line instead of using', chalk.yellow('login'), '.');
  console.log(chalk.cyan('-i [suffix]'),': (',chalk.yellow('fs pull'), 'specific) Only pulls files with the specified suffix.');
  console.log(chalk.cyan('-e [suffix]'),': (',chalk.yellow('fs pull'), 'specific) Exclude files with the specified suffix.');
  console.log(chalk.bold('Available commands:'));
  console.log(chalk.blue('\n-- Setup'));
  console.log('  ', chalk.yellow('login'), '\t\t\t\t\tLogin to our service')
  console.log('  ', chalk.yellow('init'), '\t<app-id> \t\t\tLink folder with your app-id')
  console.log(chalk.blue('\n-- Filesystem'));
  console.log('  ', chalk.yellow('fs push'), ' \t<folder-to-push> <opt: dest>\tPush a local folder to your CloudBackend');
  console.log('  ', chalk.yellow('fs pull'), ' \t<source-folder> \t\tPull folder from AppDrag to a local folder');
  console.log(chalk.blue('\n-- Database - CloudBackend'));
  console.log('  ', chalk.yellow('db push'), ' \t<sql-file> \t\t\tRestore the database from the .sql backup provided');
  console.log('  ', chalk.yellow('db pull'), ' \t\t\t\t\tRetrieves .sql file of your database');
  console.log(chalk.blue('\n-- Api - CloudBackend'));
  console.log('  ', chalk.yellow('api push'), ' \t<opt: function_id>\t\tPull all (or one) function(s) from CloudBackend to a local folder');
  console.log('  ', chalk.yellow('api pull'), ' \t<opt: function_id>\t\tPush all (or one) function(s) from a local folder to your CloudBackend');
  console.log(chalk.blue('\n-- Export'));
  console.log('  ', chalk.yellow('export'), ' \t<path>\t\t\t\tExport your project to the specified folder');
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

const downloadFile = async (path, appId) => {
  let file = fs.createWriteStream(path);
  let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
    method: 'GET'
  });
  if (!response.ok) console.log(`${response.statusText}`);
  else {
    try {
      await streamPipeline(response.body, file);
      console.log(chalk.green(`done writing : ${path}`));
    } catch (err) {
      console.log(chalk.red(`${err}`));
    }
  }
};

module.exports = {
  config,
  setupCheck,
  help,
  checkAppId,
  checkLogin,
  currFolder,
  refreshToken,
  tokenObj,
  downloadFile
}
