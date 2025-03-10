@Library('shared-libraries') _
import groovy.json.JsonSlurper
import groovy.json.JsonSlurperClassic
import org.jenkinsci.plugins.workflow.steps.FlowInterruptedException
JIRA_ID="";
commitMessage="";
def prResponse="";
def prNumber;
def props;
githubAPIUrl="https://api.github.com/repos/marklogic/marklogic-data-hub"
mlFFHost=""
cypressFFBaseUrl=""
fFsetupcomplete=false
fFtestcomplete=false
mlChHost=""
cypressChBaseUrl=""
chsetupcomplete=false
chtestcomplete=false
mlChMacHost=""
cypressChMacBaseUrl=""
chMacsetupcomplete=false
chMactestcomplete=false

def loadProperties() {
    node {
        checkout scm
        properties = new Properties()
        props.load(propertiesFile.newDataInputStream())
        echo "Immediate one ${properties.repo}"
    }
}
def dhflinuxTests(String mlVersion,String type){
    	script{
    		props = readProperties file:'data-hub/pipeline.properties';
    		copyRPM type,mlVersion
    		def dockerhost=setupMLDockerCluster 3
    		sh 'docker exec -u builder -i '+dockerhost+' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;set +e;./gradlew marklogic-data-hub:bootstrapAndTest -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ |& tee console.log;sleep 10s;./gradlew ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew installer-for-dhs:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-client-jar:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew ml-data-hub:testFullCycle -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;"'
    		junit '**/TEST-*.xml'
            def output=readFile 'data-hub/console.log'
                    def result=false;
            if(output.contains("npm ERR!")){
                result=true;
            }
            if(result){
                currentBuild.result='UNSTABLE'
            }
                }

}
def dhfCypressE2ETests(String mlVersion, String type){
    script{
        copyRPM type,mlVersion
        env.mlVersion=mlVersion;
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
        sh(script:'''#!/bin/bash
                    export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
                    export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
                    export M2_HOME=$MAVEN_HOME/bin;
                    export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;
                    cd $WORKSPACE;
                    WAR_NAME=$(basename *central*.war )
                    cd $WORKSPACE/data-hub;
                    rm -rf $GRADLE_USER_HOME/caches;
                    ./gradlew clean;
                    cd marklogic-data-hub-central/ui/e2e;
                    chmod +x setup.sh;
                    ./setup.sh dhs=false mlHost=localhost;
                    nohup java -jar $WORKSPACE/$WAR_NAME >> nohup.out &
                    sleep 10s;
                    mkdir -p output;
                    docker build . -t cypresstest;
                    docker run --name cypresstest --env CYPRESS_BASE_URL=http://$HOSTNAME:8080 --env cypress_mlHost=$HOSTNAME cypresstest |& tee output/console.log;
                    docker cp cypresstest:results output;
                    docker cp cypresstest:cypress/videos output
                    mkdir -p ${mlVersion};
                    mv output ${mlVersion}/;
                 ''')
        junit '**/e2e/**/*.xml'
        def output=readFile "data-hub/marklogic-data-hub-central/ui/e2e/${mlVersion}/output/console.log"
        def result=false;
        if(output.contains("npm ERR!")){
            result=true;
        }
        if(result){
           currentBuild.result='UNSTABLE'
        }
    }
}
def dhfWinTests(String mlVersion, String type){
    script{
        copyMSI type,mlVersion;
        def pkgOutput=bat(returnStdout:true , script: '''
	                    cd xdmp/src
	                    for /f "delims=" %%a in ('dir /s /b *.msi') do set "name=%%~a"
	                    echo %name%
	                    ''').trim().split();
	    def pkgLoc=pkgOutput[pkgOutput.size()-1]
	    gitCheckout 'ml-builds','https://github.com/marklogic/MarkLogic-Builds','master'
	    def bldOutput=bat(returnStdout:true , script: '''
        	           cd ml-builds/scripts/lib/
        	           CD
        	        ''').trim().split();
        def bldPath=bldOutput[bldOutput.size()-1]
        setupMLWinCluster bldPath,pkgLoc
        bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat clean'
        bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub:bootstrapAndTest  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-central:test  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat ml-data-hub:test  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-spark-connector:test  || exit /b 0'
        junit '**/TEST-*.xml'
    }
}
def winParallel(){
script{
                                copyMSI "Release","10.0-9";
                                def pkgOutput=bat(returnStdout:true , script: '''
                        	                    cd xdmp/src
                        	                    for /f "delims=" %%a in ('dir /s /b *.msi') do set "name=%%~a"
                        	                    echo %name%
                        	                    ''').trim().split();
                        	    def pkgLoc=pkgOutput[pkgOutput.size()-1]
                        	    gitCheckout 'ml-builds','https://github.com/marklogic/MarkLogic-Builds','master'
                        	    def bldOutput=bat(returnStdout:true , script: '''
                                	           cd ml-builds/scripts/lib/
                                	           CD
                                	        ''').trim().split();
                                def bldPath=bldOutput[bldOutput.size()-1]
                                setupMLWinCluster bldPath,pkgLoc,"w2k16-10-dhf-2,w2k16-10-dhf-3"
                                bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat clean'
                                bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub:bootstrapAndTest  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-central:test  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat ml-data-hub:test  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-spark-connector:test  || exit /b 0'
                                junit '**/TEST-*.xml'
                            }
}
def getReviewState(){
    def  reviewResponse;
    def commitHash;
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
       reviewResponse = sh (returnStdout: true, script:'''
                            curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/reviews
                           ''')
       commitHash = sh (returnStdout: true, script:'''
                         curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID
                       ''')
    }
    def jsonObj = new JsonSlurperClassic().parseText(commitHash.toString().trim())
    def commit_id=jsonObj.head.sha
    println(commit_id)
    def reviewState=getReviewStateOfPR reviewResponse,2,commit_id ;
    return reviewState
}
def PRDraftCheck(){
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
        PrObj= sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID
                   ''')
    }
    def jsonObj = new JsonSlurperClassic().parseText(PrObj.toString().trim())
    return jsonObj.draft
}

def isPRUITest(){
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
        PrObj= sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID
                   ''')
    }
    def jsonObj = new JsonSlurperClassic().parseText(PrObj.toString().trim())
    for (label in jsonObj.labels){
            if(label.name=="DO_NOT_RUN_UI_TESTS"){
                return true
            }
        }
         return false
}

