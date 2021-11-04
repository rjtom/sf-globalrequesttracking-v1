#!/bin/groovy
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import hudson.model.*

node {
    
    // Install Maven and add to PATH
    env.MVN_HOME="${tool 'Maven 3.5.2'}"
    env.PATH="${env.MVN_HOME}/bin:${env.PATH}"
    
    // Install nodejs and add to PATH
    env.NODEJS_HOME = "${tool 'Node JS 13.10.1'}"
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"

    // Print PATH variables that will be used across the build
    print env.PATH

    // Pull the credentials and store in env variables
    withCredentials([string(credentialsId: 'apigee-authorization-header-partner20-amer1', variable: 'SECRET')]) { //set SECRET with the credential content
      env.authorization=SECRET
    }

    withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'apigee-credentials-partner20-amer1', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD']]){ //set SECRET with the credential content
        env.apigeeUsername=USERNAME
        env.apigeePassword=PASSWORD
    }
    
    def succesfulIntegrationTests = false
    def sfRevisonThatWorks
    def sfRevisonThatDoesNotWork
    //def sfRevisonExists = true 
    env.sfRevisonExists = "true" // flag to activate previous revision only if it has deployments  
    env.sfExists = "true" // flag to delete the sf in the rollback incase the sf doesn’t exist 
    //print " env.sfRevisonExists========initial========"+env.sfRevisonExists

    try {
        sfCheckout()
        sfGetCurrentRevision(true)
        // Takes care of installing all dependencies (Node, Java, etc.)
        sfBuild()
        //print "Sf_template ======================="+params.sf_template
        sfLint()
        sfDeploy()
        succesfulIntegrationTests = true //Always set to true since we can test sharedflows by itself

        // ONLY for coding purpose.. Test the positive flow
        // succesfulIntegrationTests = true
        // ONLY for coding purpose.. Test the negative flow 
        //succesfulIntegrationTests = false // uncommented to test the negative flow

        print ">>>>>>>>>>>> succesfulIntegrationTests: " + succesfulIntegrationTests 

        if(succesfulIntegrationTests) {
            // Tag the repo with an incremental version.. If the tag exists already, move the tag up to the latest commit.
            tagArtifacts()
        } else {
          // Start rollback and activate previous revision in the env variable --> env.sfRevisonThatWorks

          /*
              *** Potential steps.. Needs tuning ***
              1. Create a new directory called "rollback"
              2. Checkout the artifacts with an old tag.. Ex. Get the latest tag available.. 
                In this case, it could be 2.1.. Need to communicate that there is a dependency on how we version/tag the codebase
                This is specifically needed for the "configurations" and NOT for the 'proxies' as we dont have the concept of revisions for the configurations
              3. The real undeploy steps for "sf"
                a. Undeploy the latest revision for the given environment which probably didn't pass the test cases
                b. Activate the revision (env.sfRevisonThatWorks) which we found to be working when the pipeline started 
                c. If required, delete the failed revision on Edge.. It is good to delete as we don't recommend having the failed revision.. But sometimes its good to have the failed revision on Edge to debug/trace
              4. The real undeploy steps for "Config"
                a. Get the latest deployed configurations deleted from Edge
                    -Dapigee.config.options=delete
                b. Re-Apply the configurations checked out in step #2 above.
                    -Dapigee.config.options=update
          */
          print "**** Integration test failed and rolling back the sf to previous revision: " + sfRevisonThatWorks
          createRollBackArtifacts()
          sfGetCurrentRevision(false)
          sfUnDeployRevision()
          //activatePreviousRevision() commented to activate sf after rollback
          //print "env.sfExists================"+env.sfExists 
          if(env.sfExists == "true") // delete the failed revision only if the sf already exists
          {
          sfDeleteFailedRevision()
    
          }
          rollBackConfig()
          if(env.sfExists == "false") // delete the sf 
          {
          //print " inside sf delete----------------"
          sfFailedDelete()
        
          }
          
          //print " sfRevisonThatWorks================"+sfRevisonThatWorks
          //print " env.sfRevisonExists========final========"+env.sfRevisonExists
          if(env.sfRevisonExists == "true")// activate previous revision only if it has deployments 
          {
          activatePreviousRevision()
          }
        }

        
    
    } catch (Exception exception) {
        error("Build failed..")
    }    
}


