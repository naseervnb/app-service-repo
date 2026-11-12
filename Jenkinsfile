pipeline {
    agent any

    environment {
        AWS_REGION      = 'us-east-1'
        AWS_ACCOUNT_ID  = '100458165777'
        ECR_REPO        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/enterprise-microservice"
        IMAGE_TAG       = "${env.GIT_COMMIT.substring(0, 7)}-${env.BUILD_NUMBER}"
        GITOPS_REPO     = "github.com/naseervnb/gitops-infra-repo.git"
        SONAR_SCANNER   = tool 'SonarScanner'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Unit Tests & Coverage') {
            steps {
                sh 'npm ci && npm test -- --coverage'
            }
        }

        stage('SonarQube SAST & Quality Gate') {
            steps {
                withSonarQubeEnv('SonarQube-Server') {
                    sh """
                      ${SONAR_SCANNER}/bin/sonar-scanner \
                        -Dsonar.projectKey=enterprise-microservice \
                        -Dsonar.sources=src \
                        -Dsonar.tests=tests \
                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    """
                }
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${ECR_REPO}:${IMAGE_TAG} ."
            }
        }

        stage('Trivy Image Security Scan') {
            steps {
                sh """
                  trivy image \
                    --exit-code 1 \
                    --severity CRITICAL \
                    --no-progress \
                    ${ECR_REPO}:${IMAGE_TAG}
                """
            }
        }

        stage('Push Immutable Image to Amazon ECR') {
            steps {
                sh """
                  aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                  docker push ${ECR_REPO}:${IMAGE_TAG}
                  docker rmi ${ECR_REPO}:${IMAGE_TAG}
                """
            }
        }

        stage('Update GitOps Manifest Repo') {
            steps {
                withCredentials([string(credentialsId: 'gitops-repo-pat', variable: 'GIT_TOKEN')]) {
                    sh """
                      rm -rf gitops-workspace
                      git clone https://${GIT_TOKEN}@${GITOPS_REPO} gitops-workspace
                      cd gitops-workspace
                      sed -i "s|image: .*|image: ${ECR_REPO}:${IMAGE_TAG}|g" k8s/deployment.yaml
                      git config user.email "jenkins-ci@example.com"
                      git config user.name "Jenkins CI Bot"
                      git add k8s/deployment.yaml
                      git commit -m "chore(cd): bump image tag to ${IMAGE_TAG}"
                      git push origin main
                    """
                }
            }
        }
    }
}
