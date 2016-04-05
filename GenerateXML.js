//generate the LG xml import list file
var fs = require('fs');
//var PATH = "Beijing Qingcloud Loc #2";      //"QingCloud China Beijing 2";
//var REGION = "pek2";
var securityGroup = "sg-u279b2do";     //"sg-ewbcbab5";

//generateXML(PATH, REGION, securityGroup);
exports.generateXML = generateXML;

function generateXML(PATH, REGION, securityGroup){
var instanceId = "";
var eip = "";
var instanceIdArr = fs.readFileSync(__dirname+"/instanceid.log").toString().split(",");
var eipArr = fs.readFileSync(__dirname+"/eipaddr.log").toString().split(",");
var startData = "<?xml version='1.0' encoding='UTF-8'?>\n" +
"<rp:ObjectSet xmlns:rp=\"http://www.soasta.com/services/repository\">\n";
var endData = "</rp:ObjectSet>";
var startMonData = 
'<?xml version=\'1.0\' encoding=\'UTF-8\'?>' +
'<rp:ObjectSet xmlns:rp="http://www.soasta.com/services/repository">' +
  '<Object type="target" schemaVersion="8138" name="twMonServer" path="/">' +
    '<Body>'+
      '<Target xmlns="http://www.soasta.com/services/repository">'+
        '<MonitorDefinition>'+
          '<Hosts>\n';
var endMonData = 
'</Hosts>'+
          '<Machines>'+
            '<Machine>'+
              '<ID>1</ID>'+
              '<Name>null</Name>'+
              '<Port>22</Port>'+
              '<UserName>root</UserName>'+
              '<Password e="true">h1RVr1y4m/tO9DPk9AI4dw==</Password>'+
              '<OperatingSystem>RedHatEnterpriseLinux</OperatingSystem>'+
            '</Machine>'+
          '</Machines>'+
        '</MonitorDefinition>'+
      '</Target>'+
    '</Body>'+
    '<BinaryData />'+
    '<Description></Description>'+
    '<Attributes>'+
      '<Attribute name="type">'+
        '<Value>monitor</Value>'+
      '</Attribute>'+
      '<Attribute name="resultsServiceID">'+
        '<Value>95305</Value>'+
      '</Attribute>'+
      '<Attribute name="longitude">'+
        '<Value null="true" />'+
      '</Attribute>'+
      '<Attribute name="latitude">'+
        '<Value null="true" />'+
      '</Attribute>'+
    '</Attributes>'+
  '</Object>'+
'</rp:ObjectSet>';

fs.writeFileSync(__dirname+"/LG.xml",startData);
fs.writeFileSync(__dirname+"/twMonServer.xml",startMonData);
// 5, 4LG, 1RS     55, 53LG, 2RS, 155, 151LG,4RS   51 = 50 + 1  53 = 51 + 1 + 1(2RS) 104 = 101 + 2 + 1(3RS)
// 1, 52, 103, 154 are not valid numbers, mod51 == 1 is not valid
var totalServerNum = instanceIdArr.length -1;
div51 = Math.floor(totalServerNum/51);
mod51 = totalServerNum - div51*51
rsNum = (mod51 == 0)? div51:div51+1;
lgNum = totalServerNum - rsNum;
console.log("Total Servers:"+totalServerNum+"  "+"LG:"+lgNum+"  "+"RS:"+rsNum);

for (i=0; i< instanceIdArr.length-1; i++) {
var j;
instanceId = instanceIdArr[i];
eip = eipArr[i];

if (i<=lgNum){
   j=1;
   if (i == lgNum) {
   	console.log("The following is RS");
   	}
   }else{
   	j++;
   }
console.log("id:",instanceId+"  "+"eip:"+eip);
var mainData = (i<lgNum)?"<Object type=\"server\" schemaVersion=\"8138\" name=\""+"twLG"+ (i+1) +"\" path=\"" +PATH+ "\">\n<Body>\n<Server xmlns=\"http://www.soasta.com/services/repository\">\n<Options />\n<Maestro>\n<Settings>\n<Setting name=\"Pool.MaxWorkerCount\" value=\"8192\" />\n<Setting name=\"RSClient.DistributeAmongResultServers\" value=\"true\" />\n<Setting name=\"ServerType\" value=\"Load\" />\n</Settings>\n<Contact url=\"http://" + instanceId + ":8080/concerto/services/hessian/Maestro\" urlOutsideLocation=\"http://" + eip + ":8080/concerto/services/hessian/Maestro\" />\n</Maestro>\n<Monitor>\n<Settings>\n<Setting name=\"ServerType\" value=\"Slave\" />\n</Settings>\n<Contact url=\"http://" + instanceId+ ":8080/concerto/services/hessian/MonitorService\" urlOutsideLocation=\"http://" + eip + ":8080/concerto/services/hessian/MonitorService\" />\n</Monitor>\n<CloudProviderAccountRef>cparef</CloudProviderAccountRef>\n<CloudInfo>\n<Provider>QINGCLOUD</Provider>\n<ServerClassName>QingCloud Test Server (Large)</ServerClassName>\n<Region>"+ REGION+ "</Region>\n<VendorID>i-f9kxa98l</VendorID>\n<SecurityGroup>" + securityGroup +"</SecurityGroup>\n<PublicHostName>"+ eip +"</PublicHostName>\n</CloudInfo>\n</Server>\n</Body>\n<BinaryData />\n<Description></Description>\n<Attributes>\n<Attribute name=\"hostName\">\n<Value>" +instanceId+ "</Value>\n</Attribute>\n<Attribute name=\"address\">\n<Value null=\"true\" />\n</Attribute>\n<Attribute name=\"state\">\n<Value>RUNNING</Value>\n</Attribute>\n<Attribute name=\"cloudServerStatisticsId\">\n<Value>0c13c1a2-a4b6-45ff-b52d-82cd2a8a5ac9</Value>\n</Attribute>\n<Attribute name=\"cloudServer\">\n<Value>true</Value>\n</Attribute>\n<Attribute name=\"authKey\">\n<Value>UUgp+cJFW+NbFeo0SOExlokJWE6tIMppgshTLUksNew1WoNZWo5v/g==</Value>\n</Attribute>\n</Attributes>\n</Object>\n"
                        :'<Object type="server" schemaVersion="8138" name="twRS' + (j) + '" path="'+PATH+'">\n'+
    '<Body>\n'+
      '<Server xmlns="http://www.soasta.com/services/repository">\n'+
                
        '<Options />\n'+
                
        '<Results>\n'+
                    
          '<Settings>\n'+
                        
                        
            '<Setting name="Batching.bAsyncBatchInserts" value="true" />\n'+
                        
                        
            '<Setting name="ServerType.Consolidator" value="true" />\n'+
                        
                        
            '<Setting name="ServerType.Reader" value="false" />\n'+
                        
                        
            '<Setting name="ServerType.Writer" value="false" />\n'+
                        
                    
          '</Settings>\n'+
                    
          '<Contact url="http://'+instanceId+':8080/concerto/services/hessian/ResultsService" urlOutsideLocation="http://'+eip+':8080/concerto/services/hessian/ResultsService" />\n'+
                
        '</Results>\n'+
                
        '<Monitor>\n'+
                    
          '<Settings>\n'+
                        
                        
            '<Setting name="ServerType" value="Slave" />\n'+
                        
                    
          '</Settings>\n'+
                    
          '<Contact url="http://'+instanceId+':8080/concerto/services/hessian/MonitorService" urlOutsideLocation="http://'+eip+':8080/concerto/services/hessian/MonitorService" />\n'+
                
        '</Monitor>\n'+
                
        '<CloudProviderAccountRef>cparef</CloudProviderAccountRef>\n'+
                
        '<CloudInfo>\n'+
                    
          '<Provider>QINGCLOUD</Provider>\n'+
                    
          '<ServerClassName>QingCloud Results Server (Large)</ServerClassName>\n'+
                    
          '<Region>'+REGION+'</Region>\n'+
                    
          '<VendorID>i-v7r5o7j2</VendorID>\n'+
                    
          '<SecurityGroup>'+securityGroup+'</SecurityGroup>\n'+
                    
          '<PublicHostName>'+eip+'</PublicHostName>\n'+
                
        '</CloudInfo>\n'+
            
      '</Server>\n'+
    '</Body>\n'+
    '<BinaryData />\n'+
    '<Description></Description>\n'+
    '<Attributes>\n'+
      '<Attribute name="hostName">\n'+
        '<Value>'+instanceId+'</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="address">\n'+
        '<Value null="true" />\n'+
      '</Attribute>\n'+
      '<Attribute name="state">\n'+
        '<Value>RUNNING</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="cloudServerStatisticsId">\n'+
        '<Value>4e016a33-6ff9-4d78-9421-f2322d651908</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="cloudServer">\n'+
       '<Value>true</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="authKey">\n'+
        '<Value>SI2K1W+/fZ1ixg4jLc4W58mYATTE2u5UWf6WyhFxg7GF6Lyw/+0jBg==</Value>\n'+
      '</Attribute>\n'+
    '</Attributes>\n'+
  '</Object>\n';
  
var monData = '<Host>' + eip + '</Host>\n';
fs.appendFileSync(__dirname+"/LG.xml",mainData);
fs.appendFileSync(__dirname+"/twMonServer.xml",monData);
}
  
fs.appendFileSync(__dirname+"/LG.xml",endData);
console.log("LG file write completed!!!");
fs.appendFileSync(__dirname+"/twMonServer.xml",endMonData);
console.log("Monitor file write completed!!!");
}