def createRollBackArtifacts() {
  stage 'Create rollback artifacts' 
  
  //Get the tags and using the latest tag, pull clone the repo
  tagToProcess = sh (returnStdout: true, script: 'git tag --sort=-v:refname | head -n 1').trim()
  print "Latest release tag to apply in rollback is: " + tagToProcess

  if(tagToProcess.length() < 1) {
      print "No tags found. Nothing to rollback.. Aborting the build."
      currentBuild.result = 'FAILED'
      env.BUILD_STATUS = currentBuild.result
  }

  //sh "pwd && ls -lrt"
  sh "mkdir rollback"
  print "Created rollback directory.."
  //sh "pwd && ls -lrt" 

  checkout scm: [$class: 'GitSCM', extensions: [[$class: 'RelativeTargetDirectory', relativeTargetDir: './rollback']], userRemoteConfigs: [[url: "${scm.getUserRemoteConfigs()[0].getUrl()}", credentialsId: "${scm.getUserRemoteConfigs()[0].getCredentialsId()}"]], branches: [[name: tagToProcess]]],poll: false
  print "*********** Artifacts to be rolled back **************"
  sh "pwd && ls -lrt ./rollback && git describe --tags"
}


def sfCheckout () {
    stage 'Checkout sf code'
    print "cleaning up workspace"
    //context="apigee" --> Not sure why this is used.. Keep it until all the steps are done and validated
    cleanWs()
    checkout scm
}

def sfGetCurrentRevision(isWorkingRevision) {
    stage 'Get current cevison of sf'
    try {
        print "Inside stage sfGetCurrentRevision"
        //print env.authorization
        def delimiter = '/'
        def uri = '/v1/organizations/'
        def resource = 'deployments'
        def context = 'apis'
        def mgmtAPIUrl = params.HOST_URL + uri + params.ORG + delimiter + 'environments' + delimiter + params.ENV + delimiter + context + delimiter + params.SHAREDFLOW + delimiter + resource;

        print "Management API URL: " + mgmtAPIUrl

        List<String> artifacts = new ArrayList<String>()
        def sfDeployments = new URL(mgmtAPIUrl).openConnection();
        sfDeployments.requestMethod = 'GET'
        sfDeployments.addRequestProperty("Accept", "application/json")
        sfDeployments.addRequestProperty("Authorization", "${env.authorization}")
        
        def httpStatusCode = sfDeployments.getResponseCode()
        print "Response code from Mgmt API call: " + httpStatusCode

        if(httpStatusCode.equals(200)) {
          def httpResponseBody = sfDeployments.getInputStream().getText()
          print "httpResponseBody: " + httpResponseBody

          def httpResponseBodyJson = new JsonSlurper().parseText(httpResponseBody)
          
          // Get the max of all revisions from revision array
          def revisions = []
          httpResponseBodyJson.revision.each { revisionItem ->
              revisions.add(revisionItem.name.toInteger())
          }
          //print "Size of revisions array is: " + revisions.size()
          //print "Max in the revisions array is: " + revisions.max()

          def currentsfRevison
          if(revisions.size() > 0) {
              currentsfRevison = revisions.max()
          } else {
              // This scenario might exist when there is nothing deployed on Apigee a.k.a brand new sf
              currentsfRevison = 0
          }
          
          currentBuild.result = 'SUCCESS'
          env.BUILD_STATUS = currentBuild.result          

          if(isWorkingRevision) {
            sfRevisonThatWorks = currentsfRevison
            print "sfRevisonThatWorks: " + sfRevisonThatWorks
          } else {
            sfRevisonThatDoesNotWork = currentsfRevison
            print "sfRevisonThatDoesNotWork: " + sfRevisonThatDoesNotWork
          }

        } else if(httpStatusCode.equals(400)) {
            print "There is no deployments for the sf " + params.sf
            sfRevisonThatWorks = 1 // Just a dummy version 
            env.sfRevisonExists = "false" // flag to activate previous revision only if it has deployments 
            //print " env.sfRevisonExists======inside 400=========="+env.sfRevisonExists
        } else if(httpStatusCode.equals(404)) {
            print "There is no sf named" + params.sf
            sfRevisonThatWorks = 1 // Just a dummy version 
            env.sfRevisonExists = "false" // flag to activate previous revision only if it has deployments 
            env.sfExists= "false" // flag to delete the sf during the rollback
            //print " env.sfRevisonExists======inside 404=========="+env.sfRevisonExists
        }else {
            print "Management API Error response: " + sfDeployments.getInputStream().getText()
            throw new Exception("Apigee Management API Call failed")
        }
    } catch (Exception exception) {
        echo getStackTrace(exception)
        print "There was a problem fetching the deployments for sf " + params.SHAREDFLOW
        throw new Exception("Build failed")
    }
}

