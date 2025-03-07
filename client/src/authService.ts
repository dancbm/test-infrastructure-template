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
        return Credentials;
    } catch (error) {
        console.error("Error getting AWS credentials", error);
        throw error;
    }
};

export const signRequest = async (url: string, method = "GET") => {
    try {
        const credentials = await fetchAwsCredentials();
        if (!credentials) throw new Error("No credentials");

        const parsedUrl = new URL(url);

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
            protocol: parsedUrl.protocol.replace(":", ""),
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            query: Object.fromEntries(parsedUrl.searchParams),
            method: method,
            headers: {
                "Content-Type": "application/json",
                host: parsedUrl.hostname,
            },
        });

        const signedRequest = await signer.sign(request);

        return {
            url,
            method,
            headers: signedRequest.headers,
        };
    } catch (error) {
        console.error("I hate this: ", error);
        throw error;
    }
};