void runCypressE2e(String cmd){
   copyRPM 'Release','10.0-9'
   setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
   sh 'rm -rf *central*.rpm || true'
   copyArtifacts filter: '**/*.rpm', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
   sh(script:'''#!/bin/bash
        export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
        sudo mladmin stop-hubcentral
        sudo mladmin install-hubcentral $WORKSPACE/*central*.rpm;
        sudo mladmin add-javahome-hubcentral $JAVA_HOME
        sudo mladmin start-hubcentral
   ''')

   sh(script:'''#!/bin/bash
        export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
        export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
        export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
        export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
        rm -rf $M2_LOCAL_REPO || true
        mkdir -p $M2_LOCAL_REPO
        cd $WORKSPACE/data-hub;
        ./gradlew publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/
     '''
  )

  sh(script:'''
        #!/bin/bash
        export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
        export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
        export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
        export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
        cd $WORKSPACE/data-hub;
        rm -rf $GRADLE_USER_HOME/caches;
        cd marklogic-data-hub-central/ui/e2e;
        repo="maven {url '"$M2_LOCAL_REPO"'}"
        sed -i "/repositories {/a$repo" hc-qa-project/build.gradle
        chmod +x setup.sh;
        ./setup.sh dhs=false mlHost=localhost mlSecurityUsername=admin mlSecurityPassword=admin;
       '''
  )

  sh(script:'''#!/bin/bash
        export NODE_HOME=$NODE_HOME_DIR/bin;
        export PATH=$NODE_HOME:$PATH
        cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
        '''+cmd+''' |& tee -a e2e_err.log;
    '''
  )

  junit '**/e2e/**/*.xml'

  def output=readFile 'data-hub/marklogic-data-hub-central/ui/e2e/e2e_err.log'
  if(output.contains("npm ERR!")){
//   println("WARNING: cypress test run has errors in its log. Tests might run succesfully or with some failures.")
     error "${STAGE_NAME} stage run with errors. Tests results can be all success or with some failures."
  }

}

void UnitTest(){
        props = readProperties file:'data-hub/pipeline.properties';
        copyRPM 'Release','10.0-9'
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;./gradlew marklogic-data-hub:bootstrap -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew installer-for-dhs:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-client-jar:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/'
        junit '**/TEST-*.xml'
        jacoco classPattern: 'data-hub/marklogic-data-hub-central/build/classes/java/main/com/marklogic/hub/central,data-hub/marklogic-data-hub-spark-connector/build/classes/java/main/com/marklogic/hub/spark,data-hub/marklogic-data-hub/build/classes/java/main/com/marklogic/hub',exclusionPattern: '**/*Test*.class'
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0]
            jiraAddComment comment: 'Jenkins Unit Test Results For PR Available', failOnError: false, idOrKey: JIRA_ID, site: 'JIRA'
        }
        if(!env.CHANGE_URL){
            env.CHANGE_URL=" "
        }
}

void PreBuildCheck() {

 if(env.CHANGE_ID){

  if(PRDraftCheck()){ sh 'exit 1' }

  if((!env.CHANGE_TITLE.startsWith("DHFPROD-")) && (!env.CHANGE_TITLE.startsWith("DEVO-"))){ sh 'exit 1' }

  if(getReviewState().equalsIgnoreCase("CHANGES_REQUESTED")){
       println(reviewState)
       sh 'exit 1'
  }

  if(!isChangeInUI() && isPRUITest()){env.NO_UI_TESTS=true}

 }
 def obj=new abortPrevBuilds();
 obj.abortPrevBuilds();

}

void Tests(){
        cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]

        props = readProperties file:'data-hub/pipeline.properties';
        copyRPM 'Release','10.0-9'
        def mlHubHosts=setupMLDockerNodes 3
        sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;./gradlew marklogic-data-hub:testAcceptance -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ -PmlHost='+mlHubHosts
        junit '**/TEST-*.xml'
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0]
            jiraAddComment comment: 'Jenkins Core Unit Test Results For PR Available', failOnError: false, idOrKey: JIRA_ID, site: 'JIRA'
        }
        if(!env.CHANGE_URL){
            env.CHANGE_URL=" "
        }
}

void RTLTests(String type,String mlVersion){

    cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]

    props = readProperties file:'data-hub/pipeline.properties';
    copyRPM type,mlVersion
    setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'

    sh '''

      export PATH=$JAVA_HOME/bin:$PATH
      cd $WORKSPACE/data-hub
      ./gradlew -g ./cache-build --continue clean marklogic-data-hub:bootstrap :marklogic-data-hub-central:testUI |& tee console.log

    '''

    junit '**/TEST-*.xml'
    cobertura coberturaReportFile: '**/cobertura-coverage.xml'

    def output=readFile 'data-hub/console.log'
    if(output.contains("npm ERR!")){
      error "${STAGE_NAME} tests failed but failures possibly was not reported with junit report. Please look at console to find failures"
    }

    if(env.CHANGE_TITLE){
        JIRA_ID=env.CHANGE_TITLE.split(':')[0]
        jiraAddComment comment: 'Jenkins Core Unit Test Results For PR Available', failOnError: false, idOrKey: JIRA_ID, site: 'JIRA'
    }
    if(!env.CHANGE_URL){
        env.CHANGE_URL=" "
    }
}

void BuildDatahub(){
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0];
            def transitionInput =[transition: [id: '41']]
            //jiraTransitionIssue idOrKey: JIRA_ID, input: transitionInput, site: 'JIRA'
        }
    }
    println(BRANCH_NAME)
    sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;./gradlew build -x test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --parallel;'
    archiveArtifacts artifacts: 'data-hub/marklogic-data-hub/build/libs/* , data-hub/ml-data-hub-plugin/build/libs/* , data-hub/marklogic-data-hub-central/build/libs/* , data-hub/marklogic-data-hub-central/build/**/*.rpm , data-hub/marklogic-data-hub-spark-connector/build/libs/* , data-hub/installer-for-dhs/build/libs/marklogic* , data-hub/marklogic-data-hub-client-jar/build/libs/*client.jar ', onlyIfSuccessful: true

}

void dh5Example() {
    sh 'cd $WORKSPACE/data-hub/examples/dh-5-example;repo="maven {";url="url \'https://nexus.marklogic.com/repository/maven-snapshots/\'";protocal="allowInsecureProtocol = true}";cred="credentials {";uname="username mavenUser";pass="password mavenPassword }";sed -i "/repositories {/a$protocal" build.gradle;sed -i "/repositories {/a$url" build.gradle;sed -i "/repositories {/a$pass" build.gradle;sed -i "/repositories {/a$uname" build.gradle;sed -i "/repositories {/a$cred" build.gradle;sed -i "/repositories {/a$repo" build.gradle;mkdir -p $WORKSPACE$GRADLE_DIR;cp ~/.gradle/gradle.properties $WORKSPACE$GRADLE_DIR;'
    copyRPM 'Release','10.0-9'
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        def dockerhost=setupMLDockerCluster 3
        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$WORKSPACE$GRADLE_DIR:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/dh-5-example; \
                            rm -rf $WORKSPACE$GRADLE_DIR/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=ingestion_only-flow -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=ingestion_mapping-flow -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=ingestion_mapping_mastering-flow -Ptesting=true;
                            "
                        '''
    }
}

void dhCustomHook() {
                     sh 'cd $WORKSPACE/data-hub/examples/dhf5-custom-hook;repo="maven {";url="url \'https://nexus.marklogic.com/repository/maven-snapshots/\'";protocal="allowInsecureProtocol = true}";cred="credentials {";uname="username mavenUser";pass="password mavenPassword }";sed -i "/repositories {/a$protocal" build.gradle;sed -i "/repositories {/a$url" build.gradle;sed -i "/repositories {/a$pass" build.gradle;sed -i "/repositories {/a$uname" build.gradle;sed -i "/repositories {/a$cred" build.gradle;sed -i "/repositories {/a$repo" build.gradle;mkdir -p $WORKSPACE$GRADLE_DIR;cp ~/.gradle/gradle.properties $WORKSPACE$GRADLE_DIR;'
                     copyRPM 'Release','10.0-9'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$WORKSPACE$GRADLE_DIR:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/dhf5-custom-hook; \
                            rm -rf $WORKSPACE$GRADLE_DIR/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=LoadOrders -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=LoadOrders -Ptesting=true;
                            "
                        '''
                      }
}

