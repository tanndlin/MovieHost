pipeline {
    agent any

    environment {
        GITHUB_TOKEN = credentials('GITHUB_TOKEN')
        DOCKER_VOLS = '-v jenkins_jenkins_home:/var/jenkins_home -v cargo-registry-cache:/usr/local/cargo/registry'
        NODE_IMAGE = 'node:20'
        RUST_IMAGE = 'rust:1.92'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh '''
                curl -L \
                -X POST \
                -H "Accept: application/vnd.github+json" \
                -H "Authorization: Bearer $GITHUB_TOKEN" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                https://api.github.com/repos/tanndlin/MovieHost/statuses/$GIT_COMMIT \
                -d '{"state":"pending","description":"Build in progress","context":"Jenkins"}'
                '''
            }
        }

        stage('Install & Build Frontend') {
            steps {
                sh '''
                docker run --rm $DOCKER_VOLS -w $WORKSPACE/frontend $NODE_IMAGE \
                    sh -c "npm ci && npm run build"
                '''
            }
        }

        stage('Lint Frontend') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                    docker run --rm $DOCKER_VOLS -w $WORKSPACE/frontend $NODE_IMAGE \
                        sh -c "npm run lint"
                    '''
                }
            }
        }

        stage('Lint Backend') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                    docker run --rm $DOCKER_VOLS -w $WORKSPACE/server $RUST_IMAGE \
                        sh -c "rustup component add clippy && cargo clippy --all-targets -- -D clippy::pedantic"
                    '''
                }
            }
        }

        stage('Format Frontend') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                    docker run --rm $DOCKER_VOLS -w $WORKSPACE/frontend $NODE_IMAGE \
                        sh -c "npm run format:check"
                    '''
                }
            }
        }

        stage('Format Backend') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh '''
                    docker run --rm $DOCKER_VOLS -w $WORKSPACE/server $RUST_IMAGE \
                        sh -c "rustup component add rustfmt && cargo fmt -- --check"
                    '''
                }
            }
        }

        stage('Build Backend') {
            steps {
                sh '''
                docker run --rm $DOCKER_VOLS -w $WORKSPACE/server $RUST_IMAGE \
                    sh -c "cargo build --release"
                '''
            }
        }

        stage('Test Backend') {
            steps {
                sh '''
                docker run --rm $DOCKER_VOLS -w $WORKSPACE/server $RUST_IMAGE \
                    sh -c "cargo test"
                '''
            }
        }

        // Validates both deployable images still build on master; MovieHost ships
        // via docker-compose rather than standalone binaries, so there's no
        // GitHub release artifact to publish here.
        stage('Build Docker Images') {
            when {
                expression { env.GIT_BRANCH == 'master' || env.GIT_BRANCH == 'origin/master' }
            }
            steps {
                sh '''
                docker build -t moviehost-server:$GIT_COMMIT ./server
                docker build -t moviehost-frontend:$GIT_COMMIT ./frontend
                '''
            }
        }
    }

    post {
        success {
            sh '''
            curl -L \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            https://api.github.com/repos/tanndlin/MovieHost/statuses/$GIT_COMMIT \
            -d '{"state":"success","description":"Build succeeded","context":"Jenkins"}'
            '''
        }
        failure {
            sh '''
            curl -L \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            https://api.github.com/repos/tanndlin/MovieHost/statuses/$GIT_COMMIT \
            -d '{"state":"failure","description":"Build failed","context":"Jenkins"}'
            '''
        }
    }
}
