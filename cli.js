#!/usr/bin/env node
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const zip = require('bestzip');
var FormData = require('form-data');


module.exports = {
    LoginPrompt : () => {
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
    CallAPI : async (data, url = 'https://api.appdrag.com/api.aspx') => {
      if (url !== 'https://api.appdrag.com/api.aspx') {
        var contentType = ''
      } else {
        var contentType = {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'}
      }
      console.log(contentType + 'ctype');
      let response = await fetch(url, {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          headers: contentType,
          body: data // body data type must match "Content-Type" header
        });
        return await response.json();
    },
    CallAPIGET : async (data,payload) => {
      let response = await fetch('https://api.appdrag.com/api.aspx?'+data, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
        'Content-Type': 'application/json'
        //'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: payload
      });
      return await response.json();
    },
    DataToFormURL : (data) => {
        var formBody = [];
        for (var property in data) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(data[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
        return formBody;
    },
    DataToFormData : (data) => {
      var formdata = new FormData()
      for (var key in data) {
        let value = data[key];
        formdata.append(key,value);
      }
      return formdata;
    },
    CodePrompt : () => {
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
    isAuth : (config) => {
        return config.get('token');
    },
    displayHelp : () => {
        console.log('HELP');
    },
    zipFolder : async (folder) => {
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
    PushPrompt : () => {
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
    PayLoadBuilder : (zip,appID) => {
      const payload = {
        expiration: new Date().toISOString(),
        conditions: [
          {acl:'public-read'},
          {bucket: 'dev.appdrag.com'},
          {'Content-Type': "application/x-zip-compressed"},
          {success_action_status:'200'},
          {key: `${appID}/${zip}.zip`},
          {'x-amz-meta-qqfilename': `${zip}.zip`},
          ["content-length-range", '0', '300000000'],
        ]
      };
      return payload;
    },
  };