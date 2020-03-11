# AppDrag-Deploy CLI

## Installation

Install with npm install -g https://github.com/AppDrag/appdrag-deploy-cli

## Commands

appdrag-cli v0.0.1

Usage  : appdrag-cli command <args>
   
Available commands :


### Setup

   `login` 					                     Login to our service
   
   `init 	    <app-id>` 			            Link folder with your app-id
   

### Filesystem

   `fs push  	<folder-to-push> <opt: dest>`	Push folder to your project files
   
   `fs pull  	<source-folder>` 		         Pull folder from your project files
   

### Database - CloudBackend

   `db push  	<sql-file>` 			            Restore the database from the .sql backup provided
   
   `db pull` 					                     Retrieves .sql file of your database
   

### Api - CloudBackend

   `api push  	<opt: function_id>`		        Pull all (or one) function(s) from your CloudBackend
   
   `api pull  	<opt: function_id>`		        Push all (or one) function(s) of your CloudBackend
   
### Deployment

   `deploy fs  	<path>`		                    Deploys all your non-CloudBackend related files to the specified folder
   
   `deploy api  <path>`           		        Deploys all the functions from your CloudBackend to the specified folder

  `deploy db  <path>`           		        Deploys the database file from your CloudBackend to the specified folder

### Help

   `help` 					                    Displays this help text
   
