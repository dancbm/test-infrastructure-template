import AWS from "aws-sdk";
import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { HttpRequest } from "@aws-sdk/protocol-http";
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession,
} from "amazon-cognito-identity-js";

import {
    AWS_REGION,
    COGNITO_IDENTITY_POOL_ID,
    COGNITO_USER_POOL_ID,
    COGNITO_USER_POOL_APP_CLIENT_ID,
} from "./env";

// Initialize the Cognito User Pool
const userPool = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_USER_POOL_APP_CLIENT_ID,
});

// Configure AWS region
AWS.config.region = AWS_REGION;

/**
 * Type definition for sign-in parameters
 */
export interface SignInParams {
    username: string;
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
export const getAwsCredentials = async (
    idToken: string
): Promise<AwsCredentials> => {
    // Configure credentials provider with Cognito Identity Pool
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
        Logins: {
            [`cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]:
                idToken,
        },
    });

    // Refresh credentials
    return new Promise((resolve, reject) => {
        (AWS.config.credentials as AWS.CognitoIdentityCredentials).refresh(
            (error) => {
                if (error) {
                    console.error("Error refreshing AWS credentials:", error);
                    reject(error);
                } else {
                    const credentials = AWS.config
                        .credentials as AWS.CognitoIdentityCredentials;
                    resolve({
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        sessionToken: credentials.sessionToken,
                        expiration: credentials.expireTime,
                    });
                }
            }
        );
    });
};

/**
 * Sign in a user
 */
export const signIn = async (
    params: SignInParams
): Promise<CognitoUserSession> => {
    const { username, password } = params;

    return new Promise((resolve, reject) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: username,
            Password: password,
        });

        const cognitoUser = new CognitoUser({
            Username: username,
            Pool: userPool,
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
                        sessionToken: credentials.sessionToken,
                    });

                    resolve(session);
                } catch (error) {
                    console.error("Error getting AWS credentials:", error);
                    reject(error);
                }
            },
            onFailure: (err) => {
                reject(err);
            },
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
            reject(new Error("No user found"));
            return;
        }

        cognitoUser.getSession(
            (err: Error | null, session: CognitoUserSession | null) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!session) {
                    reject(new Error("No valid session"));
                    return;
                }

                resolve(session);
            }
        );
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
        console.error("Error getting ID token:", error);
        throw new Error("Not authenticated");
    }
};

/**
 * Get SigV4 signed request headers
 * Used for AWS_IAM authenticated Lambda function URLs
 */
export const signRequest = async (
    url: string,
    method: string = "GET",
    body: string | null = null
): Promise<Record<string, string>> => {
    try {
        // Ensure credentials are available
        if (!AWS.config.credentials) {
            const session = await getCurrentSession();
            const idToken = session.getIdToken().getJwtToken();
            await getAwsCredentials(idToken);
        }

        // Extract credentials from AWS.config
        const credentials = {
            accessKeyId: AWS.config.credentials?.accessKeyId ?? "",
            secretAccessKey: AWS.config.credentials?.secretAccessKey ?? "",
            sessionToken: AWS.config.credentials?.sessionToken,
        };

        if (!credentials.accessKeyId || !credentials.secretAccessKey) {
            throw new Error("Missing AWS credentials");
        }

        // 🔹 Check the AWS Identity using STS
        // const stsClient = new STSClient({ region: AWS_REGION, credentials });
        // const identity = await stsClient.send(new GetCallerIdentityCommand({}));
        // console.log("DANTEST - AWS Identity: ", identity);

        // Parse the URL to get host and path
        const parsedUrl = new URL(url);

        const request = new HttpRequest({
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                host: parsedUrl.hostname,
                "Content-Type": "application/json",
            },
            body: body || undefined,
        });

        // Create a request signer
        const signer = new SignatureV4({
            credentials,
            region: AWS_REGION,
            service: "lambda",
            sha256: Sha256,
        });

        // Sign the request and return the headers
        const signedRequest = await signer.sign(request);
        return signedRequest.headers;
    } catch (error) {
        console.error("Signing error:", error);
        throw error;
    }
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

        cognitoUser.getSession(
            (err: Error | null, session: CognitoUserSession | null) => {
                if (err || !session) {
                    resolve(false);
                    return;
                }

                resolve(session.isValid());
            }
        );
    });
};
