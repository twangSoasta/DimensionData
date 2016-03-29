#!/usr/local/bin/node

var request = require('request');
var requestp = require('request-promise');
var json2csv = require('json2csv');
var fs = require('fs');
var async = require('async');
var select = require('xpath.js')
      , dom = require('xmldom').DOMParser
var bunyan = require('bunyan');

var geocoderProvider = 'google';
var httpAdapter = 'http';
// optionnal
var extra = {
    apiKey: 'YOUR_API_KEY', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

var geocoder = require('node-geocoder')(geocoderProvider);

var now = new Date();

// -----------------API AUTHENTICATION INFO-------------//
var username = 'dmurphy';
var password = 'Freetrial01!';

var options = {
    url: 'https://api-na.dimensiondata.com/caas/2.0/6ea2bab8-afd5-4ebf-baf5-7e3f82d50e85/infrastructure/datacenter',
    headers: {
        'Accept':'application/json'
    },
    auth: {
        'user': username,
        'pass': password
    }
};

var optionsp = {
    uri: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/infrastructure/datacenter',
    headers: {
        'Accept':'application/json'
    },
    auth: {
        'user': username,
        'pass': password
    },
    json: true
};

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
    url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/infrastructure/datacenter',
    headers: {
        'Accept':'application/json'
    },
    auth: {   
        'user': username,
        'pass': password
    }
};

var log = bunyan.createLogger({
								name: "serverCatalog2",
								streams: [{
        									type: 'rotating-file',
       									 	path: __dirname+'/serverCatalog2.log',
        									period: '7d',   // weekly rotation
        									count: 10       // keep 10 back copies
   								}]
							  });


var organizationId;

var fields_Location = ['displayName', 'id', 'type', 'city', 'state', 'country', 'latitude', 'longitude' ];
var fields_NetworkDomains = ['name', 'type', 'id', 'datacenterId'];
var fields_Vlans = ['networkDomain.id', 'networkDomain.name', 'name', 'id', 'datacenterId'];
var fields_PublicIps = ['networkDomainId', 'baseIp', 'size', 'id', 'datacenterId'];
var fields_Server = ['name', 'description', 'timestamp', 'operatingSystem.id', 'operatingSystem.displayName', 'cpuCount', 'memoryGb', 'disk.sizeGb', 'disk.speed', 'networkInfo.primaryNic.id','networkInfo.primaryNic.vlanId', 'networkInfo.primaryNic.privateIpv4', 'networkInfo.networkDomainId','sourceImageId','id', 'datacenterId'];
var fields_FirewallRule = ['networkDomainId', 'name', 'action', 'protocol', 'source.ip.address', 'destination.ip.address', 'destination.port.begin', 'enabled', 'id', 'datacenterId', 'ruleType'];
var fields_NatRule = ['networkDomainId', 'internalIp', 'externalIp', 'id', 'datacenterId', 'baseIp'];

var publicIps = [];

function callToNAT(networkdomains) {
    var natRule = [];
    async.forEach(networkdomains, function (item, callback) {
        optionsp.uri = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/natRule';
        //console.log('Network Domain: ', item.id);
        optionsp.uri = optionsp.uri + '?networkDomainId=' + item.id;
        requestp(optionsp).then(function (body) {
            //console.log(body);
            if (typeof natRule[0] === 'undefined') {
                natRule = body.natRule.slice();
                //console.log('New IP: ',publicIps);
            } else {
                if (body.natRule) {
                    natRule = natRule.concat(body.natRule);
                    //console.log('IP: ',publicIps);
                }
            }
            callback();
        }).catch(function (err) {
            console.log(err);
            callback();
        });

    }, function (err) {
        //console.log(JSON.stringify(publicIps));
        var tmp = natRule.slice();
        for (var i = 0, nat = natRule.length; i < nat; i++) {
            for (var j = 0, ip = publicIps.length; j < ip; j++) {
                if (publicIps[j].baseIp.substring(0, publicIps[j].baseIp.lastIndexOf('.')) === natRule[i].externalIp.substring(0, natRule[i].externalIp.lastIndexOf('.'))
                    && parseInt(publicIps[j].baseIp.substring(publicIps[j].baseIp.lastIndexOf('.') + 1)) + 1 === parseInt(natRule[i].externalIp.substring(natRule[i].externalIp.lastIndexOf('.') + 1))
                    && publicIps[j].datacenterId === natRule[i].datacenterId
                    && publicIps[j].networkDomainId === natRule[i].networkDomainId) {
                    tmp[i].baseIp = publicIps[j].baseIp;
                    break;
                } else {
                    tmp[i].baseIp = 'NULL';
                }
            }
        }

        for (var i = 0, nat = natRule.length; i < nat; i++) {
            for (var j = 0, ip = publicIps.length; j < ip; j++) {
                if(publicIps[j].baseIp === natRule[i].externalIp
                    && publicIps[j].datacenterId === natRule[i].datacenterId
                    && publicIps[j].networkDomainId === natRule[i].networkDomainId) {
                    if( tmp[i].baseIp === 'NULL') {
                        tmp[i].baseIp = publicIps[j].baseIp;
                    }
                    break;
                }
            }
        }

        natRule = tmp.slice();
        //console.log(JSON.stringify(natRule));
        json2csv({data: natRule, fields: fields_NatRule, quotes: '', defaultValue: 'NULL'}, function (err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/natrule.csv', csv, function (err) {
                if (err) throw err;
                console.log('natrule file saved');
            });
        });
    });
}


