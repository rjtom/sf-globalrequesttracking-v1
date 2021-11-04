## Node commands

### Install nodejs dependencies
```npm install```

### Build the code
```mvn resources:resources@copy-resources -Ddeployment.suffix= && mvn com.google.code.maven-replacer-plugin:replacer:replace@replace-tokens -Ddeployment.suffix= && mvn apigee-enterprise:configure@configure-bundle-step -Ddeployment.suffix= && mkdir ./target/reports && mvn jshint:lint && mvn exec:exec@apigee-lint```

Please note that we don't want to hard code the APIGEE Host/Domain names in the codebase but rather we want to be able to run the test cases against any possible environment.

This creates a need to inject the domain name via a config file. Please see the file `test/integration/test-config.json'


Hence there is a need to use Maven replacer plugin.

### Get the test cases ready for testing
```mvn resources:resources@copy-apickli-config && mvn com.google.code.maven-replacer-plugin:replacer:replace@replace-apigee-northbound-domain -Ddeployment.suffix=  -Dapi.northbound.domain=partner20-amer1-dev.apigee.net```

### Run the test cases
```./node_modules/cucumber/bin/cucumber-js -f node_modules/cucumber-pretty ./target/test/integration/features --tags @httpbin-get```

```./node_modules/cucumber/bin/cucumber-js -f node_modules/cucumber-pretty ./target/test/integration/features --tags @httpbin-post```

```./node_modules/cucumber/bin/cucumber-js -f node_modules/cucumber-pretty ./target/test/integration/features --tags @httpbin-put```

```./node_modules/cucumber/bin/cucumber-js -f node_modules/cucumber-pretty ./target/test/integration/features --tags @httpbin-patch```


```./node_modules/cucumber/bin/cucumber-js -f node_modules/cucumber-pretty ./target/test/integration/features --tags @httpbin-delete```



----------------

# Maven commands

### Install Node dependencies
```mvn exec:exec@npm-install```

### Build
1. Step 1
```mvn resources:resources@copy-resources -Ddeployment.suffix=```
2. Step 2
```mvn com.google.code.maven-replacer-plugin:replacer:replace@replace-tokens -Ddeployment.suffix=```
3. Step 3
```mvn apigee-enterprise:configure@configure-bundle-step -Ddeployment.suffix=```

### Code quality
1. Step 1
```mkdir ./target/reports```
2. Step 2
```mvn jshint:lint```
3. Step 3
```mvn exec:exec@apigee-lint```

### Deploy
```mvn apigee-enterprise:deploy@deploy-bundle-step -Ptest -Dorg=partner20-amer1 -Dusername=${YOUR-APIGEEE-USER-ID} -Dpassword=${YOUR-APIGEEE-PASSWORD} -Doptions=validate -DapigeeNorthBoundDomain=partner20-amer1-dev.apigee.net -Ddeployment.suffix=```

### Integration test
1. Step 1 - Update the test config with the base URL, etc.
```mvn resources:resources@copy-apickli-config && mvn com.google.code.maven-replacer-plugin:replacer:replace@replace-apigee-northbound-domain -Ddeployment.suffix= -Dapi.northbound.domain=partner20-amer1-dev.apigee.net```
2. Step 2 - Run the test
```mvn exec:exec@integration-test -Dapi.testtag='@httpbin-get'```
