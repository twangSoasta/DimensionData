/*************************************************************************************************************************************
Title: WebRoutineDDFull.js
Description: Top level module for DimensionData API
Author: Tony Wang
Version: 
0.9 - 1st version based on WebRoutineDD to support full operation for MCP 2.0 
    - added function for create NatVlan/LG/RS/EIP using deasync module
	- supported all functions, natRuleIdArr,eipBlockIdArr is used no file written yet, image-id and machine size is not yet working
	- cpuCores,memSize and imageid inputs are working
	- correctly display EIP and Instance NUM mismatching numbers
0.9.1 - added name suffix for 3 XML files for different DC locations
0.9.2 - added button to pull versions from main
      - added reading the LG version, make main version global
      - added uploading the maestro files to S3 bucket to trigger update logics

**************************************************************************************************************************************/
var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var zlib = require('zlib');
var zip = require('node-native-zip');
var mime = require('mime');
var async = require('async');
var deasync = require('deasync');
var AWS = require('aws-sdk');
//var formidable = require('formidable');
var generateXML = require('./GenerateXML.js');
var host = "0.0.0.0";
var port = 8082;

var currentDir = __dirname; 
var slash = (process.platform == "win32")?"\\":"/";     //detect \ on windows or / on mac/linux
currentDir = currentDir.substring(0,currentDir.lastIndexOf(slash)) + "/files/keydd_placeholder.csv";
var csv = fs.readFileSync(currentDir).toString();   //read key from default locations
var username = csv.substring(csv.indexOf("username: '")+11,csv.indexOf("'",csv.indexOf("username: '")+11));
var password = csv.substring(csv.indexOf("password: '")+11,csv.indexOf("'",csv.indexOf("password: '")+11));
/////////////////////////////////////////////////////////////////////////////////////
const OVERWRITE_FILE = true;
const securityGroup = "sg-u279b2do";     //"sg-ewbcbab5";
/////////////////////////////////////////////////////////////////////////////////////
var NUM,div,mod;
var path = 'Beijing Qingcloud Loc #2';   //need a initial value to not break the generate routine if upload button has not clicked before
var LGDone = false;
var inputTextArr = fs.readFileSync(__dirname+"/inputtextDD.log").toString().split(",");    //inputtext.log is to store the default input value when start the program
var numOfInstances = inputTextArr[0];
var eipBandwidth = inputTextArr[1];
var zoneDc = inputTextArr[2];
var instanceType = inputTextArr[3];
var imageId = inputTextArr[4];
var imageIdRS = inputTextArr[5];
var path = inputTextArr[6];
var mainIp = inputTextArr[7];
var rsNum = 1;
////////////////////////////////////////////////////////////////////////////////////
//added for DimensionData
var insArr = [];
var idArr = [];
var externalIpArr =[];
var organizationId ="e8cd76a3-7bce-4415-9979-be5b558e0dbd";
var networkDomainId = "";
var vlanId = "";
var natRuleIdArr = [];
var eipBlockIdArr = [];
var buildNum = "";
//  -----------------NPM DEPENDENCIES------------------//
var request = require('request');
var json2csv = require('json2csv');
var fs = require('fs');
var select = require('xpath.js')
      , dom = require('xmldom').DOMParser
var bunyan = require('bunyan');

// ------------------GLOBAL VARIABLES-----------------//
var fields_Server = ['name', 'description', 'organization', 'bizUnit', 'wbscode', 'environment', 'timestamp', 'backup.assetId', 'backup.servicePlan', 'monitoring.monitoringId', 'monitoring.servicePlan', 'operatingSystem.id', 'operatingSystem.displayName', 'cpuCount', 'memoryGb', 'disk.sizeGb', 'disk.speed', 'networkInfo.primaryNic.id','networkInfo.primaryNic.vlanId', 'networkInfo.primaryNic.privateIpv4', 'networkInfo.networkDomainId','sourceImageId','id', 'datacenterId'];
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
var optionsNetwork = {
    url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
    headers: {
        'Accept':'application/json'
    },
    auth: {   
        'user': username,
        'pass': password
    }
};

