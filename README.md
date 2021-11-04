## Node commands

### Install nodejs dependencies
```npm install```

### Build the code
```mvn resources:resources@copy-resources -Ddeployment.suffix= && mvn com.google.code.maven-replacer-plugin:replacer:replace@replace-tokens -Ddeployment.suffix= && mvn apigee-enterprise:configure@configure-bundle-step -Ddeployment.suffix= && mkdir ./target/reports && mvn jshint:lint && mvn exec:exec@apigee-lint```

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