def sfUnDeployRevision() {
    stage "Undeploy previous revision"
    print 'Undeploying current sf revision ' + sfRevisonThatDoesNotWork +' for '+ env.SHAREDFLOW + ' in Target Environment ' + params.ENV
    try {
        def mgmtAPIUrl = params.HOST_URL + '/v1/organizations/' + params.ORG + '/environments/' + params.ENV + '/apis/' + env.SHAREDFLOW + '/revisions/' + sfRevisonThatDoesNotWork + '/deployments'
        print "Management API URL: " + mgmtAPIUrl

        List<String> artifacts = new ArrayList<String>()
        def undeployRevision = new URL(mgmtAPIUrl).openConnection();
        undeployRevision.requestMethod = 'DELETE'
        undeployRevision.addRequestProperty("Accept", "application/json")
        undeployRevision.addRequestProperty("Authorization", "${env.authorization}")
        
        def httpStatusCode = undeployRevision.getResponseCode()
        print "Response code from Mgmt API call: " + httpStatusCode
        if(httpStatusCode.equals(200)) {
            def httpResponseBody = undeployRevision.getInputStream().getText()
            print "httpResponseBody: " + httpResponseBody
        } else {
            print "Management API Error response: " + undeployRevision.getInputStream().getText()
            throw new Exception("Apigee Management API Call failed")
        }

        currentBuild.result = 'SUCCESS'
        env.BUILD_STATUS = currentBuild.result
    } catch (Exception exception) {
        echo getStackTrace(exception)
        print "There was a problem undeploying the current revision of the sf: " + params.SHAREDFLOW
        throw new Exception("Build failed")
    }
}

def activatePreviousRevision() {
    stage 'Activating previous revision'
    print 'Activating sf revision ' + sfRevisonThatWorks +' for '+ env.SHAREDFLOW + ' in Target Environment ' + params.ENV
    try {

        def mgmtAPIUrl = params.HOST_URL + '/v1/organizations/' + params.ORG + '/environments/' + params.ENV + '/apis/' + params.SHAREDFLOW + '/revisions/' + sfRevisonThatWorks + '/deployments?override=true'

        List<String> artifacts = new ArrayList<String>()
        def reactivateRevision = new URL(mgmtAPIUrl).openConnection();
        reactivateRevision.requestMethod = 'POST'
        reactivateRevision.addRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        reactivateRevision.addRequestProperty("Authorization", "${env.authorization}")
        
        def httpStatusCode = reactivateRevision.getResponseCode()
        print "Response code from Mgmt API call: " + httpStatusCode

        if(httpStatusCode.equals(200)) {
            def httpResponseBody = reactivateRevision.getInputStream().getText()
            print "httpResponseBody: " + httpResponseBody
        } else {
            print "Management API Error response: " + reactivateRevision.getInputStream().getText()
            throw new Exception("Apigee Management API Call failed")
        }

        currentBuild.result = 'SUCCESS'
        env.BUILD_STATUS = currentBuild.result

    } catch (Exception exception) {
        echo getStackTrace(exception)
        print "There was a problem activating previous revision of the sf: " + params.SHAREDFLOW
        throw new Exception("Build failed")
    }
}

def sfDeleteFailedRevision() {
    stage 'Deleting failed sf revision'
    print 'Deleting failed sf revision ' + sfRevisonThatDoesNotWork + ' for ' + env.sf + ' in Target Environment ' + params.ENV
    
    try {
        def mgmtAPIUrl = params.HOST_URL + '/v1/organizations/' + params.ORG + '/apis/' + params.SHAREDFLOW + '/revisions/' + sfRevisonThatDoesNotWork
        print "Management API URL: " + mgmtAPIUrl

        //sh "curl -v --max-time 300 -H 'Authorization: ${env.authorization}' -X DELETE $url"

        List<String> artifacts = new ArrayList<String>()
        def deleteRevision = new URL(mgmtAPIUrl).openConnection();
        deleteRevision.requestMethod = 'DELETE'
        deleteRevision.addRequestProperty("Accept", "application/json")
        deleteRevision.addRequestProperty("Authorization", "${env.authorization}")
        
        def httpStatusCode = deleteRevision.getResponseCode()
        print "Response code from Mgmt API call: " + httpStatusCode

        if(httpStatusCode.equals(200)) {
            def httpResponseBody = deleteRevision.getInputStream().getText()
            print "httpResponseBody: " + httpResponseBody
        } else {
            print "Management API Error response: " + deleteRevision.getInputStream().getText()
            throw new Exception("Apigee Management API Call failed")
        }

        currentBuild.result = 'SUCCESS'
        env.BUILD_STATUS = currentBuild.result
        
        } catch (Exception exception) {
            echo getStackTrace(exception)
            print "There was a problem deleting previous revision of the sf: " + params.SHAREDFLOW
            //throw new Exception("Build failed").. No need to throw exception
        }
}
// added to delete the sf during rollback if the sf doesnt exist
def sfFailedDelete() {
    stage 'Deleting failed sf '
    print 'Deleting failed sf  '  + ' for ' + env.sf + ' in Target Environment ' + params.ENV
    
    try {
        def mgmtAPIUrl = params.HOST_URL + '/v1/organizations/' + params.ORG + '/apis/' + params.SHAREDFLOW 
        print "Management API URL: " + mgmtAPIUrl

        //sh "curl -v --max-time 300 -H 'Authorization: ${env.authorization}' -X DELETE $url"

        List<String> artifacts = new ArrayList<String>()
        def deleteRevision = new URL(mgmtAPIUrl).openConnection();
        deleteRevision.requestMethod = 'DELETE'
        deleteRevision.addRequestProperty("Accept", "application/json")
        deleteRevision.addRequestProperty("Authorization", "${env.authorization}")
        
        def httpStatusCode = deleteRevision.getResponseCode()
        print "Response code from Mgmt API call: " + httpStatusCode

        if(httpStatusCode.equals(200)) {
            def httpResponseBody = deleteRevision.getInputStream().getText()
            print "httpResponseBody: " + httpResponseBody
        } else {
            print "Management API Error response: " + deleteRevision.getInputStream().getText()
            throw new Exception("Apigee Management API Call failed")
        }

        currentBuild.result = 'SUCCESS'
        env.BUILD_STATUS = currentBuild.result
        
        } catch (Exception exception) {
            echo getStackTrace(exception)
            print "There was a problem deleting previous revision of the sf: " + params.SHAREDFLOW
            //throw new Exception("Build failed").. No need to throw exception
        }
}
def sfBuild() {
    stage('Build artifacts')
    sh "./scripts/build.sh"

    print "Build output files available on the disk..."
    sh "ls -lrt ./target"
}

