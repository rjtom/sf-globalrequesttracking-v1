/*
  Copyright 2019 Google LLC

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

//EX-PF009-sfValidator.js
var plugin = {
  
    ruleId: "EX-PF009",
    name: "Require Shared Flow PreFlow Request.",
    message: "Require Flow Callout policy with specific Shared Flow reference in a proxy bundle.",
    fatal: true,
    severity: 2, // error, 1=warning
    nodeType: "Bundle",
    enabled: true
  },
  debug = require("debug")("extensions:" + plugin.ruleId),
  xpath = require("xpath"),
  sfData = require('./sfList.json'),
 // proxyData = require('./proxyList.json'),
  policyMap = new Map(),
  sftemplate = process.env.SF_TEMPLATE,
    
  requiredSharedFlows=[];
  //sfitem = sfdata[sftemplate];

for(var i in sfData[sftemplate])
  {
    console.log("sftemplate= value------====="+sfData[sftemplate][i]);  
    requiredSharedFlows[i] = sfData[sftemplate][i];
    //requiredSharedFlows[i] =sfData.rest_template[i];
  }


var onBundle = function(bundle, cb) {
  
  myProxyName = bundle.name;
  var missingSharedFlows = [];
  var ProxySharedFlow = [];
 
  debug( "ProxyName: " + myProxyName);
  debug( "Required SharedFlows: " + requiredSharedFlows);
 
  
  bundle.getPolicies().forEach(function(p) {
    if( p.getType() == "FlowCallout" ) {
      sharedFlowName = xpath.select("string(/FlowCallout/SharedFlowBundle)",p.getElement());
      ProxySharedFlow.push(sharedFlowName);
    }
  })

 debug( "Proxy SharedFlows: " + ProxySharedFlow);

requiredSharedFlows.forEach(s => {
    if( !ProxySharedFlow.includes(s) ) {
      //console.log("ProxySharedFlow======"+ProxySharedFlow+"---Required SFs----"+s)
      missingSharedFlows.push(s);
    }
  })
  var warnErr = missingSharedFlows.length > 0 ? true : false;
  if (warnErr) {
    bundle.addMessage({
      plugin,
      message: 'Proxy Bundle named: "' + myProxyName + '" requires Shared Flows: "' + requiredSharedFlows + '" but is missing Shared Flows: "' + missingSharedFlows + '"'
    });
    warnErr = true;
  }
  if (typeof cb == "function") {
    cb(null, warnErr);
  }

};


module.exports = {
  plugin,
  onBundle
};
