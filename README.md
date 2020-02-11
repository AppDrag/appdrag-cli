# appdrag-deploy-cli

Install with: 

`npm install -g https://github.com/AppDrag/appdrag-deploy-cli`


This is the help manual for appdrag-cli :
Usage : appdrag-cli <command> [args..]

Available commands :
- login (no arguments necessary)
- init [APP_ID]
- push [FOLDER_PATH] [DEST_FOLDER] (leave DEST_FOLDER empty to push to root '/'.)
- pull [PATH] (leave PATH empty to pull root '/')
- cloudpull (no arguments necessary), return the list of cloud functions
- db_pull (no arguments necessary), download a .sql backup of your DB
- db_push [SQLBACKUP_PATH], restore the database from the .sql backup provided
