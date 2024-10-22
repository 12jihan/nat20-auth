import { Amplify, ResourcesConfig } from "aws-amplify";
import { signIn, signUp, SignUpOutput, confirmUserAttribute, confirmSignUp, ConfirmSignUpOutput } from "aws-amplify/auth";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

// Interfaces for further custom configuration
interface SignUpBody {
  username: string;
  password: string;
  email: string;
  phone_number: string;
};

interface User {
  username: string;
  password?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
};

// Setting up the postgres database
const _pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Setting up the lambda
const user_pool_id: string = process.env.USER_POOL_ID!;
const user_pool_client_id: string = process.env.USER_POOL_CLIENT_ID!;
const aws_config: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: user_pool_id,
      userPoolClientId: user_pool_client_id,
      signUpVerificationMethod: 'code',
    },
  },
};
Amplify.configure(aws_config);

let _user_info: any;


export const create_account = async (event) => {
  try {
    // Checking to make sure that the body is valid
    console.log("body:\n", event.body);

    if (!event.body) {
      // Checking the body to see why it's failed
      console.log("failed body:\n", event.body);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid request body"
        })
      };
    };

    // Parse the body for use
    _user_info = JSON.parse(event['body'])['user_info'];
    // Sign up method
    const user: SignUpOutput = await signUp({
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

    console.log("user signup method return:", user);

    // Return 200 if the user is working properly
    return {
      statusCode: 200,
      body: JSON.parse(event['body'])['user_info']
    }
  } catch (error) {
    console.log("error message:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during sign-up process'
      })
    };
  }
};

export const confirm_user = async (event) => {
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

  return event;
};

async function add_user(user_data: User) {
  const _user = user_data;
  const _client = await _pool.connect();

  try {
    await _client.query("BEGIN");
    const _query = "INSERT INTO users() VALUES($1, $2, $3) RETURNING id";
    const _values = [
      _user.email,
      _user.first_name,
      _user.last_name,
      _user.phone_number,
      _user.username
    ];
    const _res = await _client.query(_query, _values);
    await _client.query("COMMIT");

    return {
      success: true,
      message: "User added successfully",
      user_id: _res.rows[0].id
    }
  } catch (error) {
    await _client.query("ROLLBACK");
    if (error.code === '23505') {
      return {
        success: false,
        message: "An error occurred while adding the user"
      };
    }
  } finally {
    _client.release();
  }
}

0