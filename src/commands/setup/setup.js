const CryptoJS = require('crypto-js');
const fs = require('fs');

const Spinner = require('cli-spinner').Spinner;
var spinner = new Spinner('Logging in.... %s');
spinner.setSpinnerString(18);

const chalk = require('chalk');
const clear = require('clear');
const { loginPrompt, requestLogin, codePrompt, storeUserInfo } = require('../../utils/setup/setup');

const init = async (args) => {
  if (args.length <= 0) {
    console.log(chalk.red('No APP_ID supplied. Please read the help below.'));
    return false;
  }
  appID = args[0];
  fs.writeFile('.appdrag', JSON.stringify({ appID: appID }), (err) => {
    if (err) throw err;
    console.log(chalk.green(`Config file successfully written, you won't need to specify your appID when pushing from this directory.`));
  });
};

const login = async () => {
  clear();
  console.log(chalk.magenta('AppDrag'));
  let inputs = await loginPrompt();
  let toHash = 12 + inputs.password + "APPALLIN";
  let hashPassword = CryptoJS.SHA512(toHash).toString();
  let data = new URLSearchParams({
    'command': 'Login',
    'email': inputs.email,
    'password': hashPassword
  });
  spinner.start();
  if (!await requestLogin(data)) {
    console.log(chalk.redBright('\nIncorrect email and/or password'));
    spinner.stop();
    return;
  }
  spinner.stop();
  console.log(chalk.greenBright('\nA verification code has been sent to your email'));
  inputs = await codePrompt();
  data.append('verificationCode', inputs.code);
  userData = await requestLogin(data);
  if (!userData) {
    console.log(chalk.redBright('Incorrect verification code.'));
    return;
  }
  storeUserInfo(userData.Table[0]);
  console.log(chalk.green('You are now logged in'));
};

module.exports = { login, init }