function callToPublicIps(networkdomains){
    async.forEach(networkdomains, function(item, callback){
        optionsp.uri = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/publicIpBlock';
        console.log('Network Domain: ',item.id);
        optionsp.uri = optionsp.uri + '?networkDomainId=' + item.id;
        requestp(optionsp).then(function(body) {
            console.log(body);
                if(typeof publicIps[0] === 'undefined'){
                    publicIps = body.publicIpBlock.slice();
                    //console.log('New IP: ',publicIps);
                }else {
                    if(body.publicIpBlock) {
                        publicIps = publicIps.concat(body.publicIpBlock);
                        //console.log('IP: ',publicIps);
                    }
                }
                callback();
        }).catch(function(err){
                console.log(err);
                callback();
        });

    }, function(err){
        //console.log(JSON.stringify(publicIps));
        json2csv({ data: publicIps, fields: fields_PublicIps, quotes:'' , defaultValue:'NULL'}, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/publicips.csv', csv, function(err) {
                if (err) throw err;
                console.log('publicips file saved');
            });
        });
    });

}

function callToFirewallRules(networkdomains){
    var firewallRule = [];
    async.forEach(networkdomains, function(item, callback){
        optionsp.uri = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/firewallRule';
        //console.log('Network Domain: ',item.id);
        optionsp.uri = optionsp.uri + '?networkDomainId=' + item.id;
        requestp(optionsp).then(function(body) {
            //console.log(body);
            if(typeof firewallRule[0] === 'undefined'){
                firewallRule = body.firewallRule.slice();
               // console.log('New FirewallRule: ',firewallRule);
            }else {
                if(body.firewallRule) {
                    firewallRule = firewallRule.concat(body.firewallRule);
                    //console.log('Firewall Rule: ',firewallRule);
                }
            }
            callback();
        }).catch(function(err){
            console.log(err);
            callback();
        });

    }, function(err){
        //console.log(JSON.stringify(firewallRule));
        json2csv({ data: firewallRule, fields: fields_FirewallRule, quotes:'' , defaultValue:'NULL'}, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/firewallrule.csv', csv, function(err) {
                if (err) throw err;
                console.log('firewallrule file saved');
            });
        });
    });

}


function getServers(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        for (var i = 0; i < info.server.length; i++) { 
 			info.server[i]['timestamp'] = now;
		}
        json2csv({ data: info.server, fields: fields_Server, quotes:'', defaultValue:'NULL' }, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/servers-'+now+'.csv', csv, function(err) {
                if (err) throw err;
                console.log('file saved');
            });
            fs.appendFile(__dirname+'/servers-'+now.getMonth()+'.csv', csv, function(err) {
                if (err) throw err;
                console.log('file appended');
            });
        });

    }else{
        console.log(JSON.parse(body));
    }
}

function getVlans(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        json2csv({ data: info.vlan, fields: fields_Vlans, quotes:'' , defaultValue:'NULL'}, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/vlans.csv', csv, function(err) {
                if (err) throw err;
                console.log('file saved');
            });
        });
        //Get Servers
        options.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server';
        request(options, getServers);

    }else{
        console.log(error);
    }
}

function getNetworkDomains(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        console.log("getNetworkDomains:");
        console.log(body);
         json2csv({ data: info.networkDomain, fields: fields_NetworkDomains, quotes:'' , defaultValue:'NULL'}, function(err, csv) {
            if (err) console.log(err);
            fs.writeFile(__dirname+'/networkdomain.csv', csv, function(err) {
            if (err) throw err;
                console.log('file saved');
            });
         });
        //Get Public IPS
        console.log("Get Public IPs");
        callToPublicIps(info.networkDomain);

        //Get Firewall Rules
        console.log("Get Firewall Rules");
        callToFirewallRules(info.networkDomain);

        //Get NAT Rules
        callToNAT(info.networkDomain);

        //Get VLANS
        options.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/vlan';
        request(options, getVlans);

    }else{
        console.log(error);
    }
}

