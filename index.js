#!/usr/bin/env node
const CryptoJS = require('crypto-js');
const cli = require('./cli');
const fs = require('fs');
const fetch = require('node-fetch')
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
    push : async (args) => {
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
            console.log(chalk.red('Incorrect path specified.'));
            return;
        }
        console.log(chalk.green(`${curFolder}/${zip}.zip Successfully written !`));
        let file_content = fs.createReadStream(`./${zip}.zip`);
        let fileSizeInBytes = fs.statSync(`./${zip}.zip`);
        fileSizeInBytes = fileSizeInBytes.size;

        /* TODO: Implement destination path, unused at the moment */
        if (args.length === 2) {
            var destpath = '';
        } else {
            if (args[2][args[2].length-1] === '/') {
                args[2] = args[2].slice(0,-1);
            }
            var destpath = args[2] + '/';
        }
                /* 
                    Payload creation and AWS KEY + Signature + policy
                                                                        */
        let getUploadUrlData = cli.DataToFormURL({command:'GetUploadUrl',token:config.get('token'),appID:appID,filekey:`${zip}.zip`});
        let getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData,{command:'GetUploadUrl',token:config.get('token'),appID:appID,filekey:`${zip}.zip`},'http://api-dev.appdrag.com/api.aspx?');
        for (let x = 1;getUploadUrlResponse.status == 'KO';x++) {
            console.log(chalk.cyan(`Refreshing token ${x}...`));
            let rfrsh_data = {command:'RefreshToken', refreshToken:config.get('refreshToken')};
            let rfrsh_clean = cli.DataToFormURL(rfrsh_data);
            let response_rfrsh = await cli.CallAPI(rfrsh_clean);
            config.set('token', response_rfrsh.token);
            getUploadUrlResponse = await cli.CallAPIGET(getUploadUrlData,{command:'GetUploadUrl',token:config.get('token'),appID:appID,filekey:`${zip}.zip`},'http://api-dev.appdrag.com/api.aspx?');
            if (x => 2) {
                console.log(chalk.red('Please log-in again.'));
                return;
            }
        }
        /* 
            Uploading to AWS S3 with PreSignedURL + file content and length
                                                                                */
        await cli.CallAPI({fdata : file_content, len : fileSizeInBytes}, getUploadUrlResponse.signedURL);
        let opts_unzip = {
            method : 'POST',
            headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
            body : new URLSearchParams({command:'ExtractZipS3Lambda', token:config.get('token'), appID, filekey:`${zip}.zip`, destpath: destpath})
        }
        await fetch('http://api-dev.appdrag.com/api.aspx?', opts_unzip);
        console.log(chalk.green('Success. You may need to delete the zip file in your Code Editor.'));
    },
}

const main = async () => {
    var isLogged = await cli.isAuth(config);
    var args = process.argv.slice(2);
    /* TODO: Help display */
    if (args.length == 0) {
        cli.displayHelp();
        return;
    }
    if (!isLogged) await funcs['login'](); // If not logged, force-login
    if (args[0] in funcs) { //Is the first arg a valid function 
        await funcs[args[0]](args);
    } else { //If function doesn't exist display help
        cli.displayHelp();
    }
    return;
}
main();