///////////////////////////// the following data format is saved for future reference

/*
var rsData = 
 '<Object type="server" schemaVersion="8138" name="RS_01" path="QingCloud China Beijing 2">\n'+
    '<Body>\n'+
      '<Server xmlns="http://www.soasta.com/services/repository">\n'+
                
        '<Options />\n'+
                
        '<Results>\n'+
                    
          '<Settings>\n'+
                        
                        
            '<Setting name="Batching.bAsyncBatchInserts" value="true" />\n'+
                        
                        
            '<Setting name="ServerType.Consolidator" value="true" />\n'+
                        
                        
            '<Setting name="ServerType.Reader" value="false" />\n'+
                        
                        
            '<Setting name="ServerType.Writer" value="false" />\n'+
                        
                    
          '</Settings>\n'+
                    
          '<Contact url="http://i-sz0scjan:8080/concerto/services/hessian/ResultsService" urlOutsideLocation="http://119.254.209.104:8080/concerto/services/hessian/ResultsService" />\n'+
                
        '</Results>\n'+
                
        '<Monitor>\n'+
                    
          '<Settings>\n'+
                        
                        
            '<Setting name="ServerType" value="Slave" />\n'+
                        
                    
          '</Settings>\n'+
                    
          '<Contact url="http://i-sz0scjan:8080/concerto/services/hessian/MonitorService" urlOutsideLocation="http://119.254.209.104:8080/concerto/services/hessian/MonitorService" />\n'+
                
        '</Monitor>\n'+
                
        '<CloudProviderAccountRef>cparef</CloudProviderAccountRef>\n'+
                
        '<CloudInfo>\n'+
                    
          '<Provider>QINGCLOUD</Provider>\n'+
                    
          '<ServerClassName>QingCloud Results Server (Large)</ServerClassName>\n'+
                    
          '<Region>pek2</Region>\n'+
                    
          '<VendorID>i-v7r5o7j2</VendorID>\n'+
                    
          '<SecurityGroup>sg-ewbcbab5</SecurityGroup>\n'+
                    
          '<PublicHostName>119.254.210.62</PublicHostName>\n'+
                
        '</CloudInfo>\n'+
            
      '</Server>\n'+
    '</Body>\n'+
    '<BinaryData />\n'+
    '<Description></Description>\n'+
    '<Attributes>\n'+
      '<Attribute name="hostName">\n'+
        '<Value>i-sz0scjan</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="address">\n'+
        '<Value null="true" />\n'+
      '</Attribute>\n'+
      '<Attribute name="state">\n'+
        '<Value>RUNNING</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="cloudServerStatisticsId">\n'+
        '<Value>4e016a33-6ff9-4d78-9421-f2322d651908</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="cloudServer">\n'+
       '<Value>true</Value>\n'+
      '</Attribute>\n'+
      '<Attribute name="authKey">\n'+
        '<Value>SI2K1W+/fZ1ixg4jLc4W58mYATTE2u5UWf6WyhFxg7GF6Lyw/+0jBg==</Value>\n'+
      '</Attribute>\n'+
    '</Attributes>\n'+
  '</Object>\n';
*/

