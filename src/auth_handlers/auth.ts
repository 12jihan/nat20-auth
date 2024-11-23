import { Amplify, ResourcesConfig } from "aws-amplify";
import { signIn, signUp, SignUpOutput, confirmUserAttribute, confirmSignUp, ConfirmSignUpOutput, deleteUser, SignInInput, SignInOutput, getCurrentUser, GetCurrentUserOutput, fetchUserAttributes, FetchUserAttributesOutput, signOut, SignOutInput, AuthSession, fetchAuthSession } from "aws-amplify/auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import { post } from "aws-amplify/api";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { AdminConfirmSignUpCommand, AdminCreateUserCommand, AdminInitiateAuthCommand, AdminInitiateAuthCommandOutput, AdminSetUserPasswordCommand, AuthFlowType, CognitoIdentityProviderClient, GlobalSignOutCommand, GlobalSignOutCommandOutput, RevokeTokenCommand, RevokeTokenCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
dotenv.config();

// Interfaces for further custom configuration
interface SignUpBody {
  username: string;
  password: string;
  email: string;
  phone_number: string;
};
/** 
 * Password minimum length
 * 8 character(s)
 * Password requirements
 * Contains at least 1 number
 * Contains at least 1 special character
 * Contains at least 1 uppercase letter
 * Contains at least 1 lowercase letter
 */

interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
};

// Setting up the lambda
const user_pool_id: string = process.env.USER_POOL_ID!;
const user_pool_client_id: string = process.env.USER_POOL_CLIENT_ID!;
const identity_pool_id: string = process.env.IDENTITY_POOL_ID!;
const get_aws_config = (): ResourcesConfig => ({
  Auth: {
    Cognito: {
      userPoolId: user_pool_id,
      userPoolClientId: user_pool_client_id,
      identityPoolId: identity_pool_id,
      signUpVerificationMethod: 'code',
    },
  },
});

const get_db_pool = () => new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false
  }
});


export const create_account = async (event) => {
  const client = new CognitoIdentityProviderClient({});
  const _user_info = JSON.parse(event['body']);
  const _pool = get_db_pool();

  try {
    const _command = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: _user_info.username,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        {
          Name: 'email',
          Value: _user_info.email
        },
        {
          Name: 'phone_number',
          Value: _user_info.phone_number
        }
      ]
    });
    const response = await client.send(_command);
    let user_id;
    if (response.User) {
      user_id = response.User?.Attributes?.find(value => value.Name == "sub");
      user_id = user_id['Value'];
    }

    const set_pw_command = new AdminSetUserPasswordCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: _user_info.username,
      Password: _user_info.password,
      Permanent: true
    });
    const set_pw_client_send = await client.send(set_pw_command);

    // Not needed because permanent password confirms the user already
    // const confirm_command = new AdminConfirmSignUpCommand({
    //   UserPoolId: process.env.USER_POOL_ID,
    //   Username: _user_info.username
    // });
    // const confirm_client_send = await client.send(confirm_command);
    // console.log("confirm client", confirm_client_send);

    const user_data: User = {
      id: user_id,
      username: _user_info['username'],
      first_name: _user_info['first_name'],
      last_name: _user_info['first_name'],
      email: _user_info['email'],
      phone_number: _user_info['phone_number']
    };
    await add_user_to_db(_pool, user_data);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user_data)
    };
  } catch (error) {
    console.error("Error in create_account:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: 'Error during sign-up process',
        error: error.message
      })
    };
  } finally {
    await _pool.end();
  }
}

export const signin_user = async (event) => {
  const client: CognitoIdentityProviderClient = new CognitoIdentityProviderClient({});
  const user_info: any = JSON.parse(event.body);

  try {
    const command: AdminInitiateAuthCommand = new AdminInitiateAuthCommand({
      AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
      ClientId: process.env.USER_POOL_CLIENT_ID,
      UserPoolId: process.env.USER_POOL_ID,
      AuthParameters: {
        USERNAME: user_info.username,
        PASSWORD: user_info.password
      }
    });

    const _response: AdminInitiateAuthCommandOutput = await client.send(command);

    if (_response.AuthenticationResult) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: 200,
          message: "success",
          token: _response.AuthenticationResult
        })
      };
    }

    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "User was unable to signin. Please try again."
      })
    };
  } catch (error) {
    console.log("error message:\n", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: error.message
      })
    };
  }
}

export const signout_user = async (event) => {
  const body: any = JSON.parse(event.body);
  const headers: any = event.headers;

  let client: RevokeTokenCommandOutput | GlobalSignOutCommandOutput | undefined;

  try {
    switch (body.method) {
      case "basic":
        client = await basic_signout(headers.Authorization);
        break;

      case "global":
        client = await global_signout(headers.Authorization);
        break;

      default:
        throw new Error("Unable to sign-out, Please Refresh the page.");
    }


    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "success",
        data: client
      })
    };

  } catch (error) {
    console.log("sign-out unsuccessful: ", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "failure",
        error: error
      })
    };
  };
}

export const get_current_user = async (event) => {

  try {
    const _session: AuthSession = await fetchAuthSession();
    const _current_user: GetCurrentUserOutput = await getCurrentUser();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Current user captured.",
        data: _current_user
      })
    };
  } catch (error) {
    console.error("There was an error getting the current user:", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Was unable to get current user.",
        error: error
      })
    };
  }
}

async function add_user_to_db(pool: Pool, user_data: User) {
  // Setting up the postgres database
  const pool_obj = pool;
  const client = await pool_obj.connect();

  try {
    const _query = `INSERT INTO Nat20.users (
      id,
      username,
      first_name,
      last_name,
      email,
      phone_number,
      date_created,
      date_modified
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`;

    const timestamp = new Date().toISOString();
    const _values = [
      user_data.id,
      user_data.username,
      user_data.first_name,
      user_data.last_name,
      user_data.email,
      user_data.phone_number,
      timestamp
    ];

    const _res = await client.query(_query, _values);
    return _res['rows'][0];

  } catch (error) {
    console.error("Database error:", error);
    if (error.code === '23505') {
      throw new Error("Database error when adding user");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function basic_signout(token: string): Promise<RevokeTokenCommandOutput> {
  const client: CognitoIdentityProviderClient = new CognitoIdentityProviderClient({});
  const command: RevokeTokenCommand = new RevokeTokenCommand({
    ClientId: process.env.USER_POOL_CLIENT_ID,
    Token: token
  });

  return await client.send(command);
}

async function global_signout(token: string): Promise<GlobalSignOutCommandOutput> {
  const client: CognitoIdentityProviderClient = new CognitoIdentityProviderClient({});
  const command: GlobalSignOutCommand = new GlobalSignOutCommand({
    AccessToken: token
  });

  return await client.send(command);
}