void mappingExample() {
                     sh 'cd $WORKSPACE/data-hub/examples/mapping-example;repo="maven {";url="url \'https://nexus.marklogic.com/repository/maven-snapshots/\'";protocal="allowInsecureProtocol = true}";cred="credentials {";uname="username mavenUser";pass="password mavenPassword }";sed -i "/repositories {/a$protocal" build.gradle;sed -i "/repositories {/a$url" build.gradle;sed -i "/repositories {/a$pass" build.gradle;sed -i "/repositories {/a$uname" build.gradle;sed -i "/repositories {/a$cred" build.gradle;sed -i "/repositories {/a$repo" build.gradle;mkdir -p $WORKSPACE$GRADLE_DIR;cp ~/.gradle/gradle.properties $WORKSPACE$GRADLE_DIR;'
                     copyRPM 'Release','10.0-9'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$WORKSPACE$GRADLE_DIR:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/mapping-example; \
                            rm -rf $WORKSPACE$GRADLE_DIR/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=jsonToJson -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=jsonToXml -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=xmlToJson -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=xmlToXml -Ptesting=true;
                            "
                        '''
                        }
}

void smartMastering() {
                     sh 'cd $WORKSPACE/data-hub/examples/smart-mastering-complete;repo="maven {";url="url \'https://nexus.marklogic.com/repository/maven-snapshots/\'";protocal="allowInsecureProtocol = true}";cred="credentials {";uname="username mavenUser";pass="password mavenPassword }";sed -i "/repositories {/a$protocal" build.gradle;sed -i "/repositories {/a$url" build.gradle;sed -i "/repositories {/a$pass" build.gradle;sed -i "/repositories {/a$uname" build.gradle;sed -i "/repositories {/a$cred" build.gradle;sed -i "/repositories {/a$repo" build.gradle;mkdir -p $WORKSPACE$GRADLE_DIR;cp ~/.gradle/gradle.properties $WORKSPACE$GRADLE_DIR;'
                     copyRPM 'Release','10.0-9'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$WORKSPACE$GRADLE_DIR:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/smart-mastering-complete; \
                            rm -rf $WORKSPACE$GRADLE_DIR/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=persons -Ptesting=true;
                            "
                        '''
                        }
}

