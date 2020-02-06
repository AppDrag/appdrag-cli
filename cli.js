#!/usr/bin/env node
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const inquirer = require('inquirer');
const archiver = require('archiver')
var FormData = require('form-data');
const zlib = require('zlib');


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
    CallAPIGET : async (data, url = 'https://api.appdrag.com/api.aspx?') => {
      var opts = {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {'Content-Type' : 'application/x-www-form-urlencoded;charset=utf-8'},
        body: new URLSearchParams(data),
      };
      let response = await fetch(url, opts);
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
    parseFiles : async function(data, res, curPath) {
        console.log(curPath);
        console.log(res);
        for (var x = 0; x < res.length; x++) {
          //console.log(curPath+'/'+res[x].path);
          if (curPath == '') {
            var newPath = res[x].path;
          } else {
            var newPath = curPath+'/'+res[x].path;
          }
          if (res[x].type == 'FOLDER') {
            // console.log(curPath+'/'+res[x].path);
            if (!fs.existsSync(newPath)) {
              fs.mkdirSync(newPath);
            }
            data.path = newPath;
            let newres = await this.CallAPIGET(data);
            await this.parseFiles(data, newres, newPath);
          } else {
            let file = fs.createWriteStream(newPath);
            https.get('https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/'+data.appID+'/'+newPath, (response) => {
              if (response.headers['content-encoding'] == 'gzip') {
                response.pipe(zlib.createGunzip().pipe(file));
              } else {
                response.pipe(file);
              }
              console.log('https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/'+data.appID+'/'+newPath);
              console.log('Writing... ' + newPath);
              file.on('finish', () => {
                console.log('Done ! '+ newPath);
                file.close();
              });
            }).on('error', function(err) {
              fs.unlink(newPath);
            });
          }
        }
        if (curPath == '') {
          console.log('##########################');
        }
    },
    parseFunctions : async (funcs_res, token, appID) => {
      let route = funcs_res.route;
      let funcs = funcs_res.Table
      let data = {
        command : 'CloudDBOpenCode',
        token : token,
        appID : appID,
        file: 'main.js'
      };
      for (let x = 0; x < funcs.length; x++) {
        if (funcs[x].contentType === 'FILE') {
          //fs.mkdirSync(funcs[x].id);
          data.id = funcs[x].id;
          if (funcs[x].parentID !== -1) {
            data.parentID = funcs[x].parentID;
          } else {
            delete data.parentID;
          }
          let opts = {
            method : 'POST',
            headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
            body : new URLSearchParams(data)
          }
          console.log(opts,data);
          fs.mkdirSync(funcs[x].id.toString(10));
          let file = fs.createWriteStream(funcs[x].id+'/main.js');
          await fetch('https://api.appdrag.com/CloudBackend.aspx',opts).then(res => res.json()).then(res => {
            let gunzip = zlib.createGunzip();
            https.get(res.url, function(res) {
              let body = '';
              res.pipe(gunzip);
              gunzip.on('data', function (data) {
                  body += data;
              });
              gunzip.on('end', function() {
                file.write(body);
              });
              file.on('finish', () => {
                file.close()
              });
            });
          });
        } else {
          console.log('isNotFunc');
        }
      };
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
    TokenRefresh : async (refreshToken) => {
      let data = {command:'RefreshToken', refreshToken : refreshToken};
      let opts = {
        method : 'POST',
        headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
        body : new URLSearchParams(data),
      }
      let response = await fetch('https://api.appdrag.com/api.aspx',opts);
      return response.json();
    }
  };