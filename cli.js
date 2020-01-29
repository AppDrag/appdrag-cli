#!/usr/bin/env node
const fetch = require('node-fetch');
const fs = require('fs');
const inquirer = require('inquirer');
const archiver = require('archiver')
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
        var opts = {
          method : 'PUT',
          headers : {'Content-length' : data.len},
          body: data.fdata
        }
      } else {
        var opts = {
          method : 'POST',
          headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
          body:data,
        }
      }
      let response = await fetch(url, opts);
      if (url !== 'https://api.appdrag.com/api.aspx') {
        return await response;
      } else {
        return await response.json();
      }
    },
    CallAPIGET : async (data, payload, url = 'https://api.appdrag.com/api.aspx?') => {
      if (url === 'https://api.appdrag.com/api.aspx?') {
        var opts = {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          headers: {'Content-Type' : 'application/json'},
          body : payload
        };
      } else {
        var opts = {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          headers: {'Content-Type' : 'application/x-www-form-urlencoded;charset=utf-8'},
          body: new URLSearchParams(data),
        };
      }
      let response = await fetch(url+data, opts);
      try {
        return await response.json();
      } catch {
        return await response;
      }
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
      console.log('This is the help manual for appdrag-cli :');
      console.log('Usage : appdrag-cli <command> [args..]');
      console.log('Available commands :\n- login (no arguments necessary)\n- init [APP_ID]\n- push [FOLDER_PATH] [DEST_FOLDER] (leave DEST_FOLDER empty to push to root \'/\'.)');
    },
    zipFolder : async (folder, dest, curFolder) => {
      return new Promise( (resolve, reject) => {
        if (!fs.existsSync(curFolder+'/'+folder)) {
          reject();
          return;
        }
        let output = fs.createWriteStream(curFolder+ '/' + dest);
        var archive = archiver('zip', {
          zlib : { level : 9 },
        });
        output.on('close', () => {
          resolve(dest.replace('.zip',''));
          return;
        });
        archive.on('error', function(err) {
          reject(err);
          return;
        });
        archive.pipe(output);
        archive.directory(folder + '/', false);
        archive.finalize();
      })
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