void codeReview(){
        def count=0;
        retry(4){
            count++;
            props = readProperties file:'data-hub/pipeline.properties';
            def reviewState=getReviewState()
            if(env.CHANGE_TITLE.split(':')[1].contains("Automated PR")){
                println("Automated PR")
                sh 'exit 0'
            }
            else if(reviewState.equalsIgnoreCase("APPROVED")){
                sh 'exit 0'
            }
            else if(reviewState.equalsIgnoreCase("CHANGES_REQUESTED")){
                println("Changes Requested")
                def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                email=getEmailFromGITUser author;

                if(count==4){
                    sendMail email,'<h3>Changes Requested for <a href=${CHANGE_URL}>PR</a>. Please resolve those Changes</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Changes Requested for $BRANCH_NAME '
                }
                currentBuild.result = 'ABORTED'
            }
            else{
                withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
                    def  reviewersList = sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/requested_reviewers
                   ''')
                    def  reviewesList = sh (returnStdout: true, script:'''
                                      curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/reviews
                                      ''')
                    def slurper = new JsonSlurperClassic().parseText(reviewersList.toString().trim())
                    def emailList="";
                    if(slurper.users.isEmpty() && reviewesList.isEmpty()){
                        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                        email=getEmailFromGITUser author;
                        if(count==4){
                            sendMail email,'<h3>Please assign some code reviewers <a href=${CHANGE_URL}>PR</a>. and restart this stage to continue.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'No Code reviewers assigned for $BRANCH_NAME '
                        }
                        sh 'exit 123'
                    }else{
                        for(def user:slurper.users){
                            email=getEmailFromGITUser user.login;
                            emailList+=email+',';
                        }
                        sendMail emailList,'<h3>Code Review Pending on <a href=${CHANGE_URL}>PR</a>.</h3><h3>Please click on proceed button from the pipeline view below if all the reviewers approved the code </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Code Review Pending on $BRANCH_NAME '
                        try{
                            timeout(time: 15, unit: 'MINUTES') {
                                input message:'Code-Review Done?'
                            }
                        }catch(FlowInterruptedException err){
                            user = err.getCauses()[0].getUser().toString();
                            println(user)
                            if(user.equalsIgnoreCase("SYSTEM")){
                                echo "Timeout 15mins"
                                sh 'exit 123'
                            }else{
                                currentBuild.result = 'ABORTED'
                            }
                        }
                        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                        email=getEmailFromGITUser author;
                        if(count==4){
                            sendMail email,'<h3>Code Review is incomplete on <a href=${CHANGE_URL}>PR</a>.</h3><h3>Please Restart this stage from the pipeline view once code review is completed. </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Code Review is incomplete on $BRANCH_NAME  '
                        }
                    }
                }
            }
        }
}

void cypressE2EOnPremLinuxTests(String type,String mlVersion){
    copyRPM type,mlVersion
    setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'

    copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
    sh '''
       sudo mladmin stop-hubcentral
       cd $WORKSPACE
       WAR_NAME=$(basename *central*.war )
       nohup java -jar $WORKSPACE/$WAR_NAME &
    '''
    //wait for prem to start
    timeout(10) {waitUntil initialRecurrencePeriod: 15000, { sh(script: 'ps aux | grep ".central.*\\.war" | grep -v grep | grep -v timeout', returnStatus: true) == 0 }}

    sh '''

      export NODE_HOME=$NODE_HOME_DIR/bin;
      export PATH=$NODE_HOME:$JAVA_HOME/bin:$PATH
      cd $WORKSPACE/data-hub
      ./gradlew -g ./cache-build clean publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO
      cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
      sed -i "s#gradlew #gradlew -Dmaven.repo.local=$M2_LOCAL_REPO -g ./cache-build #g" setup.sh
      ./setup.sh dhs=false mlHost=$HOSTNAME mlSecurityUsername=admin mlSecurityPassword=admin
      npm run cy:run 2>&1 |& tee -a e2e_err.log

    '''

    junit '**/e2e/**/*.xml'
}

void cypressE2EOnPremMacTests(String type,String mlVersion){

    copyDMG type,mlVersion
    setUpMLMac '$WORKSPACE/xdmp/src/Mark*.dmg'

    copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
    sh '''
       cd $WORKSPACE
       WAR_NAME=$(basename *central*.war )
       nohup java -jar $WORKSPACE/$WAR_NAME &
    '''
    //wait for prem to start
    timeout(10) {waitUntil initialRecurrencePeriod: 15000, { sh(script: 'ps aux | grep ".central.*\\.war" | grep -v grep | grep -v timeout', returnStatus: true) == 0 }}

    sh '''

      export PATH=/usr/local/bin/:$JAVA_HOME/bin:$PATH
      cd $WORKSPACE/data-hub
      ./gradlew -g ./cache-build clean publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO
      cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
      sed -i '.bak' "s#gradlew #gradlew -Dmaven.repo.local=$M2_LOCAL_REPO -g ./cache-build #g" setup.sh
      ./setup.sh dhs=false mlHost=$HOSTNAME mlSecurityUsername=admin mlSecurityPassword=admin
      npm run cy:run-chrome 2>&1 | tee -a e2e_err.log

   '''

    junit '**/e2e/**/*.xml'
}

void cypressE2EOnPremWinTests(String type,String mlVersion){

    copyMSI type,mlVersion;
    def pkgOutput=bat(returnStdout:true , script: '''
	                    cd xdmp/src
	                    for /f "delims=" %%a in ('dir /s /b *.msi') do set "name=%%~a"
	                    echo %name%
	                    ''').trim().split();
    def pkgLoc=pkgOutput[pkgOutput.size()-1]
    gitCheckout 'ml-builds','https://github.com/marklogic/MarkLogic-Builds','master'
    def bldOutput=bat(returnStdout:true , script: '''
        	           cd ml-builds/scripts/lib/
        	           CD
        	        ''').trim().split();
    def bldPath=bldOutput[bldOutput.size()-1]
    setupMLWinCluster bldPath,pkgLoc
    copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')

    bat '''
	    for /f "delims=" %%a in ('dir /s /b *.war') do set "name=%%~a"
	    start java -jar %name%
	'''

    //wait for prem to start
    timeout(10) {waitUntil initialRecurrencePeriod: 15000, { bat(script: 'jps | grep war', returnStatus: true) == 0 }}

    bat "set PATH=C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd $WORKSPACE/data-hub & gradlew.bat -g ./cache-build clean publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO"
    bat "set PATH=C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e &sed -i 's#gradlew #gradlew -Dmaven.repo.local=$M2_LOCAL_REPO -g ./cache-build #g' setup.sh &sh setup.sh dhs=false mlHost=%COMPUTERNAME% mlSecurityUsername=admin mlSecurityPassword=admin"
    bat "set PATH=C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH & cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e & npm run cy:run 2>&1 | tee -a e2e_err.log"

    junit '**/e2e/**/*.xml'

}

void cypressE2EOnPremWinChromeTests(){
     sleep time: 12, unit: 'MINUTES'
    waitUntil(initialRecurrencePeriod: 120000) {
         return chsetupcomplete
     }
     env.cypressChBaseUrl=cypressChBaseUrl.trim()
     env.mlChHost=mlChHost.trim()
     bat  script: """
                                 setlocal
                                 set ERRORLEVEL=0
                                 set PATH=C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH
                                 set CYPRESS_BASE_URL=${cypressChBaseUrl}
                                 set mlHost=${mlChHost}
                                 cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
                                 npm run cy:run-chrome-headed -- --config baseUrl=${cypressChBaseUrl} --env mlHost=${mlChHost}   >> e2e_err.log
     """
     findText(textFinders: [textFinder('npm error')])
     junit '**/e2e/**/*.xml'
}

void mergePR(){
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
        script{
            props = readProperties file:'data-hub/pipeline.properties';
            JIRA_ID=env.CHANGE_TITLE.split(':')[0]
            def response = sh (returnStdout: true, script:'''curl -u $Credentials  --header "application/vnd.github.merge-info-preview+json" "'''+githubAPIUrl+'''/pulls/$CHANGE_ID" | grep '"mergeable_state":' | cut -d ':' -f2 | cut -d ',' -f1 | tr -d '"' ''')
            response=response.trim();
            println(response)
            if(response.equals("clean")){
                println("merging can be done")
                sh "curl -o - -s -w \"\n%{http_code}\n\" -X PUT -d '{\"commit_title\": \"$JIRA_ID: merging PR\", \"merge_method\": \"rebase\"}' -u $Credentials "+ githubAPIUrl+"/pulls/$CHANGE_ID/merge | tail -2 > mergeResult.txt"
                def mergeResult = readFile('mergeResult.txt').trim()
                if(mergeResult=="200"){
                    println("Merge successful")
                }else{
                    println("Merge Failed")
                    sh 'exit 123'
                }
            }else if(response.equals("blocked")){
                println("retry blocked");
                withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
                    def  reviewersList = sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/requested_reviewers
                   ''')
                    def slurper = new JsonSlurperClassic().parseText(reviewersList.toString().trim())
                    def emailList="";
                    for(def user:slurper.users){
                        email=getEmailFromGITUser user.login;
                        emailList+=email+',';
                    }
                    sendMail emailList,'Check the Pipeline View Here: ${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID  \n\n\n Check Console Output Here: ${BUILD_URL}/console \n\n\n $BRANCH_NAME is waiting for the code-review to complete. Please click on proceed button if all the reviewers approved the code here. \n\n ${BUILD_URL}input ',false,'Waiting for code review $BRANCH_NAME '

                }
                sleep time: 30, unit: 'MINUTES'
                throw new Exception("Waiting for all the status checks to pass");
            }else if(response.equals("unstable")){
                println("retry unstable")
                sh "curl -o - -s -w \"\n%{http_code}\n\" -X PUT -d '{\"commit_title\": \"$JIRA_ID: merging PR\", \"merge_method\": \"rebase\"}' -u $Credentials  "+githubAPIUrl+"/pulls/$CHANGE_ID/merge | tail -2 > mergeResult.txt"
                def mergeResult = readFile('mergeResult.txt').trim()
                if(mergeResult=="200"){
                    println("Merge successful")
                }else{
                    println("Merge Failed")
                    sh 'exit 123'
                }
                println("Result is"+ mergeResult)
            }else{
                println("merging not possible")
                currentBuild.result = "FAILURE"
                sh 'exit 1';
            }
        }
    }
}

def isChangeInUI(){

    def  num_of_ui_changes;

    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
      num_of_ui_changes = sh(returnStdout: true, script: '''
           curl -u $Credentials  -X GET  https://patch-diff.githubusercontent.com/raw/marklogic/marklogic-data-hub/pull/$CHANGE_ID.diff | grep -c '^diff.*/ui' || true
       ''')
    }

    num_of_ui_changes as Integer != 0
}

def isPRMergable(){
    return !params.regressions && env.TESTS_PASSED?.toBoolean() && env.UNIT_TESTS_PASSED?.toBoolean() &&
        (
            env.NO_UI_TESTS || (env.UI_TESTS_PASSED?.toBoolean() && env.CYPRESSE2E_TESTS_PASSED?.toBoolean())
        )
}

void singleNodeTestOnLinux(String type,String mlVersion){
        cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]
        props = readProperties file:'data-hub/pipeline.properties';
        copyRPM type,mlVersion
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        sh 'export JAVA_HOME="$JAVA_HOME_DIR";export M2_HOME="$MAVEN_HOME";export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH";cd $WORKSPACE/data-hub;./gradlew -g ./cache-build clean;set +e;./gradlew -g ./cache-build marklogic-data-hub:bootstrapAndTest -Dorg.gradle.jvmargs=-Xmx1g -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew -g ./cache-build ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew -g ./cache-build web:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew -g ./cache-build marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ |& tee console.log;sleep 10s;./gradlew -g ./cache-build marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew -g ./cache-build marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;'
        junit '**/TEST-*.xml'
        def output=readFile 'data-hub/console.log'
        def result=false;
        if(output.contains("npm ERR!")){
            result=true;
        }
        if(result){
            currentBuild.result='UNSTABLE'
        }
}