var options = {
        hostname: 'api-na.dimensiondata.com',
        port: 443,
        path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/shutdownServer',
        method: "POST",
        headers: {
        	    'Accept':'application/json',
              'Content-Type':'application/json'
        	},
        auth: username+':'+password
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




var body = '<html>'+                  
    '<head>'+
    '<meta http-equiv="Content-Type" content="text/html; '+
    'charset=UTF-8" />'+
	'<style type="text/css">'+
      'img{'+
         'position:absolute;'+
         'left:480px;'+
         'top:320px;'+
         '}'+
    '</style>'+
    '</head>'+
    '<body>'+  
	'<h1>Welcome to use NodeJs Routine for DimensionData API Full v0.9.2</h1>'+
	'<form enctype="multipart/form-data" action="/UploadKeyCSV" method="post">'+
    '<input type="file" name ="upload" id="choosefile" /><br>'+
    '<input type="submit" value="UploadKeyCSV" id="submitBtn" />'+
    '</form><br />'+
//	'MainAccount<input type="radio" checked="checked" name="csvPath" value="../files/access_key_soasta_main.csv" />'+
//	'PeAccount<input type="radio" name="csvPath" value="../files/access_key_soasta.csv" /><br /><br />'+
	'<u1>NumInstances,Bandwidth,Zone,InstanceType,ImageIdLG,ImageIdRS,ServerListLocation</u1><hr/>'+
	'<img src="http://www.soasta.com/wp-content/uploads/2015/05/cloudtest-pp-2.jpg" width="800" height="600"></div>'+
    '<form action="/upload" method="post">'+           
//    '<textarea name="text" rows="2" cols="65">2,10,pek2,c4m8,img-1wbv1ydv,img-wska67bq,Beijing Qingcloud Loc #2</textarea>'+
    '<textarea name="text" rows="2" cols="65">'+inputTextArr[0]+','+inputTextArr[1]+','+inputTextArr[2]+','+inputTextArr[3]+','+inputTextArr[4]+','+inputTextArr[5]+','+inputTextArr[6]+','+inputTextArr[7]+'</textarea>'+
    '<input type="submit" value="Submit" style="height:20px;width:80px" />'+
    '</form>'+ 
	'<form action="/create_NetworkVlan" method="post">'+           
	'<input type="submit" value="Create_netvlan" style="height:20px;width:120px" />'+
    '</form>'+
    '<form action="/create_LG" method="post">'+           
	'<input type="submit" value="Create_lg" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+
	'<form action="/create_RS" method="post">'+           
	'<input type="submit" value="Create_rs" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+
	'<form action="/create_eip" method="post">'+           
	'<input type="submit" value="Create_eip" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+ 
	'<form action="/describe_instance" method="post">'+           
	'<input type="submit" value="Describe_instance" style="height:20px;width:120px;background:#CAFF70" />'+
    '</form>'+
	'<form action="/describe_eip" method="post">'+           
	'<input type="submit" value="Describe_eip" style="height:20px;width:120px;background:#CAFF70" />'+
    '</form>'+
	'<form action="/associate_eip" method="post">'+           
	'<input type="submit" value="Associate_eip" style="height:20px;width:120px;background:#EEEE00" />'+
    '</form>'+  
	'<form action="/describe_natrules" method="post">'+           
	'<input type="submit" value="Describe_natrules" style="height:20px;width:120px;background:#EEEE00" />'+
    '</form>'+ 
  '<form action="/get_mainversion" method="post">'+           
	'<input type="submit" value="Get_mainversion" style="height:20px;width:120px;background:#EEEE00" />'+
    '</form>'+ 
  '<form action="/upload_maestro" method="post">'+           
	'<input type="submit" value="Upload_maestro" style="height:20px;width:120px;background:#EEEE00" />'+
    '</form>'+ 
	'<form action="/stop_instance" method="post">'+           
	'<input type="submit" value="Stop_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
	'<form action="/start_instance" method="post">'+           
	'<input type="submit" value="Start_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
	'<form action="/restart_instance" method="post">'+           
	'<input type="submit" value="Restart_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
	'<form action="/dissociate_eip" method="post">'+           
	'<input type="submit" value="Dissociate_eip" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+ 
	'<form action="/delete_instance" method="post">'+           
	'<input type="submit" value="Delete_instance" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+
	'<form action="/delete_eip" method="post">'+           
	'<input type="submit" value="Delete_eip" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+  
	'<form action="/generate_xml" method="post">'+           
	'<input type="submit" value="Generate_xml" style="height:20px;width:120px;background:#8E388E;color:#FFFFFF" />'+
    '</form>'+
	'<form action="/archive.zip" method="post">'+           
	'<input type="submit" value="Download_xml" style="height:20px;width:120px;background:#8E388E;color:#FFFFFF" />'+
    '</form>'+
	'</body>'+
    '</html>';
	

var server = http.createServer(function(req,res){
	var pathName = url.parse(req.url).pathname; 
	console.log("Pathname is:"+pathName);
	// request side 
	var postD = "";	
	req.setEncoding('utf-8');
	req.on("data",function(postDataChunk){     // monitoring the incoming request POST data chunks
		postD += postDataChunk;
	});
	req.on("end",function(){
		var finalTxt = decodeURIComponent(postD.toString().substring(5));
		console.log("post text is: ",finalTxt);
		//after every request, send response, header shared by both of the routine below
		res.writeHeader("200",{"content-type":"text/html"});   
	   switch (pathName){
		   case "/UploadKeyCSV":
		       if (finalTxt.indexOf("username: '") == -1 || finalTxt.indexOf("password: '") ==-1) {
					 res.write("Invalid CSV File, Please re-upload!");
					 res.end(body);
				   } else {
				   	  username = finalTxt.substring(finalTxt.indexOf("username: '")+11,finalTxt.indexOf("'",finalTxt.indexOf("username: '")+11));
              password = finalTxt.substring(finalTxt.indexOf("password: '")+11,finalTxt.indexOf("'",finalTxt.indexOf("password: '")+11));
				   	  res.write("Credential loaded!<br \>");
				   	  optionsMyAccount = {
                  url: 'https://api-na.dimensiondata.com/oec/0.9/myaccount',
                  headers: {
                  'Accept':'application/xml'
                  },
                  auth: {   
                  'user': username,
                  'pass': password
                  }
              };
              console.log(optionsMyAccount);
				      request(optionsMyAccount, function(error,response,resbody){
				      if (!error && response.statusCode == 200) {
	               console.log('Received valid response from My Account API...\n');
	               res.write('Received valid response from My Account API...<br \>');
    	           var doc = new dom().parseFromString(resbody);
    	           organizationId = select(doc, "//*[local-name()='orgId']/text()")[0].data
    	           console.log('Organization ID: '+organizationId);
    	           res.write('Organization ID: '+organizationId);    	          
	            }else{
   		           if (response == null) {
		                  res.write('Receive No Response from API...Check your credentials or network');
		               	} else {	               
		               res.write("Response Code is: "+response.statusCode);
                   }
              }	
              res.end(body);  			      
				      });		   
				 }
		   break;
		   
	   	   case "/upload" : 
		         //the following variables are global variables, can't use var here
             inputArr = finalTxt.split(',');
             console.log(inputArr);
		     numOfInstances = (inputArr[0] == null || inputArr[0] == '')?parseInt(inputTextArr[0]):parseInt(inputArr[0]);
             div50 = Math.floor(numOfInstances/50);
             mod50 = numOfInstances - div50*50;
             rsNum = (mod50 == 0)? div50:div50+1;
             	         
				     //setting default values
		         eipBandwidth = (inputArr[1] == null || inputArr[1] == "")?parseInt(inputTextArr[1]):parseInt(inputArr[1]) ;
		         zoneDc = (inputArr[2] == null || inputArr[2] == "")?inputTextArr[2]:inputArr[2];
		         instanceType = (inputArr[3] == null || inputArr[3] == "")?inputTextArr[3]:inputArr[3];
		         imageId = (inputArr[4] == null || inputArr[4] == "")?inputTextArr[4]:inputArr[4];
		         imageIdRS = (inputArr[5] == null || inputArr[5] == "")?inputTextArr[5]:inputArr[5];
             path = (inputArr[6] == null || inputArr[6] == "")?inputTextArr[6]:inputArr[6];		
             mainIp = (inputArr[7] == null || inputArr[7] == "")?inputTextArr[7]:inputArr[7];	
             path = path.replace(/\+/g,' '); 
             zoneDc = zoneDc.replace(/\+/g,' '); 
             instanceType = instanceType.replace(/\+/g,' '); 
             imageId = imageId.replace(/\+/g,' '); 
             imageIdRS = imageIdRS.replace(/\+/g,' '); 
             mainIp = mainIp.replace(/\+/g,' '); 
		     console.log("path is: "+path);	
             cpuCores = parseInt(instanceType.substring(1,instanceType.indexOf('m')));
             memSize = parseInt(instanceType.substring(instanceType.indexOf('m')+1));	
			 console.log(cpuCores,memSize);
             if (typeof(cpuCores) !== 'number' || typeof(memSize)	!== 'number') {
				 console.log("Number of CPU and Size of Memory are invalid, please re-enter!");
				 res.write("Number of CPU and Size of Memory are invalid, please re-enter!");
			 }		 
             			 
				     			 
             NUM = parseInt(numOfInstances);	   //assuming upload will always happen before create
				     div = Math.floor(NUM/10);
             mod = NUM - div*10;        
				     console.log(NUM,div,mod);
	   	   		 res.write("DataCenter location is: "+zoneDc);
				 networkDomainId = "";
				 vlanId = "";
	   	   		 var optionsNetwork = {
                url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
                headers: {
                   'Accept':'application/json'
                },
                auth: {   
                   'user': username,
                   'pass': password
                }
             };            
	   	   		 if (isOld(zoneDc)){
	   	   		    res.write(' and it is MCP 0.9 style, no VLANID supported<br \>');
	   	   		    optionsNetwork.url = 'https://api-na.dimensiondata.com/oec/0.9/'+organizationId+'/networkWithLocation/'+zoneDc;
	   	   		 	} else {
	   	   		 		res.write(' and it is MCP 2.0 style<br \>');
	   	   		 		optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/networkDomain?datacenterId='+zoneDc;
	   	   		 	}
		  //get networkdomainID
             request(optionsNetwork,function(error,response,resbody){
             	  if (!error && response.statusCode == 200) {
              		console.log("Getting the Network ID..."+resbody);
              		var doc = new dom().parseFromString(resbody);
              	  if (isOld(zoneDc)){
                     try {networkDomainId = select(doc, "//*[local-name()='id']/text()")[0].data;} catch(e){console.log(e);res.write('NetworkDomainId does not exist, create it 1st!  ');}
              	  } else {
              	     try {networkDomainId = JSON.parse(resbody).networkDomain[0].id;} catch(e){console.log(e);res.write('NetworkDomainId does not exist, create it 1st!  ');}
              	  }
                  console.log('networkDomainId ID: '+networkDomainId); 
                  res.write('networkDomainId ID: '+networkDomainId+'  ');                           	               	  
	   	   		     }else {
		               if (response == null) {
		                  res.write('Receive No Response from API...Check your credentials or network');
		               	} else {	               
		               res.write("Response Code is: "+response.statusCode);
                   }
                 }
		   //get vlanID	      
	   	   	   	 optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/vlan?datacenterId='+zoneDc;	   	   	   	 	
			     request(optionsNetwork,function(error,response,resbody){
                	  if (!error && response.statusCode == 200) {
                 		console.log("Getting the VLAN ID..."+resbody);
                 		var doc = new dom().parseFromString(resbody);
                 	  if (isOld(zoneDc)){
                        try {vlanId = select(doc, "//*[local-name()='vlan']/text()")[0].data;} catch(e){console.log(e);res.write('VLANID does not exist, create it 1st!  ');}
                 	  } else {
                 	     try {vlanId = JSON.parse(resbody).vlan[0].id;} catch(e){console.log(e);res.write('VLANID does not exist, create it 1st!  ');}
                 	  }
                     console.log('VLAN ID: '+vlanId); 
                     res.write('VLAN ID: '+vlanId);                           	               	  
	   	   	   	     }else {
		                  if (response == null) {
		                     res.write('Receive No Response from API...Check your credentials or network');
		                  	} else {	               
		                  res.write("Response Code is: "+response.statusCode);
                      }
                    }
                    //get submit text display logic	 
                 var inputBoxStr = body.substring(body.indexOf('="65">')+6,body.lastIndexOf("</textarea>"));
				 body = body.replace(inputBoxStr,numOfInstances+","+eipBandwidth+","+zoneDc+","+instanceType+","+imageId+","+imageIdRS+","+path+","+mainIp);
				 fs.writeFileSync(__dirname+"/inputtextDD.log",numOfInstances+','+eipBandwidth+','+zoneDc+','+instanceType+','+imageId+','+imageIdRS+','+path+","+mainIp);   //every submit save for the default input text next time start the program
	   	   		 res.end(body);					
			     });
	   	   	   });
	   	   break;
		   
		   case "/create_NetworkVlan":
		       var optionsNetwork = {
                url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
                headers: {
                   'Accept':'application/json'
                },
                auth: {   
                   'user': username,
                   'pass': password
                }
              };
			  var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/shutdownServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		      options.path = '/caas/2.0/'+organizationId+'/network/deployNetworkDomain';
			  var postData = {
                              "datacenterId": zoneDc,
                              "name": "SOASTA Domain",
                              "description": "SOASTA Test Domain",
                              "type": "ESSENTIALS"
                              };
			  httpPost(options,postData,function(response,resbody){			  
			     res.write('Create a Network Domain,  ');
				 optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/networkDomain?datacenterId='+zoneDc;
				 request(optionsNetwork,function(error,response,resbody){
					console.log(resbody);
				    try {networkDomainId = JSON.parse(resbody).networkDomain[0].id;} catch(e){console.log(e);res.write('NetworkDomainId does not exist, create it 1st!  ');}
					console.log('networkDomainId ID: '+networkDomainId); 
                    res.write('networkDomainId ID: '+networkDomainId+'  ');
					options.path = '/caas/2.0/'+organizationId+'/network/deployVlan';
					var postData = {
                                    "networkDomainId": networkDomainId,
                                    "name": "SOASTA VLAN",
                                    "description": "SOASTA Test Vlan",
                                    "privateIpv4BaseAddress": "10.0.0.0",
                                    "privateIpv4PrefixSize": 23
                                    };
					setTimeout(httpPost(options,postData,function(response,resbody){	
					   console.log(resbody);
				       res.write("Create a Vlan 10.0.0.0/23,   ");
					   optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/network/vlan?datacenterId='+zoneDc;	   	   	   	 	
			           request(optionsNetwork,function(error,response,resbody){
					      try {vlanId = JSON.parse(resbody).vlan[0].id;} catch(e){console.log(e);res.write('VLANID does not exist, create it 1st!  ');}   
						  console.log('VLAN ID: '+vlanId); 
                          res.write('VLAN ID: '+vlanId); 
						  res.end(body);
					   }); //end of getVlan
					}),10000); // end of deployVlan
			     });  //end of getNetwork
			  });  //end of deploy Network
		   break;
	  	   
	   	   case "/create_LG" : 
	   	       console.log(mod+" "+numOfInstances+" "+eipBandwidth+" "+zoneDc+" "+instanceType+" "+imageId+" "+imageIdRS+" "+path+" "+mainIp);		         
		         var postData =  //need to networkdomainid and vlanid to deploy servers
				         {
                          "name":"twLG",
                          "description":"twLG",
                          "imageId":imageId,       //"54617fa5-adcb-463f-ba9f-c639113dd27f",             //"4f472de5-3031-421b-add6-8573b0b03146",
                          "start":true,
                 //         "administratorPassword":"Soasta2006",
                          "cpu":{
                          "count":cpuCores,
                          "coresPerSocket":1,
                          "speed":"STANDARD"
                          },
                          "memoryGb":memSize,
                          "primaryDns":"",
                          "secondaryDns":"",
                          "networkInfo": {
                          "networkDomainId":networkDomainId,
                          "primaryNic" : {"vlanId":vlanId}
						//  "additionalNic" : [
                        //     {"privateIpv4" : ""},
                        //     {"vlanId":""}
                        //     ]
                          },
                          "disk" : [{
                          "scsiId" :"0" ,
                          "speed" :"STANDARD"   //HIGHPERFORMANCE
                          }],
                          "microsoftTimeZone":"035"
                          }
				var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/deployServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/deployServer';  
             var logOnce = true;
             if (!(NUM > 0)) {  
             	  console.log("Number of LGs is invalid! "+NUM);
             	  res.write('Number of LGs is invalid! '+NUM);
             	  res.end(body);
                	} else {
                res.write("Creating LGs<br />");
				LGDone = true;
				var index = 0;
				while (index < NUM) { 
	               var isReturn = false;
				   postData.description = 'twLG'+(index+1);
                   httpPost(options,postData,function(response,resbody){   
                       isReturn = true;	 
                       if (logOnce) { 
					      res.write(resbody);
						  res.end(body);
                          logOnce = false;
                       }
					   console.log(resbody);
				   });
                  while(!isReturn){
                      deasync.runLoopOnce();
                  }  
                  console.log(index);	
	              index ++;
               }
			 }				
			  
	   	   break;
	   	   
	   	   case "/create_RS":
	   	        var postData = 
				         {
                          "name":"twLG",
                          "description":"twLG",
                          "imageId":imageIdRS,     //"4f472de5-3031-421b-add6-8573b0b03146",
                          "start":true,
                 //         "administratorPassword":"Soasta2006",
                          "cpu":{
                          "count":cpuCores,
                          "coresPerSocket":1,
                          "speed":"STANDARD"
                          },
                          "memoryGb":memSize,
                          "primaryDns":"",
                          "secondaryDns":"",
                          "networkInfo": {
                          "networkDomainId":networkDomainId,
                          "primaryNic" : {"vlanId":vlanId}
						//  "additionalNic" : [
                        //     {"privateIpv4" : ""},
                        //     {"vlanId":""}
                        //     ]
                          },
                          "disk" : [{
                          "scsiId" :"0" ,
                          "speed" :"STANDARD"   //HIGHPERFORMANCE
                          }],
                          "microsoftTimeZone":"035"
                          }
				postData.name = "twRS";
			    postData.imageId = imageIdRS;   //"ca15e9e2-52f2-4609-aae9-5726e6abe96e";             //"939feda5-018b-4520-9634-e6750be1218a";		  
		        if (!LGDone) {
		      	    res.write("Needs LG number to determine RS number, please go back and create some LGs 1st!");
					res.end(body);	
		      	 } else {
				LGDone = false;
				console.log("rsNum: "+rsNum);
		        var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/deployServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/deployServer';  
             var logOnce = true;
             if (!(rsNum > 0)) {  
             	  console.log("Number of LGs is invalid! "+NUM);
             	  res.write('Number of LGs is invalid! '+NUM);
             	  res.end(body);
                	} else {
                res.write("Creating RSs<br />");
                var index = 0;
				while (index < rsNum) { 
	               var isReturn = false;
				   postData.description = 'twRS'+(index+1);
                   httpPost(options,postData,function(response,resbody){   
                       isReturn = true;	 
                       if (logOnce) { 
					      res.write(resbody);
						  res.end(body);
                          logOnce = false;
                       }
					   console.log(resbody);
				   });
                  while(!isReturn){
                      deasync.runLoopOnce();
                  }  
                  console.log(index);	
	              index ++;
               }        
			   }
		     }	

		     break;
	   	   	 
	   	  
		   case "/create_eip" : 
		    NUM = parseInt(numOfInstances)+rsNum;	   //assuming upload will always happen before create
			div = Math.floor(NUM/2);
            mod = NUM - div*2;
			var loopNum = div + mod;
			var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/network/addPublicIpBlock',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		        options.path = '/caas/2.0/'+organizationId+'/network/addPublicIpBlock'; 
            var logOnce = true;				
            if (!(NUM > 0)) {  
             	  console.log("Number of EIPs is invalid! "+NUM);
             	  res.write('Number of EIPs is invalid! '+NUM);
             	  res.end(body);
                	} else {
                res.write("Creating EIPs<br />");
				var index = 0;
				while (index < loopNum) { 
	               var isReturn = false;
				   postData = {"networkDomainId":networkDomainId};
                   httpPost(options,postData,function(response,resbody){   
                       isReturn = true;	 
                       if (logOnce) { 
					      res.write(resbody);
						  res.end(body);
                          logOnce = false;
                       }
					   console.log(resbody);
				   });
                  while(!isReturn){
                      deasync.runLoopOnce();
                  }  
                  console.log(index);	
	              index ++;
               }
			 }			 				
           		   
		   break;
		   
		   case "/describe_instance" : 
		       optionsServer = {
              url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
              headers: {
                 'Accept':'application/json'
              },
              auth: {   
                 'user': username,
                 'pass': password
              }
           };	
           optionsServer.url = 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server'+'?datacenterId='+zoneDc;
		       request(optionsServer, function(error,response,resbody){	                 
		          res.write("describe instance =======> ");
              if (!error && response.statusCode == 200) {
    	           res.write('Received valid response from Server API...');
    	           console.log('Received valid response from Server API...');
                 var info = JSON.parse(resbody);
              //tony added code 
                var nicArr = [];
                var insArrLg = [];
                var insArrRs = [];
                var idArrLg = [];
                var idArrRs = [];
                insArr = [];
                idArr =[];
                for (var i = 0; i < info.server.length; i++) { 
 		         	
 		         	  //tony added code here to generate instanceid.log(interal ip) and internalid.log 
 		         	  //LG and RS may interleave but we need the all of the LG 1st then RS
		         	  if (isOld(zoneDc)) {
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
		           res.write("Total "+insArr.length+ " instances created: "+insArrLg.toString()+"###"+insArrRs.toString()+"<br />");
		           res.write(idArr.toString());
		        }else{
    	         if (response == null) {
		                  res.write('Receive No Response from API...Check your credentials or network');
		               	} else {	               
		               res.write("Response Code is: "+response.statusCode);
                   }
            }        	
            res.end(body);		 
        });
		   
		   break;
		  
           case "/describe_eip" :
		       NUM = parseInt(numOfInstances)+rsNum;
               var optionsNetwork = {
                url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
                headers: {
                   'Accept':'application/json'
                },
                auth: {   
                   'user': username,
                   'pass': password
                }
               };
               optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.1/'+organizationId+'/network/publicIpBlock?networkDomainId='+networkDomainId+'&datacenterId='+zoneDc; 	
               res.write("describe EIPs =======> ");
			   console.log(optionsNetwork);
               request(optionsNetwork,function(error,response,resbody){
			   if (!error && response.statusCode == 200) {
            		console.log("Getting the EIPs...");   
					console.log(resbody);
					var baseEipArr = [];
					var sizeArr = [];
					var eipArr = [];
					eipBlockIdArr = [];
					for (i in JSON.parse(resbody).publicIpBlock){
						baseEipArr.push(JSON.parse(resbody).publicIpBlock[i]['baseIp']);				
						sizeArr.push(JSON.parse(resbody).publicIpBlock[i]['size']);
						eipBlockIdArr.push(JSON.parse(resbody).publicIpBlock[i]['id']);
					}
					console.log(baseEipArr);
					console.log(sizeArr);
					console.log(eipBlockIdArr);
					for (i=0;i<baseEipArr.length;i++){
						var ipv4Arr = baseEipArr[i].split('.'); 
						var lastDecimal = parseInt(ipv4Arr[3]); 
						for (j=0;j<sizeArr[i];j++){
						   eipArr.push(baseEipArr[i]); 
						   lastDecimal++;
						   baseEipArr[i] = ipv4Arr[0]+'.'+ipv4Arr[1]+'.'+ipv4Arr[2]+'.'+lastDecimal.toString();
						}
					}
					console.log(eipArr);
					res.write("Total "+NUM+" EIP created: ");
					fs.writeFileSync(__dirname+"/eipaddr.log","");
					for (i=0;i<NUM;i++){
                       fs.appendFileSync(__dirname+"/eipaddr.log",eipArr[i]+',');
					   res.write(eipArr[i]+',');
                    }					   
					
			   }else{
			      if (response == null) {
		                  res.write('Receive No Response from API...Check your credentials or network');
		               	} else {	               
		               res.write("Response Code is: "+response.statusCode);
                   }   
			   } 
			   res.end(body);
			   });
                   				   			   
           break;		   
		   
		   case "/describe_natrules" : 
		        var optionsNetwork = {
                url: 'https://api-na.dimensiondata.com/caas/2.0/'+organizationId+'/server/server',
                headers: {
                   'Accept':'application/json'
                },
                auth: {   
                   'user': username,
                   'pass': password
                }
             };
		        res.write("describe NAT Rules =======> ");
            if (isOld(zoneDc)) {
               optionsNetwork.url = 'https://api-na.dimensiondata.com/oec/0.9/'+organizationId+'/network/'+networkDomainId+'/natrule';
            } else {
               optionsNetwork.url = 'https://api-na.dimensiondata.com/caas/2.1/'+organizationId+'/network/natRule?networkDomainId='+networkDomainId;
            }   
			var sourceIpArr = [];
			var natIpArr = [];
			natRuleIdArr = [];
            request(optionsNetwork,function(error,response,resbody){
            
            if (!error && response.statusCode == 200) {
            		console.log("Getting the NAT Rules...");
                if (isOld(zoneDc)) {	
            	   var doc = new dom().parseFromString(resbody);
                   sourceIpArr = select(doc, "//*[local-name()='sourceIp']/text()");
                   natIpArr =select(doc,"//*[local-name()='natIp']/text()");
            	  }else {
            		var sourceIpArr =[];
            		var natIpArr =[];
            		for (i in JSON.parse(resbody).natRule) {
            	       sourceIpArr.push(JSON.parse(resbody).natRule[i]['internalIp']);
            	       natIpArr.push(JSON.parse(resbody).natRule[i]['externalIp']);
					   natRuleIdArr.push(JSON.parse(resbody).natRule[i]['id']); 
            		}console.log(natRuleIdArr);
            	  }
            
                var sip = [];
                var nip = [];
                var sipFromLog = [];
                var sidFromLog = [];
                
                sourceIpArr.forEach(function(sourceIp){
                   if (isOld(zoneDc)) {
                	 sip.push(sourceIp.data);
            	   } else {
            		 sip.push(sourceIp);  
            	   }	 
                });
                natIpArr.forEach(function(natip){
            	   if (isOld(zoneDc)) {
                	 nip.push(natip.data);
            	   } else {
            		 nip.push(natip);  
            	   }
                });
                console.log(sip,nip); 
                for (i in sip) {
                	externalIpArr[sip[i]] = nip [i];     //sip  nip 
                	} 
                nip = [];  //reuse for re-ordered listing
                console.log("externalIpArr is:");
                console.log(externalIpArr);
                //read the internal ip log from other routine
                sipFromLog = fs.readFileSync(__dirname+"/instanceid.log").toString().split(',');
                sidFromLog = fs.readFileSync(__dirname+"/serverid.log").toString().split(',');
                fs.writeFileSync(__dirname+"/eipaddr.log","");
                fs.writeFileSync(__dirname+"/server.csv","#serverID,publicIP,dataCenter,httpCheck\n");     //#serverID,publicIP,dataCenter,httpCheck\n
                for (i=0;i<sipFromLog.length-1;i++){
                	nip.push(externalIpArr[sipFromLog[i]]);
                  fs.appendFileSync(__dirname+"/eipaddr.log",externalIpArr[sipFromLog[i]]+',');	
                  fs.appendFileSync(__dirname+"/server.csv",sidFromLog[i]+','+externalIpArr[sipFromLog[i]]+','+zoneDc+','+'yes\n');
                	}	
                console.log("eipadd.log and server.csv are generated!");
                res.write("Total "+nip.length+ " external IPs created: "+nip.toString()+"<br />");
                } else {
              	   if (response == null) {
		                  res.write('Receive No Response from API...Check your credentials or network');
		               	} else {	               
		               res.write("Response Code is: "+response.statusCode);
                   }
              	}	
              	res.end(body);                                   
            });     			                        
                   		       
		   break;
		   		   
		   case "/associate_eip" :                //need to call the request in a loop, only invoke res.end once
		      res.write("Associate EIPs:  ");
              var fileEipId = fs.readFileSync(__dirname+'/eipaddr.log').toString();
              var eipId = fileEipId.split(',');
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');	
              console.log(eipId + "\n" + insId);
			  var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/network/createNatRule',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/network/createNatRule'; 
              if (eipId.length != insId.length) {
              	console.log("Error: EIP number:"+(eipId.length-1)," mismatches "+"INSTANCE number:"+(insId.length-1));
				res.end(body);
              } else {
             var logOnce = true;
             if (eipId.length == 0) {  
             	  console.log("Retrieving no external IPs!");
             	  res.write('Retrieving no external IPs!');
             	  res.end(body);
                	} else {
                res.write("Associating...<br />");
                for (i=0;i<eipId.length-1;i++){
                   var postData = {
                                  "networkDomainId": networkDomainId,
                                  "internalIp" : insId[i], 
								  "externalIp" : eipId[i]
                                  };
                   console.log(options.path +'\n'+JSON.stringify(postData));
                   httpPost(options,postData,function(response,resbody){	                   	  
                      			if (logOnce) {
                      				 res.write(resbody);
                      				 res.end(body);
                      			   console.log(resbody);                   			   
                      			   logOnce = false;
                      			 }
                      		
                      	});
                };   //end of forEach                       
              }
           }		   
		   break;
		   
		   case "/get_mainversion":
		      res.write("Getting the main's build version...<br />");
          var options = {
                url: 'http://'+mainIp+':8080/concerto/',
                headers: {
                   'Accept':'text/html,application/xhtml+xml,application/xml',
                   'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
                }
           //     auth: {   
           //        'user': username,
           //        'pass': password
           //     }
             };
          console.log(options);
		      request(options,function(error,response,resbody){
		      	var versionIndex = resbody.indexOf("version=");
		      	var quoteIndex = resbody.indexOf(')',versionIndex);
		      	buildNum = resbody.substring(versionIndex+8,quoteIndex);
				var fileEipId = fs.readFileSync(__dirname+'/eipaddr.log').toString();
                var eipId = fileEipId.split(',');
		      	console.log(versionIndex,quoteIndex,buildNum);
		      	res.write("Main's build number is: "+ buildNum+"  ");
				var options = {
                url: 'http://'+eipId[0]+':8080/concerto/',
                headers: {
                   'Accept':'text/html,application/xhtml+xml,application/xml',
                   'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
                }
           //     auth: {   
           //        'user': username,
           //        'pass': password
           //     }
             };
               console.log(options);
		       request(options,function(error,response,resbody){
		      	 var versionIndex = resbody.indexOf("build ");
		      	 var quoteIndex = resbody.indexOf('\n',versionIndex);
		      	 var buildNumLG = resbody.substring(versionIndex+6,quoteIndex);
		      	 console.log(versionIndex,quoteIndex,buildNumLG);
		      	 res.write("LG's build number is: "+ buildNumLG);
		      	 res.end(body);		      	
		       });		      	
		      });
	   
		   break;
		   
		   case "/upload_maestro":
		   
		      var maestroFile = fs.readFileSync(__dirname+"/dimensiondata_maestro_userdata.sh").toString();
		      var maestroFile = maestroFile.replace("8669", buildNum);
		      fs.writeFileSync(__dirname+'/dimensiondata_maestro_userdata_upload.sh',maestroFile);
		      var fileEipId = fs.readFileSync(__dirname+'/eipaddr.log').toString();
		      var eipId = fileEipId.split(',');
		      console.log(maestroFile);
		      res.write("Uploading Maestro Files to S3 Bucket...");
		      var s3Options = fs.readFileSync(__dirname+'/aws.json').toString();
		      s3Options = JSON.parse(s3Options);
		      var s3 = new AWS.S3(s3Options);
		      var bucketName = "cloudtest-dimension-data-user-data";		      
		      var index = 0;
				  while (index < eipId.length-1) { 
	            var isReturn = false;
				      var params = {Bucket: 'cloudtest-dimension-data-user-data', Key: eipId[index], Body: maestroFile};
		          console.log(params);
              s3.upload(params, function(err, data) {
                 console.log("Uploading ",index+1,err, data);
                 isReturn = true;
              });
              while(!isReturn){
                 deasync.runLoopOnce();
              }  
                
	            index ++;
           }
           res.end(body);
		   
		   break;
 
		   case "/stop_instance" : 
		        var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/shutdownServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/shutdownServer';  
             var logOnce = true;
             if (idArr.length == 0) {  
             	  console.log("Retrieving no server id!");
             	  res.write('Retrieving no server id!');
             	  res.end(body);
                	} else {
                res.write("Stopping instances<br />");
                idArr.forEach(function(id){
                var postData = {'id':id}; 
                console.log(options.path +'\n'+JSON.stringify(postData));
                httpPost(options,postData,function(response,resbody){	                   	  
                   			if (logOnce) {
                   				 res.write(resbody);
                   				 res.end(body);
                   			   console.log(resbody);                   			   
                   			   logOnce = false;
                   			 }
                   		
                   	});
                });   //end of forEach   
                      
              }
           
		     break;
		   
		   case "/start_instance" : 
		      
              var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/startServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/startServer';  
             var logOnce = true;
             if (idArr.length == 0) {  
             	  console.log("Retrieving no server id!");
             	  res.write('Retrieving no server id!');
             	  res.end(body);
                	} else {
                res.write("Starting instances<br />");
                idArr.forEach(function(id){
                var postData = {'id':id}; 
                console.log(options.path +'\n'+JSON.stringify(postData));
                httpPost(options,postData,function(response,resbody){	                   	  
                   			if (logOnce) {
                   				 res.write(resbody);
                   				 res.end(body);
                   			   console.log(resbody);                   			   
                   			   logOnce = false;
                   			 }
                   		
                   	});
                });   //end of forEach   
                      
              }
           
		     break;
		   
		   case "/restart_instance" : 
		      
              var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/rebootServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/rebootServer';  
             var logOnce = true;
             if (idArr.length == 0) {  
             	  console.log("Retrieving no server id!");
             	  res.write('Retrieving no server id!');
             	  res.end(body);
                	} else {
                res.write("Rebooting instances<br />");
                idArr.forEach(function(id){
                var postData = {'id':id}; 
                console.log(options.path +'\n'+JSON.stringify(postData));
                httpPost(options,postData,function(response,resbody){	                   	  
                   			if (logOnce) {
                   				 res.write(resbody);
                   				 res.end(body);
                   			   console.log(resbody);                   			   
                   			   logOnce = false;
                   			 }
                   		
                   	});
                });   //end of forEach   
                      
              }
           
		     break;
	   
		   
		   case "/dissociate_eip" : 
		      res.write("dissociate EIPs<br />");
              var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/network/deleteNatRule',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		       options.path = '/caas/2.0/'+organizationId+'/network/deleteNatRule'; 
			   var logOnce = true;
             if (natRuleIdArr.length == 0) {  
             	  console.log("Retrieving no NAT Rules!");
             	  res.write('Retrieving no NAT Rules!');
             	  res.end(body);
                	} else {
                for (i=0;i<natRuleIdArr.length;i++){
                   var postData = {
								  "id" : natRuleIdArr[i]
                                  };
                   console.log(options.path +'\n'+JSON.stringify(postData));
                   httpPost(options,postData,function(response,resbody){	                   	  
                      			if (logOnce) {
                      				 res.write(resbody);
                      				 res.end(body);
                      			   console.log(resbody);                   			   
                      			   logOnce = false;
                      			 }
                      		
                      	});
                };   //end of forEach                       
              }
              		   
		   break;
		   
		   case "/delete_instance" :
              
               var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/server/deleteServer',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		         options.path = '/caas/2.0/'+organizationId+'/server/deleteServer';  
             var logOnce = true;
             if (idArr.length == 0) {  
             	  console.log("Retrieving no server id!");
             	  res.write('Retrieving no server id!');
             	  res.end(body);
                	} else {
                res.write("Deleting instances<br />");
                idArr.forEach(function(id){
                var postData = {'id':id}; 
                console.log(options.path +'\n'+JSON.stringify(postData));
                httpPost(options,postData,function(response,resbody){	                   	  
                   			if (logOnce) {
                   				 res.write(resbody);
                   				 res.end(body);
                   			   console.log(resbody);                   			   
                   			   logOnce = false;
                   			 }
                   		
                   	});
                });   //end of forEach   
                      
              }
		   
		   break;
		   
		   case "/delete_eip" :   
		        res.write("Delete EIPs<br />");
              var options = {
                hostname: 'api-na.dimensiondata.com',
                port: 443,
                path: '/caas/2.0/e8cd76a3-7bce-4415-9979-be5b558e0dbd/network/removePublicIpBlock',
                method: "POST",
                headers: {
                	    'Accept':'application/json',
                      'Content-Type':'application/json'
                	},
                auth: username+':'+password
                };
		       options.path = '/caas/2.0/'+organizationId+'/network/removePublicIpBlock'; 
			   var logOnce = true;
             if (eipBlockIdArr.length == 0) {  
             	  console.log("Retrieving no external IP blocks!");
             	  res.write('Retrieving no external IP blocks!');
             	  res.end(body);
                	} else {
                       var index = 0;
				        while (index < eipBlockIdArr.length) { 
	                      var isReturn = false;
				          var postData = {"id":eipBlockIdArr[index]}; 
                          httpPost(options,postData,function(response,resbody){   
                              isReturn = true;	 
                              if (logOnce) { 
				        	      res.write(resbody);
				        		  res.end(body);
                                 logOnce = false;
                              }
				        	   console.log(resbody);
				           });
                         while(!isReturn){
                             deasync.runLoopOnce();
                         }  
                         console.log(index);	
	                     index ++;
                   }		
              }
              		   
		   break;
	   
		   case "/generate_xml" :
		    generateXML.generateXML(path, zoneDc, securityGroup);   
			  res.write("LG.xml and twMonServer.xml file generated");
			  res.end(body);
              var archive = new zip();	
              archive.addFiles([
			  {name:"LG"+zoneDc+".xml",path:__dirname+"/LG"+zoneDc+".xml"},
			  {name:"twMonServer"+zoneDc+".xml",path:__dirname+"/twMonServer"+zoneDc+".xml"},
			  {name:"twLGMon"+zoneDc+".xml",path:__dirname+"/twLGMon"+zoneDc+".xml"}			  
			  ],function(err){
				if (err) return console.log(err);  
				var buff = archive.toBuffer();
				fs.writeFileSync(__dirname+"/archive.zip",buff);
				console.log("3 files zipped!");
			  });				  
           break;
		   
		   case "/archive.zip":
		//      const gzip = zlib.createGzip();		
	    	  var stats = fs.statSync(__dirname+"/archive.zip");  			  
		      res.writeHeader('Content-Length', stats["size"]);
              res.writeHeader('Content-Type', mime.lookup(__dirname+"/archive.zip"));
              res.writeHeader('Content-Disposition', 'attachment; filename=archive.zip');
			  var rd = fs.createReadStream(__dirname+"/archive.zip");		  
			  rd.pipe(res);
			  
		   break;
		   
		   case "/default":
		       inputTextArr = fs.readFileSync(__dirname+"/inputtextdefaultDD.log").toString().split(","); 
		       res.write("Loading the default input text");
		       var inputBoxStr = body.substring(body.indexOf('"65">')+5,body.lastIndexOf("</textarea>"));
				   body = body.replace(inputBoxStr,inputTextArr[0]+','+inputTextArr[1]+','+inputTextArr[2]+','+inputTextArr[3]+','+inputTextArr[4]+','+inputTextArr[5]+','+inputTextArr[6]+','+inputTextArr[7]);
		       res.write(body);
		       res.end();
		   break;
		   
	   	 default:	              
			 res.write("You are hitting the default page"); 
	   		 res.write(body); 
             res.end();			
	   }
	});

});

server.listen(port,host,function(){
	console.log("Listening on ",host,":",port);
});



function stopServers(err,res,body){
	if (!err && res.statusCode == 200) {
	   console.log("Getting Valid Response from Stopping Servers...");	
	   console.log(body);
		}else {
		 console.log("Getting Invalid Response from Stopping Servers...");
		 //console.log(res.statusCode+"\n"+body);		
		 console.log(err,body);	
		}
	
	}


function isOld(DC){
	if (DC == 'NA1' || DC == 'NA3' || DC == 'NA5') {
		return true;
	} else {
		return false;
	}
}

function httpPost(options,postData,callback){	
var req = https.request(options, function(res){        
      var body = "";  
      res.on('data', function(d){
     	  body += d;    	        
      });
	  res.on('end',function(){
	     callback(res,body);
	  });
});
req.write(JSON.stringify(postData));
req.end();
}
/*
function sleep(sleepTime) {
    for(var start = +new Date; +new Date - start <= sleepTime; ) {} 
}
*/

