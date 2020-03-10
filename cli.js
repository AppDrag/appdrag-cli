#!/usr/bin/env node
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const inquirer = require('inquirer');
const archiver = require('archiver')
var FormData = require('form-data');
const chalk = require('chalk');
const unzipper = require('unzipper');
const figlet = require('figlet');

module.exports = {
  LoginPrompt: () => {
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
  },
  CallAPI: async (data, url = 'https://api.appdrag.com/api.aspx') => {
    if (url !== 'https://api.appdrag.com/api.aspx') {
      var opts = {
        method: 'PUT',
        headers: { 'Content-length': data.len },
        body: data.fdata
      }
    } else {
      var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: data,
      }
    }
    let response = await fetch(url, opts);
    if (url !== 'https://api.appdrag.com/api.aspx') {
      return await response;
    } else {
      return await response.json();
    }
  },
  CallAPIGET: async (data, url = 'https://api.appdrag.com/api.aspx?') => {
    var opts = {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams(data),
    };
    let response = await fetch(url, opts);
    try {
      return await response.json();
    } catch {
      return await response;
    }
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
  DataToFormData: (data) => {
    var formdata = new FormData()
    for (var key in data) {
      let value = data[key];
      formdata.append(key, value);
    }
    return formdata;
  },
  CodePrompt: () => {
    const questions = [
      {
        name: 'code',
        type: 'input',
        message: 'Enter your verification code:',
        validate: function (value) {
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
    console.log(
      chalk.blue(
        figlet.textSync('AppDrag', { horizontalLayout: 'fitted' })
      )
    );
    console.log(chalk.underline('appdrag-cli v1.00'));
    console.log(chalk.bold('Usage'), ': appdrag-cli', chalk.yellow('command'), chalk.gray('<args>'));
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
    console.log(chalk.blue('\n-- Help'));
    console.log('  ', chalk.yellow('help'), ' \t\t\t\t\tDisplays this help text');
  },
  zipFolder: async (folder, dest, curFolder) => {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(curFolder + '/' + folder)) {
        reject();
        return;
      }
      let output = fs.createWriteStream(curFolder + '/' + dest);
      var archive = archiver('zip', {
        zlib: { level: 9 },
      });
      output.on('close', () => {
        resolve(dest.replace('.zip', ''));
        return;
      });
      archive.on('error', function (err) {
        reject(err);
        return;
      });
      archive.pipe(output);
      archive.directory(folder + '/', false);
      archive.finalize();
    })
  },
  parseFiles: function (data, res, curPath, lastfile, deploy = false) {
    return new Promise(async(resolve, reject) => {
      for (var x = 0; x < res.length; x++) {
        let newPath;
        if (curPath == '') {
          newPath = res[x].path;
        } else {
          newPath = curPath + '/' + res[x].path;
        }
        if (res[x].type == 'FOLDER') {
          if (res[x].path === 'CloudBackend') {
            continue;
          } else {
            try {
              fs.mkdirSync(newPath);
            } catch (ex) { }
            data.path = newPath;
            let newres = await this.CallAPIGET(data);
            // console.log(newres,newPath,curPath)
            let newlastfile = newres[newres.length - 1].path;
            await this.parseFiles(data, newres, newPath, newPath+'/'+newlastfile, deploy);
          }
        } else {
          if (deploy) {
            const regex = RegExp(/(.html|.js|.xml|.css|.txt)$/gm);
            if (fs.existsSync(newPath) && !(regex.test(newPath))) {
              if (x+1 === res.length) resolve();
              else continue;
            }
          }
          let file = fs.createWriteStream(newPath, { encoding: 'utf8' });
          console.log('Writing... ' + ('./' + newPath).replace(/appdrag/g, "atos"));
          let response = await fetch('https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/' + data.appID + '/' + newPath, {
            method: 'GET',
          });
          response.body.pipe(file);
          file.on('finish', () => {
            console.log('done ! ' + newPath);
            file.close();
            if (newPath === lastfile) {
              resolve();
            }
          });
        }
      }
      if (res[x-1].type === 'FOLDER') {
        resolve();
      }
    });
  },
  getFiles: function (data, res, path, lastfile, deploy = false) {
    return new Promise(async (resolve, reject) => {
      await this.parseFiles(data, res, path, lastfile, deploy);
      return resolve();
    });
  },
  create_script: async (api_data) => {
    let modules = [];
    api_data.forEach(func => {
      if (func.libs) {
        let libs = JSON.parse(func.libs);
        libs.forEach(lib => {
          if (modules.indexOf(lib) < 0) {
            modules.push(lib);
          }
        });
      }
    });
    fs.writeFileSync('./install.sh', 'npm install ' + modules.join('\nnpm install ').replace(/,/g, " "));
  },
  parseFunctions: async (funcs_res, token, appID, folderName, func = false) => {
    let mainPaths = {
      id : ['CloudBackend','code'],
      name : [func, 'api']
    };
    if (folderName === 'name') {
      let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', {
        method:'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({command:'CloudDBGetSecretKey', token: token, appID: appID})
      });
      res = await res.json();
      var APIKEY = res.secret_key;
    }
    let funcs = funcs_res.Table;
    let data = {
      command: 'CloudAPIExportFile',
      token: token,
      appID: appID,
      file: 'main.js'
    };
    if (!fs.existsSync(mainPaths[folderName].join('/'))) {
      fs.mkdirSync(mainPaths[folderName][0]);
      fs.mkdirSync(mainPaths[folderName].join('/'));
    } else if (!fs.existsSync(mainPaths[folderName].join('/'))) {
      fs.mkdirSync(mainPaths[folderName].join('/'));
    }
    for (let x = 0; x < funcs.length; x++) {
      if (func && funcs[x].id != func && folderName === 'id') {
        continue;
      }
      if (funcs[x].contentType !== 'FOLDER') {
        let path = mainPaths[folderName].join('/') + '/' + funcs[x][folderName].toString(10);
        //fs.mkdirSync(funcs[x].id);
        data.functionID = funcs[x].id;
        if (funcs[x].parentID !== -1) {
          data.parentID = funcs[x].parentID;
        } else {
          delete data.parentID;
        }
        let opts = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
          body: new URLSearchParams(data)
        };
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }
        if (folderName === 'name') {
          let envFile = fs.createWriteStream(path+'/.env');
          envFile.write('APIKEY='+APIKEY);
          if (funcs[x].envVars) {
            let envVars = JSON.parse(funcs[x].envVars)
            delete envVars.APPID;
            delete envVars.APIKEY;
            if (Object.keys(envVars).length > 0) {
              Object.keys(envVars).forEach(val => {
                envFile.write('\n'+val+'='+envVars[val]);
              });
            }
          }
          if (funcs[x].type === 'SQLSELECT') {
            console.log(chalk.green('Writing SQLSELECT function :' + funcs[x].name + '...'))
            fs.writeFileSync(path + '/main.json', JSON.stringify(funcs[x]));
            fs.writeFileSync(path + '/main.sql', funcs[x].sourceCode);
            continue;
          }
        }
        let filePath = path + '/' + appID + '_' + funcs[x].id + '.zip';
        let file = fs.createWriteStream(filePath);
        await fetch('https://api.appdrag.com/CloudBackend.aspx', opts).then(res => res.json()).then(res => {
          https.get(res.url, function (res) {
            if (res.headers['content-length'] > 0) {
              res.pipe(file);
              file.on('finish', () => {
                console.log(chalk.green('Done writing ' + appID + '_' + funcs[x].id + '.zip'));
                file.close();
              });
              file.on('close', () => {
                console.log(chalk.green('Unzipping now...'));
                fs.createReadStream(filePath)
                  .pipe(unzipper.Extract({ path: path })).on('close', () => {
                    fs.unlinkSync(filePath);
                    if (folderName === 'name' && fs.existsSync(path+'/'+'main.zip')) {
                      fs.unlinkSync(path+'/'+'main.zip');
                    }
                  });
              });
            }
          });
        });
      }
    };
  },
  downloadResources: () => {
    return new Promise(async(resolve, reject) => {
      let urls = [
        'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/css/appdrag.css',
        'https://cf.appdrag.com/resources/appallin-universal-theme.css',
        'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/js/appdrag.js'
      ];
      for (let x = 0; x < urls.length ;x++) {
        let path = urls[x].replace(/.*resources\//g, "");
        let file = fs.createWriteStream(path, { encoding: 'utf8' });
        let response = await fetch(urls[x], {
          method: 'GET',
        });
        response.body.pipe(file);
        file.on('finish', () => {
          console.log('done ! ' + path);
          if (path === urls[urls.length - 1].replace(/.*resources\//g, "")) {
            resolve();
          }
          file.close();
        });
      }
    });
  },
  PushPrompt: () => {
    const questions = [
      {
        name: 'appID',
        type: 'input',
        message: 'Enter your application ID:',
        validate: function (value) {
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
  TokenRefresh: async (refreshToken) => {
    let data = { command: 'RefreshToken', refreshToken: refreshToken };
    let opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams(data),
    }
    let response = await fetch('https://api.appdrag.com/api.aspx', opts);
    return response.json();
  },
  parseHtmlFile: (filePath, appID) => {
    if (fs.existsSync(filePath)) {
      let file_content = fs.readFileSync(filePath);
      let regexp = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appID}/`,"g");
      let regexp2 = new RegExp(`https://cf.appdrag.com/${appID}/`,"g")
      let regexp3 = new RegExp(`//cf.appdrag.com/${appID}/`, "g");
      let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`,"g");
      let regexp5 = new RegExp('//cf.appdrag.com/resources/',"g");
      file_content = file_content.toString('utf-8');
      file_content = file_content.replace(regexp, "./").replace(regexp2,'./').replace(regexp3,'./').replace(regexp4, './').replace(regexp5, './');
      fs.writeFileSync(filePath, file_content);
    }
  }
};