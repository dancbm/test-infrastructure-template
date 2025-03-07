import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { HttpRequest } from "@aws-sdk/protocol-http";
import {
    CognitoIdentityClient,
    GetCredentialsForIdentityCommand,
    GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import {
    AWS_REGION,
    COGNITO_IDENTITY_POOL_ID,
    COGNITO_USER_POOL_ID,
    COGNITO_USER_POOL_APP_CLIENT_ID,
} from "./env";
import { Sha256 } from "@aws-crypto/sha256-js";

export const cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_REGION,
});

const cognitoIdentityClient = new CognitoIdentityClient({ region: AWS_REGION });

export const signIn = async (username: string, password: string) => {
    const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_USER_POOL_APP_CLIENT_ID,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    };
    try {
        const command = new InitiateAuthCommand(params);
        const { AuthenticationResult } = await cognitoClient.send(command);

        if (AuthenticationResult) {
            console.log("DANTEST", AuthenticationResult);
            sessionStorage.setItem(
                "idToken",
                AuthenticationResult.IdToken || ""
            );
            sessionStorage.setItem(
                "accessToken",
                AuthenticationResult.AccessToken || ""
            );
            sessionStorage.setItem(
                "refreshToken",
                AuthenticationResult.RefreshToken || ""
            );
            return AuthenticationResult;
        }
    } catch (error) {
        console.error("Error signing in: ", error);
        throw error;
    }
};

export const fetchAwsCredentials = async () => {
    const idToken = sessionStorage.getItem("idToken");

    if (!idToken) {
        throw new Error("ID token is not available");
    }

    try {
        const getIdCommand = new GetIdCommand({
            IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
            Logins: {
                [`cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]:
                idToken,
            },
        });

        const { IdentityId } = await cognitoIdentityClient.send(getIdCommand);
        console.log("DANTEST3", IdentityId);

        const getCredentialsCommand = new GetCredentialsForIdentityCommand({
            IdentityId,
            Logins: {
                [`cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]:
                idToken,
            },
        });

        const { Credentials } = await cognitoIdentityClient.send(
            getCredentialsCommand
        );
        console.log("DANTEST4", Credentials);
        return Credentials;
    } catch (error) {
        console.error("Error getting AWS credentials", error);
        throw error;
    }
};

export const signRequest = async (url: string, method = "GET") => {
    const credentials = await fetchAwsCredentials();

    if (!credentials) throw new Error("No credentials");

    // console.log("DANTEST", credentials);

    const signer = new SignatureV4({
        credentials: {
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretKey,
            sessionToken: credentials.SessionToken,
        },
        region: AWS_REGION,
        service: "lambda",
        sha256: Sha256,
    });

    const request = new HttpRequest({
        protocol: "https",
        hostname: new URL(url).hostname,
        path: new URL(url).pathname,
        method: method,
        headers: {
            "Content-Type": "application/json",
            "X-Amz-Date": new Date().toISOString(),
        },
    });

    await signer.sign(request);

    return {
        url,
        method,
        headers: request.headers,
        body: JSON.stringify({
            /* your request payload if POST */
        }),
    };
};

// src/services/auth.ts
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession
} from 'amazon-cognito-identity-js';
import AWS from 'aws-sdk';
import { awsConfig } from '../config/aws-config';

// Initialize the Cognito User Pool
const userPool = new CognitoUserPool({
    UserPoolId: awsConfig.userPoolId,
    ClientId: awsConfig.userPoolWebClientId
});

// Configure AWS region
AWS.config.region = awsConfig.region;

/**
 * Type definition for sign-in parameters
 */
export interface SignInParams {
    email: string;
    password: string;
}

/**
 * AWS Credentials interface
 */
export interface AwsCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration?: Date;
}

/**
 * Get AWS temporary credentials using Cognito Identity Pool
 */
export const getAwsCredentials = async (idToken: string): Promise<AwsCredentials> => {
    // Configure credentials provider with Cognito Identity Pool
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsConfig.identityPoolId,
        Logins: {
            [`cognito-idp.${awsConfig.region}.amazonaws.com/${awsConfig.userPoolId}`]: idToken
        }
    });

    // Refresh credentials
    return new Promise((resolve, reject) => {
        (AWS.config.credentials as AWS.CognitoIdentityCredentials).refresh((error) => {
            if (error) {
                console.error('Error refreshing AWS credentials:', error);
                reject(error);
            } else {
                const credentials = AWS.config.credentials as AWS.CognitoIdentityCredentials;
                resolve({
                    accessKeyId: credentials.accessKeyId,
                    secretAccessKey: credentials.secretAccessKey,
                    sessionToken: credentials.sessionToken,
                    expiration: credentials.expireTime
                });
            }
        });
    });
};

/**
 * Sign in a user
 */
export const signIn = async (params: SignInParams): Promise<CognitoUserSession> => {
    const { email, password } = params;

    return new Promise((resolve, reject) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: email,
            Password: password
        });

        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool
        });

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: async (session) => {
                try {
                    // Get AWS credentials after successful login
                    const idToken = session.getIdToken().getJwtToken();
                    const credentials = await getAwsCredentials(idToken);

                    // Configure AWS SDK with the new credentials
                    AWS.config.credentials = new AWS.Credentials({
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        sessionToken: credentials.sessionToken
                    });

                    resolve(session);
                } catch (error) {
                    console.error('Error getting AWS credentials:', error);
                    reject(error);
                }
            },
            onFailure: (err) => {
                reject(err);
            }
        });
    });
};

/**
 * Sign out the current user
 */
export const signOut = (): void => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();

        // Clear AWS credentials
        AWS.config.credentials = null;
    }
};

/**
 * Get the current session
 */
export const getCurrentSession = (): Promise<CognitoUserSession> => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err) {
                reject(err);
                return;
            }

            if (!session) {
                reject(new Error('No valid session'));
                return;
            }

            resolve(session);
        });
    });
};

/**
 * Get ID token for the current user
 */
export const getIdToken = async (): Promise<string> => {
    try {
        const session = await getCurrentSession();
        return session.getIdToken().getJwtToken();
    } catch (error) {
        console.error('Error getting ID token:', error);
        throw new Error('Not authenticated');
    }
};

/**
 * Get SigV4 signed request headers
 * Used for AWS_IAM authenticated Lambda function URLs
 */
export const getSignedHeaders = async (
    url: string,
    method: string = 'GET',
    body: string | null = null
): Promise<Record<string, string>> => {
    // Ensure we have credentials
    if (!AWS.config.credentials) {
        try {
            const session = await getCurrentSession();
            const idToken = session.getIdToken().getJwtToken();
            await getAwsCredentials(idToken);
        } catch (error) {
            console.error('Error getting AWS credentials:', error);
            throw new Error('Not authenticated');
        }
    }

    // Parse the URL to get host and path
    const parsedUrl = new URL(url);

    // Create a request signer
    const signer = new AWS.Signers.V4({
        service: 'lambda',
        region: awsConfig.region,
        credentials: AWS.config.credentials,
        headers: {
            'Host': parsedUrl.host,
            'Content-Type': 'application/json'
        },
        body: body || '',
        method: method,
        path: parsedUrl.pathname + parsedUrl.search
    });

    // Sign the request and return the headers
    const signedRequest = signer.addAuthorization();
    return signedRequest.headers;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            resolve(false);
            return;
        }

        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                resolve(false);
                return;
            }

            resolve(session.isValid());
        });
    });
};
