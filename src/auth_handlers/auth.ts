import { Amplify, ResourcesConfig } from "aws-amplify";
import { signIn, signUp, SignUpOutput, confirmUserAttribute, confirmSignUp, ConfirmSignUpOutput, deleteUser, SignInInput, SignInOutput } from "aws-amplify/auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import { post } from "aws-amplify/api";
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
  console.log("testing config", get_aws_config());
  Amplify.configure(get_aws_config());
  const _pool = get_db_pool();

  try {
    // Checking the body to see if it exists
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          // "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Content-Type": "application/json"
        },
        message: "Invalid request body"
      };
    };
    // Parse the body for use
    let _user_info = JSON.parse(event['body']);
    console.log("user data:", _user_info);
    // Sign up method
    const sign_up_result: SignUpOutput = await signUp({
      username: _user_info.username,
      password: _user_info.password,
      options: {
        userAttributes: {
          email: _user_info.email,
          phone_number: _user_info.phone_number ? _user_info.phone_number : '',
        },
        autoSignIn: true
      },
    });

    if (!sign_up_result.isSignUpComplete) {
      await deleteUser();
      throw new Error("There was a problem with adding user to the database.");
    }

    const user_data: User = {
      id: sign_up_result['userId']!,
      username: _user_info['username'],
      first_name: _user_info['first_name'],
      last_name: _user_info['first_name'],
      email: _user_info['email'],
      phone_number: _user_info['phone_number']
    };
    await add_user_to_db(_pool, user_data);

    // Return 200 if the user is working properly
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
    // When all's said and done it will end the db pool
    await _pool.end();
  }
};

export const confirm_user = (event) => {
  // Confirm the user
  event.response.autoConfirmUser = true;
  // Set the email as verified if it is in the request
  if (Object.hasOwn(event.request.userAttributes, "email")) {
    event.response.autoVerifyEmail = true;
  }

  // Set the phone number as verified if it is in the request
  if (Object.hasOwn(event.request.userAttributes, "phone_number")) {
    event.response.autoVerifyPhone = true;
  }

  console.log("confirm_user", event);
  return event;
};

export const signin_user = async (event) => {

  // console.log("testing config", process.env.TEST);
  console.log("testing config", get_aws_config());
  Amplify.configure(get_aws_config());
  const user_info: any = JSON.parse(event.body);
  console.log("signin_user", event.body);
  console.log("identity pool:", identity_pool_id);

  try {
    console.log("signin_user running", user_info);
    const _signin: SignInOutput = await signIn({
      username: user_info.username,
      password: user_info.password,
    });

    if (_signin.isSignedIn) {
      console.log("from sign in output:", _signin);
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "User signed in successfully"
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
    console.log("this error test: ", error);
    return {
      statusCode: 500,
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
};