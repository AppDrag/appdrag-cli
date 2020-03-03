#!/usr/bin/env node
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const inquirer = require('inquirer');
const archiver = require('archiver')
var FormData = require('form-data');
const zlib = require('zlib');
const chalk = require('chalk');
const unzipper = require('unzipper');
const figlet = require('figlet');

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
        console.log(
            chalk.magenta(
            figlet.textSync('AppDrag', { horizontalLayout: 'fitted' })
            )
        );
        console.log(chalk.underline('appdrag-cli v1.00'));
        console.log(chalk.bold('Usage'),' : appdrag-cli', chalk.yellow('command'), chalk.gray('<args>'));
        console.log(chalk.bold('Available commands :'));
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
        console.log(chalk.blue('\n-- Help'));
        console.log('  ', chalk.yellow('help'), ' \t\t\t\t\tDisplays this help text');
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
      for (var x = 0; x < res.length; x++) {
        let newPath;
        if (curPath == '') {
          newPath = res[x].path;
        } else {
          newPath = curPath+'/'+res[x].path;
        }
        if (res[x].type == 'FOLDER') {
          if (res[x].path === 'CloudBackend'){
            continue;
          } else {
            try{
                fs.mkdirSync(newPath);
            } catch(ex){

            }
            data.path = newPath;
            let newres = await this.CallAPIGET(data);
            await this.parseFiles(data, newres, newPath);
          }
        } else {
          let file = fs.createWriteStream(newPath);
          console.log('Writing... ' + (data.appID+'/'+newPath).replace(/appdrag/g, "atos"));
          https.get('https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/'+data.appID+ '/' + newPath, (response) => {
            if ( response.headers['content-encoding'] == 'gzip' && response.headers['content-length'] > 0){
                response.pipe(zlib.createGunzip()).pipe(file);
            } else{
              response.pipe(file);
            }
            file.on('finish', () => {
              file.close()
            });
          }).on('error', function(err) {
            fs.unlinkSync(newPath);
          });          
          }
      }
    },
    parseFunctions : async (funcs_res, token, appID, func = false) => {
        let funcs = funcs_res.Table
        let data = {
            command : 'CloudAPIExportFile',
            token : token,
            appID : appID,
            file: 'main.js'
        };
        if (!fs.existsSync('CloudBackend')) {
            fs.mkdirSync('CloudBackend');
            fs.mkdirSync('CloudBackend/code');
        } else if (!fs.existsSync('CloudBackend/code')) {
            fs.mkdirSync('CloudBackend/code');
        }
        for (let x = 0; x < funcs.length; x++) {
            if (func && funcs[x].id != func) {
                continue;
            }
            if (funcs[x].contentType !== 'FOLDER') {
                let path = 'CloudBackend/code/'+ funcs[x].id.toString(10);
                //fs.mkdirSync(funcs[x].id);
                data.functionID = funcs[x].id;
                if (funcs[x].parentID !== -1) {
                    data.parentID = funcs[x].parentID;
                } else {
                    delete data.parentID;
                }
                let opts = {
                    method : 'POST',
                    headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
                    body : new URLSearchParams(data)
                };
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                let filePath = path + '/' + appID +'_'+funcs[x].id+'.zip';
                let file = fs.createWriteStream(filePath);
                await fetch('https://api.appdrag.com/CloudBackend.aspx',opts).then(res => res.json()).then(res => {
                    https.get(res.url, function(res) {
                        if (res.headers['content-length'] > 0) {
                            res.pipe(file);
                            file.on('finish', () => {
                                console.log(chalk.green('Done writing ' + appID +'_'+funcs[x].id+'.zip'));
                                console.log(chalk.green('Unzipping now...'));
                                fs.createReadStream(filePath)
                                .pipe(unzipper.Extract({ path: path }));
                                file.close();
                                fs.unlinkSync(filePath);
                            });
                        }
                    });
                });
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