void fullCycleSingleNodeTestOnLinux(String type,String mlVersion){
    cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]
    props = readProperties file:'data-hub/pipeline.properties';
    copyRPM type,mlVersion
    setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
    sh 'export JAVA_HOME="$JAVA_HOME_DIR";export M2_HOME="$MAVEN_HOME";export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH";cd $WORKSPACE/data-hub;./gradlew -g ./cache-build clean ml-data-hub:testFullCycle -i --stacktrace'
    junit '**/TEST-*.xml'
}

void invokeDhsTestJob(){
    cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]
}

void invokeDhcceTestJob(){
    cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]
    build job: 'DHCCE/dhcce-test', parameters: [string(name: 'DHF_BRANCH', value: env.BRANCH_NAME)], propagate: true, wait: true
}

void postStage(String status){
    println("${STAGE_NAME} " + status)
    def email;
    if (env.CHANGE_AUTHOR) {
       def author = env.CHANGE_AUTHOR.toString().trim().toLowerCase()
       email = getEmailFromGITUser author
     } else {email = Email}

    if(env.CHANGE_URL){
      sendMail email, "<h3>All the ${STAGE_NAME} " + status + " on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>", false, "${STAGE_NAME} for  $BRANCH_NAME " + status
    }
    else {
     sendMail email, "<h3>All the ${STAGE_NAME} " + status + " the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>", false, "${STAGE_NAME} for  $BRANCH_NAME " + status
    }
}

void postTestsSuccess(){
println("Core Unit Tests Completed")
                    script{
                    def email;
                    if(env.CHANGE_AUTHOR){
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                     email=getEmailFromGITUser author
                    }else{
                    	email=Email
                    }
                    sendMail email,'<h3>All the Core Unit Tests Passed on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for  $BRANCH_NAME Passed'
                    }
}

void postTestsUnstable(){
println("Unit Tests Failed")
                      sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
                      archiveArtifacts artifacts: 'MLLogs/**/*'
                      script{
                      def email;
                    if(env.CHANGE_AUTHOR){
                    	def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    	 email=getEmailFromGITUser author
                    }else{
                    email=Email
                    }
                      sendMail email,'<h3>Some of the  Core Unit Tests Failed on   <a href=${CHANGE_URL}>$BRANCH_NAME</a>. Please look into the issues and fix it.</h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for $BRANCH_NAME Failed'
                      }
}

