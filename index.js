#!/usr/bin/env node
const CryptoJS = require('crypto-js');
const cli = require('./cli');
const fs = require('fs');
const fetch = require('node-fetch');
var FormData = require('form-data');
const https = require('https');
const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const Configstore = require('configstore');
const packageJson = require('./package.json');
const config = new Configstore(packageJson.name);

const funcs = {
    login : async () => {
        clear();
        console.log(
            chalk.magenta(
            figlet.textSync('AppDrag', { horizontalLayout: 'fitted' })
            )
        );
        let inputs = await cli.LoginPrompt();
        let toHash = 12 + inputs.password + "APPALLIN";
        let hashPassword = CryptoJS.SHA512(toHash).toString();
        let data = {
            'command' : 'Login',
            'email' : inputs.email,
            'password' : hashPassword
        }
        let data_cleaned = cli.DataToFormURL(data);
        let response_login = await cli.CallAPI(data_cleaned);
        if (!('status' in response_login)) {
            console.log(chalk.redBright('Incorrect email and/or password'));
            return;
        }
        console.log(chalk.greenBright('A verification code has been sent to your email'));
        inputs = await cli.CodePrompt();
        data.verificationCode = inputs.code;
        data_cleaned = cli.DataToFormURL(data);
        let response_code = await cli.CallAPI(data_cleaned);
        if (!('Table' in response_code)) {
            console.log(chalk.redBright('Incorrect code'));
        }
        let user_data = {
            token : response_code.Table[0].token,
            firstName : response_code.Table[0].firstName,
            lastName : response_code.Table[0].lastName,
            email : response_code.Table[0].email,
            Id : response_code.Table[0].Id,
            refreshToken : response_code.Table[0].refreshToken,
        }
        config.set(user_data);
        return;
    },
    init : async (args) => {
        if (args.length < 2) {
            console.log(chalk.red('No APP_ID supplied. Please read the help below.'));
            cli.displayHelp();
            return;
        }
        appID = args[1];
        fs.writeFile('.appdrag', JSON.stringify({appID:appID}), (err) => {
            if (err) throw err;
            console.log(chalk.green(`Config file successfully written, you won't need to specify your appID when pushing from this directory.`));
        });
    },
    fspush : async (args) => {
        var curFolder = process.cwd();
        if (args.length < 2) {
            console.log(chalk.red('No FOLDER_PATH supplied. Please read the help below.'));
            cli.displayHelp();
            return;
        }
        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }
        if (args[1][args[1].length-1] === '/') {
            args[1] = args[1].slice(0,-1);
        }
        let date = new Date();
        let dest = `appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
        let isErr = null;
        let zip = await cli.zipFolder(args[1], dest, curFolder).catch((err) => {
            isErr = 1;
        });
        if (isErr !== null) {
            console.log(chalk.red('Incorrect path. Path must be a folder.'));
            return;
        }
        console.log(chalk.green(`${curFolder}/${zip}.zip Successfully written !`));
        let file_content = fs.createReadStream(`./${zip}.zip`);
        let fileSizeInBytes = fs.statSync(`./${zip}.zip`);
        fileSizeInBytes = fileSizeInBytes.size;

        if (args.length === 2) {
            var destpath = '';
        } else {
            if (args[2][args[2].length-1] === '/') {
                args[2] = args[2].slice(0,-1);
            }
            var destpath = args[2] + '/';
        }
                /* 
                    Get upload url and AWS KEY + Signature + policy
                                                                        */
        let getUploadUrlData = cli.DataToFormURL({command:'GetUploadUrl',token:config.get('token'),appID:appID,filekey:`${zip}.zip`});
        let getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData);
        for (let x = 1;getUploadUrlResponse.status == 'KO';x++) {
            console.log(chalk.cyan(`Refreshing token ${x}...`));
            let refresh = await cli.TokenRefresh(config.get('refreshToken'));
            config.set('token', refresh.token);
            getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData);
            if (x => 2) {
                console.log(chalk.red('Please log-in again.'));
                return;
            }
        }
        /* 
            Uploading to AWS S3 with PreSignedURL + file content and length
                                                                                */
        await cli.CallAPI({fdata : file_content, len : fileSizeInBytes}, getUploadUrlResponse.signedURL);
        // Unzipping file
        let opts_unzip = {
            method : 'POST',
            headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
            body : new URLSearchParams({command:'ExtractZipS3Lambda', token:config.get('token'), appID, filekey:`${zip}.zip`, destpath: destpath})
        }
        await fetch('https://api.appdrag.com/api.aspx?', opts_unzip);

        //Deleting file
        let opts_data = {
            command: 'DeleteFile',
            token : config.get('token'),
            appID,
            filekey : `${zip}.zip`,
        }
        let opts_delete = {
            method : 'POST',
            headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
            body : new URLSearchParams(opts_data)
        }
        await fetch('https://api.appdrag.com/api.aspx?', opts_delete);
        console.log(chalk.green('Success. You may need to delete the zip file in your local files.'));
    },
    fspull : async (args) => {
        console.log('Pulling Files...')
        var pullPath = ''
        if (args.length == 2) {
            pullPath = args[1];
        }
        if (args.length > 2) {
            console.log(chalk.red('Too many arguments. Please read the help below.'));
            cli.displayHelp();
            return;
        }
        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init [APP_ID]' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }
        let data = {
            command : 'GetDirectoryListing',
            token : config.get('token'),
            appID : appID,
            path : args[1] || '',
            order : 'name',
        };
        if (args[1] && !fs.existsSync(args[1])) {
            fs.mkdirSync(args[1]);
        }
        let res = await cli.CallAPIGET(data);
        if (res.status == 'KO') {
            for (let x = 1; res.status == 'KO'; x++) {
                console.log(chalk.cyan(`Refreshing token...`));
                let refresh = await cli.TokenRefresh(config.get('refreshToken'));
                config.set('token', refresh.token);
                res = await cli.CallAPIGET(data);
                if (x => 2) {
                    console.log(chalk.red('Please log-in again.'));
                    return;
                }
            }
        }
        await cli.parseFiles(data, res, pullPath);
    },
    apipull : async (args) => {
        let token = config.get('token');
        if (args.length > 2) {
            console.log(chalk.red('Too many arguments. Please read the help below.'));
            cli.displayHelp();
            return;
        }

        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }

        //Get all functions from appID
        let data = {
            command: 'CloudAPIGetFunctions',
            token: token,
            appID: appID,
        };
        let opts = {
            method : 'POST',
            headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
            body: new URLSearchParams(data),
        };
        let function_list;
        await fetch('https://api.appdrag.com/CloudBackend.aspx', opts).then(res => res.json()).then(res => {
            function_list = res;
        });
        if (function_list.status == 'KO') {
            for (let x = 1;function_list.status == 'KO';x++) {
                console.log(chalk.cyan(`Refreshing token...`));
                let refresh = await cli.TokenRefresh(config.get('refreshToken'));
                config.set('token', refresh.token);
                function_list = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
                function_list = await function_list.json();
                if (x => 2) {
                    console.log(chalk.red('Please log-in again.'));
                    return;
                }
            }
        }
        fs.writeFileSync('.apiroutes', JSON.stringify({routes : function_list.Table, route : function_list.route}));
        if (args[1]) {
            cli.parseFunctions(function_list, token, appID, args[1]);
        } else {
            cli.parseFunctions(function_list, token, appID);    
        }
    },
    apipush : async (args) => {
        let curFolder = process.cwd();
        //Get APPID and TOKEN
        let token = config.get('token');
        if (args.length > 2) {
            console.log(chalk.red('Too many arguments. Please read the help below.'));
            cli.displayHelp();
            return;
        }

        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }

        // Zip correct function folder
        let func = false;
        let basePath = 'CloudBackend/code/'
        let folders = fs.readdirSync(basePath);
        if (args[1]) {
            func = args[1];
        }
        folders.forEach(async (folder) => {
            if (func && folder !== func) {
                return;
            }
            let zip = await cli.zipFolder(basePath+folder, `${appID}_${folder}.zip`, curFolder).catch((err) => {
                console.log(err);
            });
            console.log(chalk.green(`Zip archive created !`));
            let file_content = fs.createReadStream(`./${zip}.zip`);
            let fileSizeInBytes = fs.statSync(`./${zip}.zip`);
            fileSizeInBytes = fileSizeInBytes.size;

        // Get URL + Key
            let getUploadUrlData = cli.DataToFormURL({command:'GetUploadUrl',token:config.get('token'),appID:appID,filekey:`CloudBackend/api/${zip}.zip`});
            let getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData);
            for (let x = 1; getUploadUrlResponse.status == 'KO'; x++) {
                console.log(chalk.cyan(`Refreshing token ${x}...`));
                let refresh = await cli.TokenRefresh(config.get('refreshToken'));
                config.set('token', refresh.token);
                getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData);
                if (x => 2) {
                    console.log(chalk.red('Please log-in again.'));
                    return;
                }
            }
            //sending on aws
            console.log(chalk.green(`Pushing...`));
            await cli.CallAPI({fdata : file_content, len : fileSizeInBytes}, getUploadUrlResponse.signedURL);
            let data = {
                command : 'CloudAPIRestoreAPI',
                token : config.get('token'),
                appID : appID,
                version : '',
                functionID : folder,
            }

            //restore api
            let res = await cli.CallAPIGET(data, 'https://api.appdrag.com/CloudBackend.aspx');
            if (res.status == 'OK') {
                fs.unlinkSync(zip+'.zip');
                console.log(chalk.green(`${folder} has been updated !`));
            } else {
                console.log(chalk.green(`Error updating ${folder}.`));
            }
        });
    },
    dbpull : async (args) => {
        let token = config.get('token');
        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }

        //Get all functions from appID
        let data = {
            command: 'CloudDBExportFile',
            token: token,
            appID: appID,
        };
        let db_url = await cli.CallAPIGET(data, 'https://api.appdrag.com/CloudBackend.aspx');
        console.log(db_url);
        if (db_url.status === 'OK') {
            db_url = db_url.url;
        } else {
            console.log(chalk.red('Error trying to fetch database...'));
            return;
        }
        let file = fs.createWriteStream(appID+'_backup.sql');
        https.get(db_url, (response) => {
            if (response.headers['content-encoding'] == 'gzip') {
                response.pipe(zlib.createGunzip().pipe(file));
            } else {
                response.pipe(file);
            }
            file.on('finish', () => {
            console.log('Done ! '+ appID+'_backup.sql');
            file.close();
            });
        }).on('error', function(err) {
            fs.unlink(appID+'_backup.sql');
        });
    },
    dbpush : async (args) => {
        let token = config.get('token');
        let appID = '';
        if (!fs.existsSync('.appdrag')) {
            console.log(chalk.red(`Please run the 'init' command first.`));
            return;
        } else {
            let data = fs.readFileSync('.appdrag');
            appID = JSON.parse(data).appID;
        }

        let file;
        try {
            file = fs.readFileSync(args[1]);
        } catch {
            console.log(chalk.red("File doesn't exist"));
            return;
        }

        let form = new FormData();
        form.append('command','CloudDBRestoreDB');
        form.append('upload', file, args[1]);
        form.append('appID',appID);
        form.append('token',token);

        let url = 'https://api.appdrag.com/CloudBackend.aspx'
        form.submit(url, (err,res) => {
            if (res.statusMessage === 'OK') {
                console.log(chalk.green(`${args[1]} successfully uploaded !`));
            } else {
                console.log(chalk.red(`Error when trying to upload file`));
            }
        });

    }
}

const main = async () => {
    var isLogged = await cli.isAuth(config);
    var args = process.argv.slice(2);
    if (args[0] !== 'login' && args[0] !== 'help' && args[0] !== 'init' && args[0]){
        args[0] = args[0]+args[1];
        args.splice(1,1);
    }
    /*  Help display  */
    if (args.length == 0) {
        cli.displayHelp();
        return;
    }
    if (!isLogged && args[0] != 'login') await funcs['login'](); // If not logged, force-login
    if (args[0] in funcs) { //Is the first arg a valid function 
        await funcs[args[0]](args);
    } else { //If function doesn't exist display help
        cli.displayHelp();
    }
    return;
}
main();