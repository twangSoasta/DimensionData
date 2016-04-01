var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var zlib = require('zlib');
var zip = require('node-native-zip');
var mime = require('mime');
//var formidable = require('formidable');
var generateXML = require('./GenerateXML.js');
var host = "0.0.0.0";
var port = 8081;

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
var rsNum = 1;
////////////////////////////////////////////////////////////////////////////////////
//added for DimensionData
var insArr = [];
var idArr = [];
var organizationId ="e8cd76a3-7bce-4415-9979-be5b558e0dbd";
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
	'<h1>Welcome to use NodeJs Routine for DimensionData API v0.9</h1>'+
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
    '<textarea name="text" rows="2" cols="65">'+inputTextArr[0]+','+inputTextArr[1]+','+inputTextArr[2]+','+inputTextArr[3]+','+inputTextArr[4]+','+inputTextArr[5]+','+inputTextArr[6]+'</textarea>'+
    '<input type="submit" value="Submit" style="height:20px;width:80px" />'+
    '</form>'+
/*    '<form action="/create_LG" method="post">'+           
	  '<input type="submit" value="Create_lg" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+
	  '<form action="/create_RS" method="post">'+           
	  '<input type="submit" value="Create_rs" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+
	'<form action="/create_eip" method="post">'+           
	'<input type="submit" value="Create_eip" style="height:20px;width:120px;background:#FFC0CB" />'+
    '</form>'+ */
	'<form action="/describe_instance" method="post">'+           
	'<input type="submit" value="Describe_instance" style="height:20px;width:120px;background:#CAFF70" />'+
    '</form>'+
	'<form action="/describe_eip" method="post">'+           
	'<input type="submit" value="Describe_eip" style="height:20px;width:120px;background:#CAFF70" />'+
    '</form>'+
/*	'<form action="/associate_eip" method="post">'+           
	'<input type="submit" value="Associate_eip" style="height:20px;width:120px;background:#EEEE00" />'+
    '</form>'+  */
	'<form action="/stop_instance" method="post">'+           
	'<input type="submit" value="Stop_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
	'<form action="/start_instance" method="post">'+           
	'<input type="submit" value="Start_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
	'<form action="/restart_instance" method="post">'+           
	'<input type="submit" value="Restart_instance" style="height:20px;width:120px;background:#EECFA1" />'+
    '</form>'+