/*
var monData = 
'<?xml version=\'1.0\' encoding=\'UTF-8\'?>' +
'<rp:ObjectSet xmlns:rp="http://www.soasta.com/services/repository">' +
  '<Object type="target" schemaVersion="8138" name="twMonServer" path="/">' +
    '<Body>'+
      '<Target xmlns="http://www.soasta.com/services/repository">'+
        '<MonitorDefinition>'+
          '<Hosts>'+
            '<Host>124.42.118.207</Host>'+
            '<Host>124.42.118.72</Host>'+
            '<Host>124.42.118.46</Host>'+
          '</Hosts>'+
          '<Machines>'+
            '<Machine>'+
              '<ID>1</ID>'+
              '<Name>null</Name>'+
              '<Port>22</Port>'+
              '<UserName>root</UserName>'+
              '<Password e="true">h1RVr1y4m/tO9DPk9AI4dw==</Password>'+
              '<OperatingSystem>RedHatEnterpriseLinux</OperatingSystem>'+
            '</Machine>'+
          '</Machines>'+
        '</MonitorDefinition>'+
      '</Target>'+
    '</Body>'+
    '<BinaryData />'+
    '<Description></Description>'+
    '<Attributes>'+
      '<Attribute name="type">'+
        '<Value>monitor</Value>'+
      '</Attribute>'+
      '<Attribute name="resultsServiceID">'+
        '<Value>95305</Value>'+
      '</Attribute>'+
      '<Attribute name="longitude">'+
        '<Value null="true" />'+
      '</Attribute>'+
      '<Attribute name="latitude">'+
        '<Value null="true" />'+
      '</Attribute>'+
    '</Attributes>'+
  '</Object>'+
'</rp:ObjectSet>';
*/
