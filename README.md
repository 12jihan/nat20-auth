# NAT20 - D&D Campaign Management Service

A serverless application built with AWS Lambda for managing D&D campaigns and user authentication.

## Overview

NAT20 is a serverless application that provides authentication and campaign management functionality for D&D players and Dungeon Masters. Built using AWS Lambda, Cognito, and API Gateway.

## Architecture

- Runtime: Node.js 20.x
- Region: us-east-1
- Memory: 1024MB
- Timeout: 30 seconds

## Features

### Authentication Endpoints
- `POST /users` - Create new user account
- `POST /login` - Sign in user
- `POST /logout` - Sign out user
- `GET /current_user` - Get current active user

### Campaign Endpoints
- `POST /campaigns` - Create new campaign
- `GET /campaigns/{id}` - Get specific campaign
- `GET /campaigns` - Get all DM's campaigns

## Configuration

### Required Environment Variables
```
USER_POOL_ID
USER_POOL_CLIENT_ID
IDENTITY_POOL_ID
verification_method
DB_NAME
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
aws_account_id
```

### IAM Permissions
The service requires the following Cognito permissions:
- cognito-idp:AdminInitiateAuth
- cognito-idp:AdminCreateUser
- cognito-idp:AdminConfirmSignUp
- cognito-idp:AdminSetUserPassword
- cognito-idp:AdminGetUser
- cognito-idp:AdminUpdateUserAttributes

## CORS
All endpoints have CORS enabled with:
- Origin: *
- Max Age: 86400 seconds

## Deployment
The service uses serverless framework for deployment. Deploy using:
```bash
serverless deploy
```

## Package Configuration
- Individual packaging: disabled
- Excludes all files by default except:
  - src directory
  - .env file

## Organization
- Organization: 12jikan
- Service Name: nat20