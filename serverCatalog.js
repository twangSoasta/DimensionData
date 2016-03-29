#!/usr/local/bin/node

/* ----------------------------------------------
*  Author:  Andrew Das
*  Email:  andrew.das@itaas.dimensiondata.com
*  Version 0.1
*  Description:  This is a driver to retrieve server details from MCP 2.0 hosted VM's using REST API v2.0.
*  The details are converted into CSV from JSON and saved as an aggregated result in the ./final directory.
*  Intermediate results from daily runs are saved under the ./data directory.
*  ---------------------------------------------
*/

// -----------------API AUTHENTICATION INFO-------------//
var username = 'username';
var password = 'password';

//  -----------------NPM DEPENDENCIES------------------//
var request = require('request');
var json2csv = require('json2csv');
var fs = require('fs');
var select = require('xpath.js')
      , dom = require('xmldom').DOMParser
var bunyan = require('bunyan');

// ------------------GLOBAL VARIABLES-----------------//
var fields_Server = ['name', 'description', 'organization', 'bizUnit', 'wbscode', 'environment', 'timestamp', 'backup.assetId', 'backup.servicePlan', 'monitoring.monitoringId', 'monitoring.servicePlan', 'operatingSystem.id', 'operatingSystem.displayName', 'cpuCount', 'memoryGb', 'disk.sizeGb', 'disk.speed', 'networkInfo.primaryNic.id','networkInfo.primaryNic.vlanId', 'networkInfo.primaryNic.privateIpv4', 'networkInfo.networkDomainId','sourceImageId','id', 'datacenterId'];
var organizationId = '';
var now = new Date();
var optionsMyAccount = {
    url: 'https://api-na.dimensiondata.com/oec/0.9/myaccount',
    headers: {
        'Accept':'application/xml'
    },
    auth: {   
        'user': username,
        'pass': password
    }
};
var optionsServer = {
    url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
    headers: {
        'Accept':'application/json'
    },
    auth: {   
        'user': username,
        'pass': password
    }
};
var log = bunyan.createLogger({
								name: "serverCatalog",
								streams: [{
        									type: 'rotating-file',
       									 	path: '/Users/andrewdas/Documents/Code/Deloitte/serverCatalog/log/serverCatalog.log',
        									period: '7d',   // weekly rotation
        									count: 10       // keep 10 back copies
   								}]
							  });

// -------------------FUNCTIONS----------------------//

// Server API processing
function getServers(error, response, body) {
    if (!error && response.statusCode == 200) {
    	  log.info('Received valid response from Server API...');
        var info = JSON.parse(body);
        log.info(info);
       for (var i = 0; i < info.server.length; i++) { 
 			info.server[i]['timestamp'] = now;
 			try{
 			   var desc = JSON.parse(info.server[i]['description']);
 			   info.server[i]['organization'] = desc['org'];
 			   info.server[i]['bizUnit'] = desc['businessUnit'];
 			   info.server[i]['wbscode'] = desc['costcenter'];
 			   info.server[i]['environment'] = desc['env'];
 			   info.server[i]['description'] = info.server[i]['description'].replace(/,/g, ";")
 			   log.info(info.server[i]);
 			}catch(e){
 			   //Ignore exception
 			   info.server[i]['organization'] = '';
 			   info.server[i]['bizUnit'] = '';
 			   info.server[i]['wbscode'] = '';
 			   info.server[i]['environment'] = '';
 			}
		}
        json2csv({ data: info.server, fields: fields_Server, quotes:'', defaultValue:'NULL' }, function(err, csv) {
            if (err) log.info(err);
            var dailyFile = '/opt/serverCatalog/data/servers-'+now.getFullYear()+now.getMonth()+now.getDate()+now.getTime()+'.csv';
            fs.writeFile(dailyFile, csv, function(err) {
                if (err) log.info(err);
                  log.info('Daily CSV file created in ./data'+dailyFile);
            });
            fs.appendFile('/opt/serverCatalog/final/servers-'+now.getMonth()+'.csv', csv, function(err) {
                if (err) log.info(err);
                  log.info('Content has been merged with ./final/servers-'+now.getMonth()+'.csv');
            });
        });

    }else{
   		log.info('Received invalid response or error from Server API...');
        log.info(JSON.parse(body));
    }
}

//  My Account API processing
function getMyAccount(error, response, body) {
	if (!error && response.statusCode == 200) {
	    log.info('Received valid response from My Account API...');
    	var doc = new dom().parseFromString(body);
    	var organizationId = select(doc, "//*[local-name()='orgId']/text()")[0].data
    	log.info('Organization ID: '+organizationId);
    	//Invoke Server API
    	optionsServer.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server';
		request(optionsServer, getServers);
	}else{
   		log.info('Received invalid response or error from My Account API...');
        log.info(JSON.parse(body));
    }

}


// ------------------MAIN------------------//
//Start processing
log.info('Invoking Server API on DimensionData cloud...');
//Invoke account api call.
request(optionsMyAccount, getMyAccount);