/*	'<form action="/dissociate_eip" method="post">'+           
	'<input type="submit" value="Dissociate_eip" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+
	'<form action="/delete_instance" method="post">'+           
	'<input type="submit" value="Delete_instance" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+
	'<form action="/delete_eip" method="post">'+           
	'<input type="submit" value="Delete_eip" style="height:20px;width:120px;background:#A2B5CD" />'+
    '</form>'+ */
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
	var postData = "";	
	req.setEncoding('utf-8');
	req.on("data",function(postDataChunk){     // monitoring the incoming request POST data chunks
		postData += postDataChunk;
	});
	req.on("end",function(){
		var finalTxt = decodeURIComponent(postData.toString().substring(5));
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
   		           res.write('Received invalid response or error from My Account API...<br \>');
   		           res.write('Status code: '+response.statusCode);
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
             path = path.replace(/\+/g,' '); 
             zoneDc = zoneDc.replace(/\+/g,' '); 
             instanceType = instanceType.replace(/\+/g,' '); 
             imageId = imageId.replace(/\+/g,' '); 
             imageIdRS = imageIdRS.replace(/\+/g,' '); 
				     console.log("path is: "+path);		 
				     			 
             NUM = parseInt(numOfInstances);	   //assuming upload will always happen before create
				     div = Math.floor(NUM/10);
             mod = NUM - div*10;        
				     console.log(NUM,div,mod);
	   	   		 res.write("DataCenter location is: "+zoneDc);
	   	   		 if (isOld(zoneDc)){
	   	   		    res.write(' and it is MCP 0.9 style');
	   	   		 	} else {
	   	   		 		res.write(' and it is MCP 2.0 style');
	   	   		 		}
				     var inputBoxStr = body.substring(body.indexOf('="65">')+6,body.lastIndexOf("</textarea>"));
				     body = body.replace(inputBoxStr,numOfInstances+","+eipBandwidth+","+zoneDc+","+instanceType+","+imageId+","+imageIdRS+","+path);
				     fs.writeFileSync(__dirname+"/inputtextDD.log",numOfInstances+','+eipBandwidth+','+zoneDc+','+instanceType+','+imageId+','+imageIdRS+','+path);   //every submit save for the default input text next time start the program
	   	   		 res.end(body);   	   		
	   	   break;
	/*   	   
	   	   case "/create_LG" : 
	   	       console.log(mod+" "+numOfInstances+" "+eipBandwidth+" "+zoneDc+" "+instanceType+" "+imageId+" "+imageIdRS+" "+path);		         
		         var modJsonInsLG = 
				         {"count":mod,
                  "image_id":imageId,
                  "instance_type":instanceType,
                  "zone":zoneDc,
                  "instance_name":"twLG",
                  "login_mode":"passwd",
                  "login_passwd":"Soasta2006",
                  "vxnets.1":"vxnet-0",
                  "signature_version":1,                     
                  "signature_method":"HmacSHA256",              
                  "version":1,                              
                  "access_key_id":access_key_id,   
                  "action":"RunInstances",            
                  "time_stamp":"2013-08-27T14:30:10Z"};
                                
	   	   		 
				     var myParameterCreateArr = [];   //used for Async loop 
             for (i=0; i<div;i++) {				 
					      myParameterCreateArr.push(jsonObj[pathName]);
					   }
             myParameterCreateArr.push(modJsonInsLG);
				     myParameterCreateArr.forEach(function(myParameterCreate){
                 command2Qc.command2Qc(myParameterCreate,method,uri,secret,function(resObj){ 
				    res.write("Creating LG in progress<br />");
                    res.write(resObj.status);	
                    res.end(body);					
                    });
             }); 
             LGDone = true; 
	   	   break;
	   	   
	   	   case "/create_RS":
	   	      console.log("rsNum: "+rsNum);
		        if (!LGDone) {
		      	    res.write("Needs LG number to determine RS number, please go back and create some LGs 1st!");
					res.end(body);	
		      	 } else {
		        var modJsonInsRS = 
				         {"count":rsNum,
                  "image_id":imageIdRS,
                  "instance_type":instanceType,
                  "zone":zoneDc,
                  "instance_name":"twRS",
                  "login_mode":"passwd",
                  "login_passwd":"Soasta2006",
                  "vxnets.1":"vxnet-0",
                  "signature_version":1,                     
                  "signature_method":"HmacSHA256",              
                  "version":1,                              
                  "access_key_id":access_key_id,   
                  "action":"RunInstances",            
                  "time_stamp":"2013-08-27T14:30:10Z"};
		        command2Qc.command2Qc(modJsonInsRS,method,uri,secret,function(resObj){  
				    res.write("Creating RS in progress<br />");
                    res.write(resObj.status);	
                    res.end(body);						
                    });
            LGDone = false;
            }
		     break;
	   	   	 
	   	  
		   case "/create_eip" : 
		    NUM = parseInt(numOfInstances)+rsNum;	   //assuming upload will always happen before create
			  div = Math.floor(NUM/10);
        mod = NUM - div*10;        
			  console.log("Eips number: "+NUM+" "+div+" "+mod);
			  var modJsonEip =  
				   {"count":mod,
            "bandwidth":eipBandwidth,
            "billing_mode":"traffic",
            "eip_name":"twEIP",
            "zone":zoneDc,
            "signature_version":1,                     
            "signature_method":"HmacSHA256",              
            "version":1,                              
            "access_key_id":access_key_id,   
            "action":"AllocateEips",            
            "time_stamp":"2013-08-27T14:30:10Z"};
                var myParameterCreateArr = [];   //used for Async loop
                for (i=0; i<div;i++) {
					 myParameterCreateArr.push(jsonObj[pathName]);
					}
				 myParameterCreateArr.push(modJsonEip);
				 myParameterCreateArr.forEach(function(myParameterCreate){
                 command2Qc.command2Qc(myParameterCreate,method,uri,secret,function(resObj){   
				    res.write("Creating eips in progress<br />");
                    res.write(resObj.status);	
                    res.end(body);					 
                  });
                 });  
           		   
		   break;
	*/	   
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
    	         res.write('Received invalid response or error from Server API...');
               res.write(JSON.stringify(response));
            }        	
            res.end(body);		 
        });
		   
		   break;
/*		   
		   case "/describe_eip" : 
		      
            command2Qc.command2Qc(jsonObj[pathName],method,uri,secret,function(resObj){
		    res.write("describe eip =======> ");
            if ( resObj.eip_set == undefined) {
           	  res.write("API returns nothing, check your API keys!<br />");
           	} else { 
            	var eipSetLength = resObj.eip_set.length;
            	var eipArr = [];
            	if (OVERWRITE_FILE){
            	fs.writeFileSync(__dirname+'/eipid.log',""); 
            	fs.writeFileSync(__dirname+'/eipaddr.log',""); 
            	}
            	   resObj.eip_set.forEach(function(eipObj){
            		  if (eipObj.eip_name === "twEIP" && (eipObj.status === "available" || eipObj.status === "associated")) {
            			  eipArr.push(eipObj.eip_addr);
            			  fs.appendFileSync(__dirname+'/eipid.log',eipObj.eip_id+','); 
            	          fs.appendFileSync(__dirname+'/eipaddr.log',eipObj.eip_addr+','); 
            		  }	  
            	   });
            	   console.log("eipArr:\n",eipArr); 
            	   res.write("Total "+eipArr.length.toString()+ " EIPs created: "+eipArr.toString()+"<br />");	
            	}
				    res.write(resObj.status);	
                    res.end(body);
            });
		   
		   break;
*/		   
/*		   
		   case "/associate_eip" :                //need to call the request in a loop, only invoke res.end once
		      res.write("associate eip<br />");
			  var once = true;
              var fileEipId = fs.readFileSync(__dirname+'/eipid.log').toString();
              var eipId = fileEipId.split(',');
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');	
              console.log(eipId + "\n" + insId);
              if (eipId.length != insId.length) {
              	console.log("Error: EIP number:"+eipId.length," mismatches "+"INSTANCE number:"+insId.length);
				res.end(body);
              } else {
              	for (i=0; i< eipId.length -1;i++){
              		console.log(i);
              		jsonObj[pathName].eip = eipId[i];
                    jsonObj[pathName].instance = insId[i];
              		command2Qc.command2Qc(jsonObj[pathName],method,uri,secret,function(resObj){
						 if (once == true) {
						 once = false;
                         res.write(resObj.status);	
                         res.end(body);    						 
						 }
                         });
              	}
               }
		   
		   break;
*/	

