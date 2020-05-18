# appdrag-cli
A CLI tool for appdrag.com, deploy your full-stack apps to the cloud

## Installation

Install with 
`npm install -g appdrag`

## Commands

appdrag-cli v1.0.2

Usage  : `appdrag command <args>`
   
Available commands :


### Setup

   `appdrag login` 					                     Login to our service
   
   `appdrag init 	    <app-id>` 			            Link folder with your app-id
   

### Filesystem
  
   `appdrag fs pull  	<source-folder>` 		         Pull folder from SERVER to LOCAL
   
   `appdrag fs push  	<folder-to-push> <opt: dest>`	Push folder from LOCAL to SERVER
   

### Database - CloudBackend

   `appdrag db pull` 					                     Retrieves .sql file of your database from SERVER to LOCAL
   
   `appdrag db push  	<sql-file>` 			            Restore the database on SERVER from the LOCAL .sql backup provided
   

### Api - CloudBackend

   `api pull  	<opt: function_id>`		        Pull all (or one) function(s) of your CloudBackend to LOCAL
   
   `api push  	<opt: function_id>`		        Push all (or one) function(s) from LOCAL to your CloudBackend
   
   
### Deployment

   `deploy fs  	<path>`		                    Deploys all your non-CloudBackend related files to the specified folder
   
   `deploy api  <path>`           		        Deploys all the functions from your CloudBackend to the specified folder

  `deploy db  <path>`           		        Deploys the database file from your CloudBackend to the specified folder

### Help

   `help` 					                    Displays this help text
   