function getLocations(error, response, body) {
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        var tmp = [];
        tmp = info.datacenter.slice();
       // console.log(tmp);
        async.forEach(info.datacenter, function(item, callback){
            var addr = item.city + ', '+ item.state+ ', '+ item.country, key='AIzaSyBgj9IWADBaA1GqoT6HJYkX99Clphlqr2c';
            geocoder.geocode({address: addr}, function(err, res) {
              //  console.log(res);
                item.latitude = res[0].latitude.toString();
                item.longitude = res[0].longitude.toString();
                callback();
            });

        }, function(err){
            //console.log(JSON.stringify(publicIps));
            json2csv({ data: info.datacenter, fields: fields_Location, quotes:'' , defaultValue:'NULL'}, function(err, csv) {
                if (err) console.log(err);
                fs.writeFile(__dirname+'/locations.csv', csv, function(err) {
                    if (err) throw err;
                    console.log('file saved');
                });
            });
        });

        //Get Network Domains
        options.url = 'https://api-na.dimensiondata.com/caas/2.1/'+organizationId+'/network/networkDomain';
        console.log("getting the networkdomains:\n"+options.url);
        request(options, getNetworkDomains);

    }else{
        console.log(error);
    }
}

//tony added code here
//  My Account API processing
function getMyAccount(error, response, body) {
	if (!error && response.statusCode == 200) {
	//    log.info('Received valid response from My Account API...');
	    console.log('Received valid response from My Account API...');
    	var doc = new dom().parseFromString(body);
    	organizationId = select(doc, "//*[local-name()='orgId']/text()")[0].data
 //   	log.info('Organization ID: '+organizationId);
    	console.log('Organization ID: '+organizationId);
    	//Invoke Server API
 //   	optionsServer.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server';
    	options.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/infrastructure/datacenter';
    	console.log(options);
    
	//	request(optionsServer, getServers);
	request(options, getLocations);
	}else{
   		log.info('Received invalid response or error from My Account API...');
        log.info(JSON.parse(body));
    }

}

function getNetworkId(err,res,body){
	if (!err && res.statusCode == 200) {
		console.log("Getting the Network ID...");
		var doc = new dom().parseFromString(body);
    networkDomainId = select(doc, "//*[local-name()='id']/text()")[0].data;
    console.log('networkDomainId ID: '+networkDomainId);   
    options.url = 'https://api-na.dimensiondata.com/oec/0.9/'+org_id+'/network/'+networkDomainId+'/natrule';
//options.url = 'https://api-na.dimensiondata.com/caas/2.1/'+org_id+'/network/natRule?networkDomainId='+networkDomainId;
    request(options,getNatRules);     			
	} else {
		console.log(err);
  }
}  

function getNatRules(err,res,body){
	if (!err && res.statusCode == 200) {
		console.log("Getting the Network ID...");
		console.log(body);
		var doc = new dom().parseFromString(body);
    sourceIpArr = select(doc, "//*[local-name()='sourceIp']/text()");
    natIpArr =select(doc,"//*[local-name()='natIp']/text()");
    var sip = [];
    var nip = [];
    var sipFromLog = [];
    var sidFromLog = [];
    
    sourceIpArr.forEach(function(sourceIp){
    	 sip.push(sourceIp.data);
    	});
    natIpArr.forEach(function(natip){
    	 nip.push(natip.data);
    	});
    console.log(sip,nip); 
    for (i in sip) {
    	externalIpArr[sip[i]] = nip [i]; 
    	} 
    console.log(externalIpArr);
    //read the internal ip log from other routine
    sipFromLog = fs.readFileSync(__dirname+"/instanceid.log").toString().split(',');
    sidFromLog = fs.readFileSync(__dirname+"/serverid.log").toString().split(',');
    fs.writeFileSync(__dirname+"/eipaddr.log","");
    fs.writeFileSync(__dirname+"/server.csv","#serverID,publicIP,dataCenter,httpCheck\n");     //#serverID,publicIP,dataCenter,httpCheck\n
  //  fs.appendFileSync(__dirname+"server.csv","#serverID,publicIP,dataCenter,httpCheck\n");
    for (i=0;i<sipFromLog.length-1;i++){
      fs.appendFileSync(__dirname+"/eipaddr.log",externalIpArr[sipFromLog[i]]+',');	
      fs.appendFileSync(__dirname+"/server.csv",sidFromLog[i]+','+externalIpArr[sipFromLog[i]]+','+dcLocation+','+'yes\n');
    	}	
    console.log("eipadd.log and server.csv are generated!");
  } else {
  	console.log(err);
  	}
	}

	

//Invoke account api call.
//request(optionsMyAccount, getMyAccount);

//Get Locations
//request(options, getLocations);
var dcLocation = 'NA3';
var networkDomainId = "";
var org_id = "e8cd76a3-7bce-4415-9979-be5b558e0dbd";
var externalIpArr = [];
//options.url = 'https://api-na.dimensiondata.com/caas/2.1/'+org_id+'/network/networkDomain';
options.url = 'https://api-na.dimensiondata.com/oec/0.9/'+org_id+'/networkWithLocation/'+dcLocation;
request(options,getNetworkId);