/*   
		   case "/stop_instance" : 
		      
	   	      
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');
			  var bodytxt ="";
              for (i=0; i< insId.length -1;i++){
              		var newName = ("instances."+ (i+1)).toString();
              		bodytxt += "&" + newName + "=" + insId[i].toString();  	
              	}
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
              var param = querystring.parse(paraQuery);           
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){  
			      res.write("Stopping instances<br />");
                  res.write(resObj.status);	
                  res.end(body);					  
              });

		     break;
		   
		   case "/start_instance" : 
		      
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');
			  var bodytxt ="";
              for (i=0; i< insId.length -1;i++){
              		var newName = ("instances."+ (i+1)).toString();
              		bodytxt += "&" + newName + "=" + insId[i].toString();  	
              	}
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
              var param = querystring.parse(paraQuery);           
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){  
			      res.write("Starting instances<br />");
                  res.write(resObj.status);	
                  res.end(body);				  
              });

		   break;
		   
		   case "/restart_instance" : 
		      
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');
			  var bodytxt = "";
              for (i=0; i< insId.length -1;i++){
              		var newName = ("instances."+ (i+1)).toString();
              		bodytxt += "&" + newName + "=" + insId[i].toString();  	
              	}
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
              var param = querystring.parse(paraQuery);
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){
				  res.write("Restarting instances<br />");
				  res.write(resObj.status);	
                  res.end(body);	
              	
              });
              	   
		   break;
*/		   
/*		   
		   case "/dissociate_eip" : 
		      
              var fileEipId = fs.readFileSync(__dirname+'/eipid.log').toString();
              var eipId = fileEipId.split(',');
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');	
              
              if (eipId.length != insId.length) {
              	console.log("Error: EIP number:"+eipId.length," mismatches "+"INSTANCE number:"+insId.length);
              } else {
              	var bodytxt ="";
              	for (i=0; i< eipId.length -1;i++){
              		var newName = ("eips."+ (i+1)).toString();
              		bodytxt += "&" + newName + "=" + eipId[i].toString();  	
              	}
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
              var param = querystring.parse(paraQuery);
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){   
			          res.write("dissociate eip<br />");
                      res.write(resObj.status);	
                      res.end(body);				  
                      });
               }
              		   
		   break;
		   
		   case "/delete_instance" :
              
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');
			  var bodytxt ="";
              for (i=0; i< insId.length -1;i++){
              		var newName = ("instances."+ (i+1)).toString(); 
              		bodytxt += "&" + newName + "=" + insId[i].toString();  	
              	}
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
              var param = querystring.parse(paraQuery);              
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){   
			     res.write("delete instances<br />");
                 res.write(resObj.status);	
                 res.end(body);			  
              });	   
		   
		   break;
		   
		   case "/delete_eip" : 
		      
              var fileEipId = fs.readFileSync(__dirname+'/eipid.log').toString();
              var eipId = fileEipId.split(',');
              var fileInsId = fs.readFileSync(__dirname+'/instanceid.log').toString();
              var insId = fileInsId.split(',');	
              
              
              var bodytxt ="";
              for (i=0; i< eipId.length -1;i++){
              	var newName = ("eips."+ (i+1)).toString();   
              	bodytxt += "&" + newName + "=" + eipId[i].toString(); 
              }
              var paraQuery = querystring.stringify(jsonObj[pathName]) + bodytxt;
			  var param = querystring.parse(paraQuery); 
              command2Qc.command2Qc(param,method,uri,secret,function(resObj){  
			      res.write("delete eips<br />");
                  res.write(resObj.status);	
                  res.end(body);				  
                      });
		   
		   break;
	*/	   
		   case "/generate_xml" :
		      generateXML.generateXML(path, zoneDc, securityGroup);   
			  res.write("LG.xml and twMonServer.xml file generated");
			  res.end(body);
              var archive = new zip();	
              archive.addFiles([
			  {name:"LG.xml",path:__dirname+"/LG.xml"},
			  {name:"twMonServer.xml",path:__dirname+"/twMonServer.xml"},
			  {name:"twLGMon.xml",path:__dirname+"/twLGMon.xml"}			  
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
				   body = body.replace(inputBoxStr,inputTextArr[0]+','+inputTextArr[1]+','+inputTextArr[2]+','+inputTextArr[3]+','+inputTextArr[4]+','+inputTextArr[5]+','+inputTextArr[6]);
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
