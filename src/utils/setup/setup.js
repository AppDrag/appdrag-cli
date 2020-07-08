const inquirer = require('inquirer');
const fetch = require('node-fetch');
const { config } = require ('../common');

const loginPrompt = () => {
  const questions = [
    {
      name: 'email',
      type: 'email',
      message: 'Enter your AppDrag e-mail address:',
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your AppDrag e-mail address.';
        }
      }
    },
    {
      name: 'password',
      type: 'password',
      message: 'Enter your password:',
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your password.';
        }
      }
    }
  ];
  return inquirer.prompt(questions);
}

const codePrompt = () => {
  const questions = [
    {
      name: 'code',
      type: 'text',
      message: 'Enter your verification code:',
      validate: function (value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your AppDrag verification code.';
        }
      }
    }
  ];
  return inquirer.prompt(questions);
}

const requestLogin = async (data) => {
  let opts = {
    method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: data,
  }
  let response = await fetch('https://api.appdrag.com/api.aspx', opts);
  response = await response.json();
  if (response.status === 'OK' || response.Table) {
    return response;
  } else {
    return false;
  }
}

const storeUserInfo = (userData) => {
  let parsedData = {
    id: userData.id,
    email: userData.email,
    firstname: userData.firstName,
    lastname: userData.lastName,
    token: userData.token,
    refreshToken: userData.refreshToken,
  }
  config.set(parsedData);
  return true;
}

module.exports = { loginPrompt, requestLogin, codePrompt, storeUserInfo }
