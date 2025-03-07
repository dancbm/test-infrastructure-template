import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AWS_REGION, COGNITO_USER_POOL_APP_CLIENT_ID } from "./env";

export const cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_REGION,
});

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