def cypressSetup(String type, String mlVersion){
        sh 'rm -rf $WORKSPACE/xdmp/src/*'
        copyRPM type,mlVersion
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: 'Datahub_CI/develop', selector: specific('${BUILD_NUMBER}')
        sh '''
           cd $WORKSPACE
           WAR_NAME=$(basename *central*.war )
           nohup java -jar $WORKSPACE/$WAR_NAME &
        '''
        //wait for prem to start
        timeout(10) {waitUntil initialRecurrencePeriod: 15000, { sh(script: 'ps aux | grep ".central.*\\.war" | grep -v grep | grep -v timeout', returnStatus: true) == 0 }}


        sh(script:'''#!/bin/bash
            export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
            export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
            export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
            rm -rf $M2_LOCAL_REPO || true
            mkdir -p $M2_LOCAL_REPO
            cd $WORKSPACE/data-hub;
            ./gradlew publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/
         '''
      )

        sh(script:'''
            #!/bin/bash
            export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
            export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
            export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
            cd $WORKSPACE/data-hub;
            rm -rf $GRADLE_USER_HOME/caches;
            cd marklogic-data-hub-central/ui/e2e;
            repo="maven {url '"$M2_LOCAL_REPO"'}"
            sed -i "/repositories {/a$repo" hc-qa-project/build.gradle
            chmod +x setup.sh;
            ./setup.sh dhs=false mlHost=localhost mlSecurityUsername=admin mlSecurityPassword=admin;
           '''
      )
}
def runFFTests(){
     sleep time: 12, unit: 'MINUTES'
    waitUntil(initialRecurrencePeriod: 120000) {
         return fFsetupcomplete
     }
     env.cypressFFBaseUrl=cypressFFBaseUrl.trim()
     env.mlFFHost=mlFFHost.trim()
     bat  script: """
                                 setlocal
                                 set ERRORLEVEL=0
                                 set PATH=C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot\\bin;$PATH
                                 set CYPRESS_BASE_URL=${cypressFFBaseUrl}
                                 set mlHost=${mlFFHost}
                                 cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
                                 npm run cy:run-firefox-headed -- --config baseUrl=${cypressFFBaseUrl} --env mlHost=${mlFFHost}  >> e2e_err.log
     """
     findText(textFinders: [textFinder('npm error')])
     junit '**/e2e/**/*.xml'
}
def cypressE2EOnPremMacChromeTests(){
    sleep time: 12, unit: 'MINUTES'
        waitUntil(initialRecurrencePeriod: 120000) {
             return chMacsetupcomplete
         }
    env.cypressChMacBaseUrl=cypressChMacBaseUrl.trim()
    env.mlChMacHost=mlChMacHost.trim()
    sh(script:'''
        export PATH=/usr/local/bin:$PATH
        cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
        npm run cy:run-chrome-headed -- --config baseUrl=${cypressChMacBaseUrl} --env mlHost=${mlChMacHost}   >> e2e_err.log
    ''')
    findText(textFinders: [textFinder('npm error')])
    junit '**/e2e/**/*.xml'
}
def cypressE2ePostFailed(){
    sh 'rm -rf ${STAGE_NAME} || true;mkdir -p ${STAGE_NAME}/MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/ || true; mkdir -p ${STAGE_NAME}/E2ELogs; cp -r $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e/cypress/videos ${STAGE_NAME}/E2ELogs/;cp -r $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e/cypress/screenshots ${STAGE_NAME}/E2ELogs/'
    archiveArtifacts artifacts: "**/E2ELogs/**/videos/**/*,**/E2ELogs/**/screenshots/**/*,${STAGE_NAME}/MLLogs/**/*"
    println("$STAGE_NAME Failed")
    sendMail Email,"<h3>$STAGE_NAME Server on Linux Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>",false,"$BRANCH_NAME branch $STAGE_NAME Failed"

}
pipeline{
	agent none;
	options {
  	checkoutToSubdirectory 'data-hub'
  	buildDiscarder logRotator(artifactDaysToKeepStr: '7', artifactNumToKeepStr: '', daysToKeepStr: '30', numToKeepStr: '')
	}
	environment{
	JAVA_HOME_DIR="/home/builder/java/openjdk-1.8.0-262"
	GRADLE_DIR="/.gradle"
	MAVEN_HOME="/usr/local/maven"
	M2_HOME_REPO="/repository"
	NODE_HOME_DIR="/home/builder/nodeJs/node-v12.18.3-linux-x64"
	DMC_USER     = credentials('MLBUILD_USER')
    DMC_PASSWORD= credentials('MLBUILD_PASSWORD')
	}
	parameters{
	string(name: 'Email', defaultValue: 'rdew@marklogic.com,mwooldri@marklogic.com,rvudutal@marklogic.com,Sanjeevani.Vishaka@marklogic.com,btang@marklogic.com' ,description: 'Who should I say send the email to?')
    booleanParam(name: 'regressions', defaultValue: false, description: 'indicator if build is for regressions')
	}
	stages{
	    stage('Pre-Build-Check'){
	    agent { label 'dhfLinuxAgent'}
	    steps{ PreBuildCheck() }
	    post{failure{postStage('Stage Failed')}}
	    }

		stage('Build-datahub'){
		agent { label 'dhfLinuxAgent'}
			steps{BuildDatahub()}
			post{failure {postStage('Stage Failed')}}
		}

		stage('tests'){
		parallel{
		 stage('Core-Unit-Tests'){
		 agent { label 'dhfLinuxAgent'}
			steps{Tests()}
			post{
                  success {
                  script{env.TESTS_PASSED=true}
                    postTestsSuccess()
                   }
                   unstable {
                        postTestsUnstable()
                  }
            }
		}
        stage('Unit-Tests'){
		agent { label 'dhfLinuxAgent'}
			steps{UnitTest()}
			post{
				  always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                  script{ env.UNIT_TESTS_PASSED=true }
                    postTestsSuccess()
                   }
                   unstable {
                      postTestsUnstable()
                  }
             }
		}
		stage('cypresse2e'){
        when {
            expression {return !env.NO_UI_TESTS}
            beforeAgent true
        }
		agent { label 'dhfLinuxAgent'}
        steps{timeout(time: 3,  unit: 'HOURS'){
          catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE') {runCypressE2e('npm run cy:run')}
        }}
        post{
		   always{sh 'rm -rf $WORKSPACE/xdmp' }
           success {
              script{env.CYPRESSE2E_TESTS_PASSED=true}
              postStage('Tests Passed')
           }
           unstable {
              sh 'rm -rf ${STAGE_NAME}|| true;mkdir -p ${STAGE_NAME}/MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/ || true; mkdir -p ${STAGE_NAME}/E2ELogs; cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/videos ${STAGE_NAME}/E2ELogs/;cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/screenshots ${STAGE_NAME}/E2ELogs/'
              archiveArtifacts artifacts: "**/E2ELogs/**/videos/**/*,**/E2ELogs/**/screenshots/**/*,${STAGE_NAME}/MLLogs/**/*"
              postStage('Tests Failed')
           }
           failure{
              sh 'rm -rf ${STAGE_NAME} || true;mkdir -p ${STAGE_NAME}/MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/ || true; mkdir -p ${STAGE_NAME}/E2ELogs; cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/videos ${STAGE_NAME}/E2ELogs/;cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/screenshots ${STAGE_NAME}/E2ELogs/'
              archiveArtifacts artifacts: "**/E2ELogs/**/videos/**/*,**/E2ELogs/**/screenshots/**/*,${STAGE_NAME}/MLLogs/**/*"
              postStage('Stage Failed')
          }}
		}
       /* stage('cypresse2e-firefox') {
            when {
                expression { return params.regressions }
                beforeAgent true
            }
            //agent { label 'dhfLinuxAgent' }
            agent { label 'rh7v-10-dhf-5.marklogic.com' }
            steps{timeout(time: 3,  unit: 'HOURS'){
                catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE') {runCypressE2e('npm run cy:run-firefox-headed')}
            }}
            post { always { sh 'rm -rf $WORKSPACE/xdmp' }
              success {postStage('Tests Passed')}
              unstable {
              sh 'rm -rf ${STAGE_NAME} || true;mkdir -p ${STAGE_NAME}/MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/ || true; mkdir -p ${STAGE_NAME}/E2ELogs; cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/videos ${STAGE_NAME}/E2ELogs/;cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/screenshots ${STAGE_NAME}/E2ELogs/'
             */
             // archiveArtifacts artifacts: "**/E2ELogs/**/videos/**/*,**/E2ELogs/**/screenshots/**/*,${STAGE_NAME}/MLLogs/**/*"
                     /*          postStage('Tests Failed')
              }
              failure{
              sh 'rm -rf ${STAGE_NAME} || true;mkdir -p ${STAGE_NAME}/MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/ || true; mkdir -p ${STAGE_NAME}/E2ELogs; cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/videos ${STAGE_NAME}/E2ELogs/;cp -r data-hub/marklogic-data-hub-central/ui/e2e/cypress/screenshots ${STAGE_NAME}/E2ELogs/'
             */
            //  archiveArtifacts artifacts: "**/E2ELogs/**/videos/**/*,**/E2ELogs/**/screenshots/**/*,${STAGE_NAME}/MLLogs/**/*"
                 /*              postStage('Stage Failed')
              }}
        }*/
        stage('UI-tests'){
        when {
           expression {return !env.NO_UI_TESTS}
           beforeAgent true
        }
        environment{
            JAVA_HOME="$JAVA_HOME_DIR"
        }
        agent { label 'dhfLinuxAgent'}
        steps {
           timeout(time: 3,  unit: 'HOURS'){
             catchError(buildResult: 'SUCCESS',catchInterruptions: true, stageResult: 'UNSTABLE') { RTLTests('Release','10.0-9') }
        }}
        post{
           success {
                println("UI Tests Completed")
                script{
                    env.UI_TESTS_PASSED=true
                    def email;
                    if(env.CHANGE_AUTHOR){
                        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                        email=getEmailFromGITUser author
                    }else{
                        email=Email
                    }
                    sendMail email,"<h3>$STAGE_NAME Passed on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'E2E Tests for  $BRANCH_NAME Passed"
                }
          }
          unstable {
             println("$STAGE_NAME Failed")
              sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
              archiveArtifacts artifacts: 'MLLogs/**/*'
              sendMail Email,"<h3>$STAGE_NAME Server on Linux Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>",false,"$BRANCH_NAME on $STAGE_NAME Failed"
          }}
        }}
        post{
           unstable { script{
               if(!params.regressions) error("Pre merge tests Failed");
           }}
        }}

		stage('code-review'){
		 when {
            expression {return isPRMergable()}
            allOf {changeRequest author: '', authorDisplayName: '', authorEmail: '', branch: '', fork: '', id: '', target: 'develop', title: '', url: ''}
  			beforeAgent true
		 }
		 agent {label 'dhmaster'};
		 steps{codeReview()}
		}

		stage('Merge-PR'){
		when {
            expression {return isPRMergable()}
            changeRequest author: '', authorDisplayName: '', authorEmail: '', branch: '', fork: '', id: '', target: 'develop', title: '', url: ''
  			beforeAgent true
		}
		agent {label 'dhmaster'}
        steps{retry(5){mergePR()}}
		post{
                  success {
                    println("Merge Successful")
                    script{
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    def email=getEmailFromGITUser author
					sendMail email,'<h3><a href=${CHANGE_URL}>$BRANCH_NAME</a> is merged </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME is Merged'
					}
                   }
                   failure {
                      println("Retried 5times")
                      script{
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    def email=getEmailFromGITUser author
                    sendMail email,'<h3>Could not rebase and merge the <a href=${CHANGE_URL}>$BRANCH_NAME</a></h3><h3>Please check if there are any conflicts due to rebase and merge and resolve them</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Merging Failed on $BRANCH_NAME'
                      }
                  }
                  }
		}

        stage('publishing'){
         when {expression {return params.regressions}}
         agent { label 'dhfLinuxAgent' }
         steps {
               sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;cp ~/.gradle/gradle.properties $GRADLE_USER_HOME;chmod 777  $GRADLE_USER_HOME/gradle.properties;./gradlew build -x test -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --parallel;./gradlew publish -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --rerun-tasks'
            }
        }



             stage('dhcce-test') {
               when {expression {return params.regressions}}
                 agent { label 'dhfLinuxAgent' }
                 steps{timeout(time: 1,  unit: 'HOURS'){
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE') {invokeDhcceTestJob()}
                 }}
                 post {failure {postStage('Stage Failed')}}
             }


         stage('rh7-singlenode'){
         when { expression {return params.regressions} }
                agent {label 'dhfLinuxAgent'}
                steps{timeout(time: 3,  unit: 'HOURS'){
                   catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE') {
                   singleNodeTestOnLinux('Release','9.0-11')
                    fullCycleSingleNodeTestOnLinux('Release', '9.0-11')
                }}}
                post{
                   success {
                        println("End-End Tests Completed")
                        sendMail Email,'<h3>Tests Passed on Released 9.0 ML Server Single Node </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Single Node | Passed'
                   }
                   unstable {
                            println("End-End Tests Failed")
                            sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
                            archiveArtifacts artifacts: 'MLLogs/**/*'
                            sendMail Email,'<h3>Some Tests Failed on Released 9.0 ML Server Single Node </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Single Node | Failed'
                   }}
        }

		stage('Linux Core Parallel Execution'){
        when { expression {return params.regressions} }
		parallel{
		stage('rh7_cluster_11.0-Nightly'){
			agent { label 'dhfLinuxAgent'}
			steps{
            timeout(time: 6,  unit: 'HOURS'){
                catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("11.0","Latest")}
            }}
			post{
				 always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_11.0-Nightly Tests Completed")
                    sendMail Email,'<h3>Tests Passed on Nigtly 11.0 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-11.0-Nightly | Cluster | Passed'
                    // sh './gradlew publish'
                   }
                   unstable {
                      println("rh7_cluster_11.0-Nightly Tests Failed")
                      sendMail Email,'<h3>Some Tests Failed on Nightly 11.0 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-11.0-Nightly | Cluster | Failed'
                  }
                  }
		}
            stage('rh7_cluster_10.0-Nightly'){
			agent { label 'dhfLinuxAgent'}
			steps{
            timeout(time: 5,  unit: 'HOURS'){
                catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("10.0","Latest")}
            }}
			post{
				 always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_10.0-Nightly Tests Completed")
                    sendMail Email,'<h3>Tests Passed on Nigtly 10.0 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-Nightly | Cluster | Passed'
                    // sh './gradlew publish'
                   }
                   unstable {
                      println("rh7_cluster_10.0-Nightly Tests Failed")
                      sendMail Email,'<h3>Some Tests Failed on Nightly 10.0 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-Nightly | Cluster | Failed'
                  }
                  }
		}
		stage('rh7_cluster_9.0-Nightly'){
			agent { label 'dhfLinuxAgent'}
			steps{
             timeout(time: 4,  unit: 'HOURS'){
              catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("9.0","Latest")}
			}}
			post{
				always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_9.0-Nightly Completed")
                    sendMail Email,'<h3>Tests Passed on Nigtly 9.0 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-Nightly | Cluster | Passed'
                   }
                   unstable {
                      println("rh7_cluster_9.0-Nightly Failed")
                      sendMail Email,'<h3>Some Tests Failed on Nightly 9.0 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-Nightly | Cluster | Failed'
                  }
                  }
		}
        stage('rh7_cluster_9.0-11'){
			agent { label 'dhfLinuxAgent'}
			steps{
             timeout(time: 4,  unit: 'HOURS'){
              catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("9.0-11","Release")}
			}}
			post{
				always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_9.0-11 Tests Completed")
                    sendMail Email,'<h3>Tests Passed on  9.0-11 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Cluster | Passed'
                   }
                   unstable {
                      println("rh7_cluster_9.0-11 Tests Failed")
                  }
                  }
		}
         stage('rh7_cluster_10.0-9'){
             agent { label 'dhfLinuxAgent'}
             steps{
              timeout(time: 4,  unit: 'HOURS'){
               catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("10.0-9","Release")}
             }}
             post{
                 always{
                     sh 'rm -rf $WORKSPACE/xdmp'
                   }
                           success {
                             println("rh7_cluster_10.0-9 Tests Completed")
                             sendMail Email,'<h3>Tests Passed on  10.0-9 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-9 | Cluster | Passed'
                            }
                            unstable {
                               println("rh7_cluster_10.0-9 Tests Failed")
                               sendMail Email,'<h3>Some Tests Failed on 10.0-9 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-9 | Cluster | Failed'
                           }
                           }
             }
             stage('rh7_cluster_10.0-8'){
               agent { label 'dhfLinuxAgent'}
               steps{
                timeout(time: 5,  unit: 'HOURS'){
                 catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("10.0-8.3","Release")}
               }}
               post{
                 always{
                     sh 'rm -rf $WORKSPACE/xdmp'
                   }
                           success {
                             println("rh7_cluster_10.0-8 Tests Completed")
                             sendMail Email,'<h3>Tests Passed on  10.0-8 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-8 | Cluster | Passed'
                            }
                            unstable {
                               println("rh7_cluster_10.0-8 Tests Failed")
                               sendMail Email,'<h3>Some Tests Failed on 10.0-8 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-8 | Cluster | Failed'
                           }
                           }
             }
         stage('rh7_cluster_10.0-7'){
            agent { label 'dhfLinuxAgent'}
            steps{
             timeout(time: 4,  unit: 'HOURS'){
               catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhflinuxTests("10.0-7.3","Release")}
            }}
            post{
                  always{
                      sh 'rm -rf $WORKSPACE/xdmp'
                    }
                            success {
                              println("rh7_cluster_10.0-7 Tests Completed")
                              sendMail Email,'<h3>Tests Passed on  10.0-7 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-7 | Cluster | Passed'
                             }
                             unstable {
                                println("rh7_cluster_10.0-7 Tests Failed")
                                sendMail Email,'<h3>Some Tests Failed on 10.0-7 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-7 | Cluster | Failed'
                            }
                            }
              }
		}
	}

	stage('example projects parallel'){
            when { expression {return params.regressions} }
            parallel{
            stage('dh5-example'){
                agent { label 'dhfLinuxAgent'}
                steps {
                timeout(time: 3,  unit: 'HOURS'){
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dh5Example()}
                }}
                post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                }
                success{
                    sendMail Email,'<h3>dh5example ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'dh5-example on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>dh5example Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'dh5-example on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('dhf-customhook'){
                agent { label 'dhfLinuxAgent'}
                steps{
                 timeout(time: 3,  unit: 'HOURS'){
                    catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhCustomHook()}
                 }}
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>dh5-customhook ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'dh5-customhook on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>dh5-customhook Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'dh5-customhook on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('mapping-example'){
                agent { label 'dhfLinuxAgent'}
                steps{
                 timeout(time: 3,  unit: 'HOURS'){
                   catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){mappingExample()}
                 }}
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>mapping-example ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'mapping-example on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>mapping-example Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'mapping-example on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('smart-mastering-complete'){
                agent { label 'dhfLinuxAgent'}
                steps{
                 timeout(time: 3,  unit: 'HOURS'){
                 catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){smartMastering()}
                }}
                post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>smart-mastering-complete ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'smart-mastering-complete on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>smart-mastering-complete Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'smart-mastering-complete on $BRANCH_NAME Failed'
                 }
                 }
            }
		}
		}
		stage('Windows Core Parallel'){
            when { expression {return params.regressions} }
            parallel{
        		stage('w10_SN_9.0-Nightly'){
        			agent { label 'dhfWinagent'}
        			steps{
                     timeout(time: 4,  unit: 'HOURS'){
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhfWinTests("9.0","Latest")}
                    }}
        			post{
        				always{
        				  	 bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_9.0-nightly Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Nigtly 9.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-Nightly | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_9.0-nightly Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Nightly 9.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-Nightly | Single Node | Failed'
                          }
                          }
        		}
                stage('w10_SN_11.0-Nightly'){
        			agent { label 'dhfWinagent'}
        			steps{
                     timeout(time: 4,  unit: 'HOURS'){
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhfWinTests("11.0","Latest")}
        			}}
        			post{
        				always{
        				  	 bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_11.0-nightly Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Nigtly 10.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-11.0-Nightly | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_11.0-nightly Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Nightly 10.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-11.0-Nightly | Single Node | Failed'
                          }
                          }
        		}
        		stage('w10_SN_9.0-11'){
        			agent { label 'dhfWinagent'}
        			steps{
                    timeout(time: 4,  unit: 'HOURS'){
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){dhfWinTests("9.0-11","Release")}
        			}}
        			post{
        				always{
                               bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_9.0-11 Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Released 9.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-11 | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_9.0-11 Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Released 9.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-11 | Single Node | Failed'
                          }
                          }
        		}
        		stage('w12_cluster_10.0-9'){
        			agent { label 'dhfWinCluster'}
        			steps{
                    timeout(time: 4,  unit: 'HOURS'){
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){winParallel()}
        			}}
        			post{
        				always{
        				  	bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_cluster_10.0-9 Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Released 10.0 ML Server Cluster on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-9 | Cluster | Passed'
                           }
                           unstable {
                              println("w12_cluster_10.0-9 Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Released 10.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-9 | Cluster | Failed'
                          }
                          }
        		}

        		    }
        		}

        stage('HC on Prem parallel'){
            when { expression {return params.regressions} }
            parallel{

                stage('11.0-Nightly-linux-On-Prem'){
                    agent { label 'dhfLinuxAgent'}
                    environment{
                        JAVA_HOME="$JAVA_HOME_DIR"
                        M2_LOCAL_REPO="$WORKSPACE/repository"
                    }
                    steps {
                     timeout(time: 3,  unit: 'HOURS'){
                        catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE') { cypressE2EOnPremLinuxTests("Latest", "11.0") }
                    }}
                    post{
                        success {
                            println("$STAGE_NAME Completed")
                            sendMail Email,"<h3>$STAGE_NAME Server on Linux Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>",false,"$BRANCH_NAME on $STAGE_NAME | Passed"
                        }
                        unstable {
                            cypressE2ePostFailed()
                            }
                    }
                }
                stage('10.0-9-cypress-linux-setup-win-firefox'){
                    agent {label 'dhfLinuxAgent'}
                    steps{
                        script{
                                cypressSetup('Release','10.0-9')
                                mlFFHost=sh(returnStdout: true,script: """echo \$HOSTNAME""")
                                cypressFFBaseUrl="http://"+mlFFHost.trim()+":8080"
                                fFsetupcomplete=true
                                env.fFsetupcomplete=true
                                sleep time: 95, unit: 'MINUTES'
                                timeout(time: 3, unit: 'HOURS') {
                                    waitUntil(initialRecurrencePeriod: 120000) {
                                        return fFtestcomplete
                                    }
                                }
                        }
                    }
                }
                stage('cypress-win-firefox'){
                    agent {label 'w10-dhf-6'}
                    steps{
                        script{
                            timeout(time: 4, unit: 'HOURS'){
                            catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){runFFTests()}
                            }
                        }
                    }
                    post{
                        always {
                            script{
                                fFtestcomplete=true
                            }

                        }
                        unstable {
                            cypressE2ePostFailed()
                        }
                        failure {
                            cypressE2ePostFailed()
                        }
                    }
                }
                stage('10.0-9-cypress-linux-setup-win-chrome'){
                    agent {label 'dhfLinuxAgent'}
                    steps{
                        script{
                                cypressSetup('Release','10.0-9')
                                mlChHost=sh(returnStdout: true,script: """echo \$HOSTNAME""")
                                cypressChBaseUrl="http://"+mlChHost.trim()+":8080"
                                chsetupcomplete=true
                                env.chsetupcomplete=true
                                sleep time: 95, unit: 'MINUTES'
                                timeout(time: 3, unit: 'HOURS') {
                                    waitUntil(initialRecurrencePeriod: 120000) {
                                        return chtestcomplete
                                    }
                                }
                        }
                    }
                }
                stage('10.0-9-cypress-linux-setup-mac-chrome'){
                    agent {label 'dhfLinuxAgent'}
                    steps{
                        script{
                                cypressSetup('Release','10.0-9')
                                mlChMacHost=sh(returnStdout: true,script: """echo \$HOSTNAME""")
                                cypressChMacBaseUrl="http://"+mlChMacHost.trim()+":8080"
                                chMacsetupcomplete=true
                                env.chMacsetupcomplete=true
                                sleep time: 95, unit: 'MINUTES'
                                timeout(time: 3, unit: 'HOURS') {
                                    waitUntil(initialRecurrencePeriod: 120000) {
                                        return chMactestcomplete
                                    }
                                }
                        }
                    }
                }
                stage('cypress-win-chrome'){
                    agent { label 'w10-dhf-5'}
                    environment{
                        JAVA_HOME="C:\\Program Files (x86)\\OpenJDK\\jdk-8.0.262.10-hotspot"
                        M2_LOCAL_REPO="$WORKSPACE/repository"
                        NODE_JS="C:\\Program Files\\nodejs"
                    }

                    steps{
                     timeout(time: 4,  unit: 'HOURS'){
                        catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){cypressE2EOnPremWinChromeTests()}
                    }}
                   post{
                        always {
                            script{
                                                            chtestcomplete=true
                            }
                        }
                        unstable {
                           cypressE2ePostFailed()
                           }
                        failure {
                            cypressE2ePostFailed()
                           }
                   }
                }
                stage('cypress-mac-chrome'){
                    agent { label 'dhfmacchrome'}
                    steps{
                        timeout(time: 4,  unit: 'HOURS'){
                           catchError(buildResult: 'SUCCESS', catchInterruptions: true, stageResult: 'FAILURE'){cypressE2EOnPremMacChromeTests()}
                            }
                        }
                    post{
                        always {
                            script{
                                                            chMactestcomplete=true
                            }
                        }
                        unstable {
                            cypressE2ePostFailed()
                           }
                        failure {
                            cypressE2ePostFailed()
                           }
                   }
                }
            }
        }
    }
}