def sfDeploy() {
    stage('Deploy sf')

    print "env.apigeeUsername: " + env.apigeeUsername
    print "env.apigeePassword: " + env.apigeePassword

    withEnv([
        "apigee_user=${env.apigeeUsername}",
        "apigee_password=${env.apigeePassword}",
        "apigeeOrg=${params.ORG}",
        "apigeeDeployEnvironment=${params.ENV}",
        "apigeeDeployOptions=${params.apigeeDeployOption}",
        "tokenUrl=${params.tokenUrl}",
        "authType=${params.authType}"
        ]){
                sh "./scripts/deploy.sh"
        }
}

def rollBackConfig() {
    stage('Rollback config')

    withEnv([
        "apigee_user=${env.apigeeUsername}",
        "apigee_password=${env.apigeePassword}",
        "apigeeOrg=${params.ORG}",
        "apigeeDeployEnvironment=${params.ENV}",
        "apigeeDeployOptions=${params.apigeeDeployOption}",
        "tokenUrl=${params.tokenUrl}",
        "authType=${params.authType}",
        "sfExists=${env.sfExists}"
        ]){
                sh "./scripts/rollback-config.sh"
        }
}

def tagArtifacts() {
    stage('Tagging artifacts')
    
    tagToProcess = sh (returnStdout: true, script: 'git tag --sort=-v:refname | head -n 1').trim()
    print "Latest release tag is: " + tagToProcess

    if(tagToProcess.length() < 1) {
      // Add a brand new tag to the head and push it
      print "No tags found. Tagging version 1.0.0"
      tagToProcess = "1.0.0"
    }

    // Apply the tag to the latest commit in head
    latestCommit = sh (returnStdout: true, script: 'git rev-parse HEAD').trim()
    print "Applying tag " + tagToProcess + " on the commit " + latestCommit

    withCredentials([sshUserPrivateKey(credentialsId: 'jenkins-gitlab-service-account-new', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
      withEnv(["GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no -o User=${SSH_USER} -i ${SSH_KEY}"]) {
        //sh ("ssh -i ${SSH_KEY} -v git@gitlab.com")
        sh ("git tag -f ${tagToProcess} ${latestCommit}")
        sh ("GIT_SSH_COMMAND='ssh -i ${SSH_KEY}' git push --verbose --tags --force")
      }
    }
}

def sfSFDependencyCheck() {
    stage 'Check For Shared Flow Dependency'
        withEnv([
            "apigeeDeployEnvironment=${params.ENV}",
            "testkey=testvalue",
            "sfTemplate=${params.sf_template}"
        ]){
                //sh "chmod 777 -R apigeelint-config && ls -lrt"
                /// NOTE: This is for debugging.. Will be removed eventually as I tried to add a try catch block and figure out why external plugins doesn't work on Jenkins
                //sh "cp /var/lib/jenkins/workspace/bundleLinter.js /var/lib/jenkins/workspace/apigee/proxies/apickli-demo-v1-minimal-cicd/node_modules/apigeelint/lib/package/bundleLinter.js"
                
                // This is needed until Google accepts the PR (to enable capturing description)
                //sh "cp ./apigeelint-config/Bundle.js ./node_modules/apigeelint/lib/package/Bundle.js"
                
                sh "./scripts/code-quality.sh"
        }
}

def String getStackTrace(Throwable aThrowable) {
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    PrintStream ps = new PrintStream(baos, true);
    aThrowable.printStackTrace(ps);
    return baos.toString();
}
