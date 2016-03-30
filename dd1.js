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
var username = 'dmurphy';
var password = 'Freetrial01!';

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
       									 	path: __dirname+'/serverCatalog.log',
        									period: '7d',   // weekly rotation
        									count: 10       // keep 10 back copies
   								}]
							  });

// -------------------FUNCTIONS----------------------//

// Server API processing
function getServers(error, response, body) {
    if (!error && response.statusCode == 200) {
    	log.info('Received valid response from Server API...');
    	console.log('Received valid response from Server API...');
        var info = JSON.parse(body);
        log.info(info);
       // console.log(info);
        //tony added code 
       var nicArr = [];
       var insArrLg = [];
       var insArrRs = [];
       var idArrLg = [];
       var idArrRs = [];
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
 			//tony added code here to generate instanceid.log(interal ip) and internalid.log 
 			//LG and RS may interleave but we need the all of the LG 1st then RS
			if (isOld(DATACENTER)) {
			 //old style return 
 			 nicArr.push(info.server[i]['nic']);
 			 if (info.server[i]['name'] == 'twLG' && info.server[i]['started'] == true ) {
 			 	  insArrLg.push(nicArr[i]['privateIpv4']);
 			 	  idArrLg.push(info.server[i]['id']);
 			 	} else {
 			 		if (info.server[i]['name'] == 'twRS'&& info.server[i]['started'] == true){
 			 		insArrRs.push(nicArr[i]['privateIpv4']);
 			 		idArrRs.push(info.server[i]['id']);	
 			 			}
 			 		}
            }else {
			//new style returns
				if (info.server[i]['name'] == 'twLG' && info.server[i]['started'] == true ) {
 			 	  insArrLg.push(info.server[i]['networkInfo']['primaryNic']['privateIpv4']);
 			 	  idArrLg.push(info.server[i]['id']);
 			 	} else {
 			 		if (info.server[i]['name'] == 'twRS'&& info.server[i]['started'] == true){
 			 		insArrRs.push(info.server[i]['networkInfo']['primaryNic']['privateIpv4']);
 			 		idArrRs.push(info.server[i]['id']);	
 			 			}
 			 		}
			}					
		 }
		
		 fs.writeFileSync(__dirname+'/instanceid.log','');
		 fs.writeFileSync(__dirname+'/serverid.log','');
		 for (i=0;i<insArrLg.length;i++){
		 	 insArr.push(insArrLg[i]);
		 	 idArr.push(idArrLg[i]);
		 	 fs.appendFileSync(__dirname+'/instanceid.log',insArrLg[i]+',');
		 	 fs.appendFileSync(__dirname+'/serverid.log',idArrLg[i]+',');
		 	}
		 for (i=0;i<insArrRs.length;i++){
		 	 insArr.push(insArrRs[i]);
		 	 idArr.push(idArrRs[i]);
		 	 fs.appendFileSync(__dirname+'/instanceid.log',insArrRs[i]+',');
		 	 fs.appendFileSync(__dirname+'/serverid.log',idArrRs[i]+',');
		 	}
		  console.log(insArrLg,insArrRs);
		  console.log(insArr);
		  console.log(idArr);
		  console.log("Internal IP polling is done, instanceid.log and serverid.log are generated");

/*
		  	
        json2csv({ data: info.server, fields: fields_Server, quotes:'', defaultValue:'NULL' }, function(err, csv) {
            if (err) log.info(err);
            var dailyFile = __dirname+'servers-'+now.getFullYear()+now.getMonth()+now.getDate()+now.getTime()+'.csv';
            fs.writeFile(dailyFile, csv, function(err) {
                if (err) log.info(err);
                  log.info('Daily CSV file created in ./data'+dailyFile);
            });
            fs.appendFile(__dirname+'servers-'+now.getMonth()+'.csv', csv, function(err) {
                if (err) log.info(err);
                  log.info('Content has been merged with ./final/servers-'+now.getMonth()+'.csv');
            });
        });
*/           

    }else{
   		log.info('Received invalid response or error from Server API...');
        log.info(JSON.parse(body));
    }
}

//  My Account API processing
function getMyAccount(error, response, body) {
	if (!error && response.statusCode == 200) {
	    log.info('Received valid response from My Account API...');
	    console.log('Received valid response from My Account API...\n');
    	var doc = new dom().parseFromString(body);
    	organizationId = select(doc, "//*[local-name()='orgId']/text()")[0].data
    	log.info('Organization ID: '+organizationId);
    	console.log('Organization ID: '+organizationId);
    	//Invoke Server API
    	optionsServer.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server'+'?datacenterId='+DATACENTER;
		request(optionsServer, getServers);
	}else{
   		log.info('Received invalid response or error from My Account API...');
        log.info(JSON.parse(body));
    }

}
function isOld(DC){
	if (DC == 'NA1' || DC == 'NA3' || DC == 'NA5') {
		return true;
	} else {
		return false;
	}
}

// ------------------MAIN------------------//
var insArr = [];
var idArr = [];
var organizationId ="";
const DATACENTER = 'NA12';
//Start processing
log.info('Invoking Server API on DimensionData cloud...');
//Invoke account api call.
request(optionsMyAccount, getMyAccount);


