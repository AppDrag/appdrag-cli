#!/usr/bin/env node
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const zip = require('bestzip');

module.exports = {
    LoginPrompt: () => {
      const questions = [
        {
          name: 'email',
          type: 'email',
          message: 'Enter your AppDrag e-mail address:',
          validate: function( value ) {
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
          validate: function(value) {
            if (value.length) {
              return true;
            } else {
              return 'Please enter your password.';
            }
          }
        }
      ];
      return inquirer.prompt(questions);
    },
    CallAPI: async (data) => {
        let response = await fetch('https://api.appdrag.com/api.aspx', {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          headers: {
          //   'Content-Type': 'application/json'
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
          body: data // body data type must match "Content-Type" header
        });
        return await response.json();
    },
    CallAPIGET: async (data) => {
      let response = await fetch('https://api.appdrag.com/api.aspx?'+data, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        headers: {
        //   'Content-Type': 'application/json'
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });
      return await response.json();
    },
    DataToFormURL: (data) => {
        var formBody = [];
        for (var property in data) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(data[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
        return formBody;
    },
    CodePrompt: () => {
        const questions = [
          {
            name: 'code',
            type: 'input',
            message: 'Enter your verification code:',
            validate: function( value ) {
              if (value.length) {
                return true;
              } else {
                return 'Please enter your verification code.';
              }
            }
          },
        ];
        return inquirer.prompt(questions);
    },
    isAuth: (config) => {
        return config.get('token');
    },
    displayHelp: () => {
        console.log('HELP');
    },
    zipFolder: async (folder) => {
      let date = new Date();
      let dest = `appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
      return zip({
        source: folder,
        destination: dest,
      }).then(() => {
        return dest;
      }).catch((err) => {
        return -1;
      });
    },
    PushPrompt: () => {
      const questions = [
        {
          name: 'appID',
          type: 'input',
          message: 'Enter your application ID:',
          validate: function( value ) {
            if (value.length) {
              return true;
            } else {
              return 'Please enter your application ID.';
            }
          }
        },
      ];
      return inquirer.prompt(questions);
    },
  };